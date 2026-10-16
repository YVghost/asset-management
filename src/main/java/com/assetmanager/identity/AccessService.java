package com.assetmanager.identity;

import com.assetmanager.shared.ApiException;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AccessService {
  private final JdbcTemplate db;

  public AccessService(JdbcTemplate db) {
    this.db = db;
  }

  public Map<String, Object> user() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || !auth.isAuthenticated() || auth.getName().equals("anonymousUser"))
      throw new ApiException(HttpStatus.UNAUTHORIZED, "Inicia sesión");
    var rows =
        db.queryForList(
            "select id,email,full_name,system_admin from app_users where email=? and active=true",
            auth.getName());
    if (rows.isEmpty()) throw new ApiException(HttpStatus.UNAUTHORIZED, "La cuenta no está activa");
    return rows.getFirst();
  }

  public UUID userId() {
    return (UUID) user().get("id");
  }

  public boolean systemAdmin() {
    return Boolean.TRUE.equals(user().get("system_admin"));
  }

  public void master() {
    if (!systemAdmin())
      throw new ApiException(HttpStatus.FORBIDDEN, "Se requiere administrador maestro del sistema");
  }

  public List<Map<String, Object>> organizations() {
    var current = user();
    if (Boolean.TRUE.equals(current.get("system_admin")))
      return db.queryForList(
          "select id,name,'ORG_ADMIN' role from organizations where active=true order by name");
    return db.queryForList(
        "select o.id,o.name,m.role from organizations o join organization_memberships m on"
            + " m.organization_id=o.id where m.user_id=? and o.active=true order by o.name",
        current.get("id"));
  }

  public String role(UUID org) {
    var user = user();
    if (Boolean.TRUE.equals(user.get("system_admin"))) {
      if (db.queryForObject(
              "select count(*) from organizations where id=? and active=true", Long.class, org)
          == 0) throw ApiException.missing();
      return "ORG_ADMIN";
    }
    var roles =
        db.queryForList(
            "select m.role from organization_memberships m join organizations o on"
                + " o.id=m.organization_id where m.organization_id=? and m.user_id=? and"
                + " o.active=true",
            String.class,
            org,
            user.get("id"));
    if (roles.isEmpty())
      throw new ApiException(HttpStatus.FORBIDDEN, "No tienes acceso a esta organización");
    return roles.getFirst();
  }

  public void write(UUID org) {
    if (role(org).equals("VIEWER"))
      throw new ApiException(HttpStatus.FORBIDDEN, "Tu cuenta solo tiene permisos de consulta");
  }

  public void admin(UUID org) {
    if (!role(org).equals("ORG_ADMIN"))
      throw new ApiException(HttpStatus.FORBIDDEN, "Se requiere administración de la organización");
  }
}
