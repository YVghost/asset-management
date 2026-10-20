package com.assetmanager.identity;

import com.assetmanager.shared.ApiException;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemAdminService {
  private final JdbcTemplate db;
  private final AccessService access;
  private final PasswordEncoder passwords;

  public SystemAdminService(JdbcTemplate db, AccessService access, PasswordEncoder passwords) {
    this.db = db;
    this.access = access;
    this.passwords = passwords;
  }

  public record OrganizationInput(
      @NotBlank @Size(max = 160) String name,
      @Size(max = 200) String legalName,
      @Size(max = 60) String taxId,
      @NotNull Boolean active) {}

  public record UserInput(
      @NotBlank @Email @Size(max = 200) String email,
      @NotBlank @Size(max = 160) String fullName,
      @Size(max = 72) String password,
      @NotNull Boolean active,
      @NotNull Boolean systemAdmin) {
    @Override
    public String toString() {
      return "SystemUserInput[credentials=REDACTED]";
    }
  }

  public Map<String, Object> organizations(String search, int page, int size) {
    access.master();
    page = Math.max(0, page);
    size = Math.min(100, Math.max(1, size));
    String term = "%" + search + "%";
    return Map.of(
        "content",
        db.queryForList(
            "select"
                + " o.id,o.name,o.legal_name,o.tax_id,o.active,o.created_at,o.theme_key,o.branding_version,(select"
                + " count(*) from organization_memberships m where m.organization_id=o.id)"
                + " user_count,(select count(*) from assets a where a.organization_id=o.id)"
                + " asset_count from organizations o where name ilike ? order by name,id limit ?"
                + " offset ?",
            term,
            size,
            page * size),
        "totalElements",
        db.queryForObject(
            "select count(*) from organizations where name ilike ?", Long.class, term));
  }

  @Transactional
  public Map<String, Object> organization(UUID id, OrganizationInput in) {
    access.master();
    if (id == null) {
      id = UUID.randomUUID();
      db.update(
          "insert into organizations(id,name,legal_name,tax_id,active) values(?,?,?,?,?)",
          id,
          in.name(),
          in.legalName(),
          in.taxId(),
          in.active());
    } else if (db.update(
            "update organizations set name=?,legal_name=?,tax_id=?,active=? where id=?",
            in.name(),
            in.legalName(),
            in.taxId(),
            in.active(),
            id)
        == 0) throw ApiException.missing();
    return db.queryForMap(
        "select id,name,legal_name,tax_id,active,created_at,theme_key,branding_version from"
            + " organizations where id=?",
        id);
  }

  public Map<String, Object> users(String search, int page, int size) {
    access.master();
    page = Math.max(0, page);
    size = Math.min(100, Math.max(1, size));
    String term = "%" + search + "%";
    var rows =
        db.queryForList(
            "select id,email,full_name,active,system_admin from app_users where email ilike ? or"
                + " full_name ilike ? order by full_name,id limit ? offset ?",
            term,
            term,
            size,
            page * size);
    rows.forEach(
        row ->
            row.put(
                "memberships",
                db.queryForList(
                    "select m.organization_id,o.name,m.role from organization_memberships m join"
                        + " organizations o on o.id=m.organization_id where m.user_id=? order by"
                        + " o.name",
                    row.get("id"))));
    return Map.of(
        "content",
        rows,
        "totalElements",
        db.queryForObject(
            "select count(*) from app_users where email ilike ? or full_name ilike ?",
            Long.class,
            term,
            term));
  }

  @Transactional
  public Map<String, Object> user(UUID id, UserInput in) {
    access.master();
    db.execute("select pg_advisory_xact_lock(1091294004)");
    String email = in.email().trim().toLowerCase(Locale.ROOT);
    if (id != null && id.equals(access.userId()) && (!in.active() || !in.systemAdmin()))
      throw ApiException.invalid(
          "No puedes desactivar ni quitar el permiso maestro a tu propia cuenta");
    boolean changePassword = in.password() != null && !in.password().isBlank();
    if ((id == null || changePassword)
        && (in.password() == null
            || in.password().length() < 12
            || in.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72))
      throw ApiException.invalid("La contraseña requiere mínimo 12 caracteres y máximo 72 bytes");
    if (id != null) {
      var old =
          db.queryForList("select system_admin,active from app_users where id=? for update", id);
      if (old.isEmpty()) throw ApiException.missing();
      if (Boolean.TRUE.equals(old.getFirst().get("system_admin"))
          && Boolean.TRUE.equals(old.getFirst().get("active"))
          && (!in.active() || !in.systemAdmin())
          && db.queryForObject(
                  "select count(*) from app_users where system_admin=true and active=true",
                  Long.class)
              <= 1)
        throw ApiException.conflict("Debe existir al menos un administrador maestro activo");
      // Keep session principals valid: account email is immutable after creation.
      if (!db.queryForObject("select email from app_users where id=?", String.class, id)
          .equals(email))
        throw ApiException.invalid("El correo de una cuenta existente no se puede cambiar");
      db.update(
          "update app_users set full_name=?,active=?,system_admin=? where id=?",
          in.fullName(),
          in.active(),
          in.systemAdmin(),
          id);
      if (changePassword)
        db.update(
            "update app_users set password_hash=? where id=?", passwords.encode(in.password()), id);
    } else {
      id = UUID.randomUUID();
      db.update(
          "insert into app_users(id,email,password_hash,full_name,active,system_admin)"
              + " values(?,?,?,?,?,?)",
          id,
          email,
          passwords.encode(in.password()),
          in.fullName(),
          in.active(),
          in.systemAdmin());
    }
    return db.queryForMap(
        "select id,email,full_name,active,system_admin from app_users where id=?", id);
  }

  public record MembershipInput(
      @NotNull UUID organizationId,
      @NotBlank @Pattern(regexp = "ORG_ADMIN|ASSET_MANAGER|VIEWER") String role) {}

  public List<Map<String, Object>> memberships(UUID user) {
    access.master();
    return db.queryForList(
        "select m.organization_id,o.name,m.role from organization_memberships m join organizations"
            + " o on o.id=m.organization_id where m.user_id=? order by o.name",
        user);
  }

  @Transactional
  public void membership(UUID user, MembershipInput in) {
    access.master();
    if (db.queryForObject("select count(*) from app_users where id=?", Long.class, user) == 0
        || db.queryForObject(
                "select count(*) from organizations where id=?", Long.class, in.organizationId())
            == 0) throw ApiException.missing();
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role) values(?,?,?,?) on"
            + " conflict(organization_id,user_id) do update set role=excluded.role",
        UUID.randomUUID(),
        in.organizationId(),
        user,
        in.role());
  }

  @Transactional
  public void revoke(UUID user, UUID org) {
    access.master();
    if (db.update(
            "delete from organization_memberships where organization_id=? and user_id=?", org, user)
        == 0) throw ApiException.missing();
  }
}
