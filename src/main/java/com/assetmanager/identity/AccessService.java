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

  public String role(UUID org) {
    var user = user();
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
