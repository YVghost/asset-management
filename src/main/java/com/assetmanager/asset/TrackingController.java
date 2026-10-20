package com.assetmanager.asset;

import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.ApiException;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
public class TrackingController {
  private final JdbcTemplate db;
  private final AccessService access;

  @org.springframework.beans.factory.annotation.Value("${ams.public-url:}")
  private String publicUrl;

  public TrackingController(JdbcTemplate db, AccessService access) {
    this.db = db;
    this.access = access;
  }

  @GetMapping("/api/v1/tracking-settings")
  public Map<String, String> settings() {
    access.user();
    return Map.of("publicUrl", publicUrl);
  }

  @GetMapping("/api/v1/tracking/{trackingId}")
  public Map<String, Object> resolve(@PathVariable UUID trackingId) {
    // Resolve only inside authorized organizations; the UUID is a locator, never a bearer
    // credential.
    var user = access.user();
    var rows =
        Boolean.TRUE.equals(user.get("system_admin"))
            ? db.queryForList(
                "select a.id,a.organization_id from assets a join organizations o on"
                    + " o.id=a.organization_id where a.tracking_id=? and o.active=true",
                trackingId)
            : db.queryForList(
                "select a.id,a.organization_id from assets a join organizations o on"
                    + " o.id=a.organization_id join organization_memberships m on"
                    + " m.organization_id=o.id where a.tracking_id=? and m.user_id=? and"
                    + " o.active=true",
                trackingId,
                user.get("id"));
    if (rows.isEmpty()) throw ApiException.missing();
    return rows.getFirst();
  }
}
