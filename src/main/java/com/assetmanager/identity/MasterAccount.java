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
@ConditionalOnProperty(name = "ams.master.enabled", havingValue = "true")
public class MasterAccount implements CommandLineRunner {
  private final JdbcTemplate db;
  private final PasswordEncoder passwords;
  private final String email, password;

  public MasterAccount(
      JdbcTemplate db,
      PasswordEncoder passwords,
      @Value("${MASTER_EMAIL:master@ams.local}") String email,
      @Value("${MASTER_PASSWORD:}") String password) {
    this.db = db;
    this.passwords = passwords;
    this.email = email;
    this.password = password;
  }

  @Override
  @Transactional
  public void run(String... args) {
    db.execute("select pg_advisory_xact_lock(1091294003)");
    String normalized = email.trim().toLowerCase(Locale.ROOT);
    var rows =
        db.queryForList("select system_admin,active from app_users where email=?", normalized);
    if (!rows.isEmpty()) {
      if (!Boolean.TRUE.equals(rows.getFirst().get("system_admin")))
        throw new IllegalStateException(
            "MASTER_EMAIL pertenece a una cuenta normal; utiliza otro correo para el administrador"
                + " maestro");
      return;
    }
    if (!normalized.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")
        || password.length() < 12
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalStateException(
          "Configura MASTER_EMAIL y MASTER_PASSWORD (mínimo 12 caracteres y máximo 72 bytes)");
    db.update(
        "insert into app_users(id,email,password_hash,full_name,system_admin)"
            + " values(?,?,?,'Administrador maestro',true)",
        UUID.randomUUID(),
        normalized,
        passwords.encode(password));
  }
}
