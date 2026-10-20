package com.assetmanager.organization;

import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations")
public class OrganizationController {
  private final JdbcTemplate db;
  private final AccessService access;
  private final PasswordEncoder passwords;

  public OrganizationController(JdbcTemplate db, AccessService access, PasswordEncoder passwords) {
    this.db = db;
    this.access = access;
    this.passwords = passwords;
  }

  public record OrganizationInput(
      @NotBlank @Size(max = 160) String name,
      @Size(max = 200) String legalName,
      @Size(max = 60) String taxId) {}

  public record UserInput(
      @NotBlank @Email @Size(max = 200) String email,
      @NotBlank @Size(max = 160) String fullName,
      @Size(max = 72) String password,
      @NotBlank @Pattern(regexp = "ORG_ADMIN|ASSET_MANAGER|VIEWER") String role) {
    @Override
    public String toString() {
      return "UserInput[credentials=REDACTED]";
    }
  }

  @GetMapping
  public List<Map<String, Object>> list() {
    return access.organizations();
  }

  @GetMapping("/{org}")
  public Map<String, Object> get(@PathVariable UUID org) {
    access.role(org);
    return db.queryForMap(
        "select id,name,legal_name,tax_id,active,created_at,theme_key,branding_version from"
            + " organizations where id=?",
        org);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> create(@Valid @RequestBody OrganizationInput in) {
    if (!access.systemAdmin())
      throw new ApiException(HttpStatus.FORBIDDEN, "Se requiere administración del sistema");
    UUID id = UUID.randomUUID();
    db.update(
        "insert into organizations(id,name,legal_name,tax_id) values(?,?,?,?)",
        id,
        in.name(),
        in.legalName(),
        in.taxId());
    db.queryForObject("select seed_organization_categories(?)", Object.class, id);
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role)"
            + " values(?,?,?,'ORG_ADMIN')",
        UUID.randomUUID(),
        id,
        access.userId());
    return get(id);
  }

  @PutMapping("/{org}")
  public Map<String, Object> update(
      @PathVariable UUID org, @Valid @RequestBody OrganizationInput in) {
    access.admin(org);
    db.update(
        "update organizations set name=?,legal_name=?,tax_id=? where id=?",
        in.name(),
        in.legalName(),
        in.taxId(),
        org);
    return get(org);
  }

  @GetMapping("/{org}/users")
  public List<Map<String, Object>> users(@PathVariable UUID org) {
    access.admin(org);
    return db.queryForList(
        "select u.id,u.email,u.full_name,u.active,m.role from app_users u join"
            + " organization_memberships m on m.user_id=u.id where m.organization_id=?",
        org);
  }

  @PostMapping("/{org}/users")
  @ResponseStatus(HttpStatus.CREATED)
  @Transactional
  public Map<String, Object> addUser(@PathVariable UUID org, @Valid @RequestBody UserInput in) {
    access.admin(org);
    String email = in.email().trim().toLowerCase(Locale.ROOT);
    var rows = db.queryForList("select id from app_users where email=?", email);
    UUID id;
    if (rows.isEmpty()) {
      if (in.password() == null
          || in.password().length() < 12
          || in.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
        throw ApiException.invalid(
            "La contraseña requiere al menos 12 caracteres y un máximo de 72 bytes");
      id = UUID.randomUUID();
      db.update(
          "insert into app_users(id,email,password_hash,full_name) values(?,?,?,?)",
          id,
          email,
          passwords.encode(in.password()),
          in.fullName());
    } else id = (UUID) rows.getFirst().get("id");
    // An organization administrator cannot grant themselves a new role through this endpoint.
    if (id.equals(access.userId()) && !in.role().equals("ORG_ADMIN"))
      throw ApiException.invalid("No puedes quitarte tu propio permiso de administración");
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role) values(?,?,?,?) on"
            + " conflict(organization_id,user_id) do update set role=excluded.role",
        UUID.randomUUID(),
        org,
        id,
        in.role());
    return Map.of("id", id, "email", email, "role", in.role());
  }
}
