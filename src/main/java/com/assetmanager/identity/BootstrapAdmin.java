package com.assetmanager.identity;

import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "ams.bootstrap.enabled", havingValue = "true")
public class BootstrapAdmin implements CommandLineRunner {
  private final JdbcTemplate db;
  private final PasswordEncoder encoder;
  private final String email, password, organization;

  public BootstrapAdmin(
      JdbcTemplate db,
      PasswordEncoder encoder,
      @Value("${BOOTSTRAP_EMAIL:}") String email,
      @Value("${BOOTSTRAP_PASSWORD:}") String password,
      @Value("${BOOTSTRAP_ORGANIZATION:}") String organization) {
    this.db = db;
    this.encoder = encoder;
    this.email = email;
    this.password = password;
    this.organization = organization;
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (!email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")
        || password.length() < 12
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
        || organization.isBlank())
      throw new IllegalStateException(
          "Configura BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD (12 caracteres, máximo 72 bytes) y"
              + " BOOTSTRAP_ORGANIZATION");
    db.execute("select pg_advisory_xact_lock(1091294002)");
    if (db.queryForObject("select count(*) from app_users", Long.class) > 0)
      throw new IllegalStateException(
          "El aprovisionamiento inicial solo puede ejecutarse en una base sin usuarios");
    UUID org = UUID.randomUUID(), user = UUID.randomUUID();
    db.update("insert into organizations(id,name) values(?,?)", org, organization);
    db.update(
        "insert into app_users(id,email,password_hash,full_name,system_admin) values(?,?,?,?,true)",
        user,
        email.trim().toLowerCase(Locale.ROOT),
        encoder.encode(password),
        "Administrador del sistema");
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role)"
            + " values(?,?,?,'ORG_ADMIN')",
        UUID.randomUUID(),
        org,
        user);
  }
}
