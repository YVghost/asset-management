package com.assetmanager.audit;

import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.JsonSupport;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
  private final JdbcTemplate db;
  private final AccessService access;
  private final JsonSupport json;

  public AuditService(JdbcTemplate db, AccessService access, JsonSupport json) {
    this.db = db;
    this.access = access;
    this.json = json;
  }

  public void record(UUID org, UUID asset, String type, Object changes) {
    db.update(
        "insert into asset_events(id,organization_id,asset_id,user_id,event_type,changes)"
            + " values(?,?,?,?,?,?::jsonb)",
        UUID.randomUUID(),
        org,
        asset,
        access.userId(),
        type,
        json.write(changes));
  }

  public List<Map<String, Object>> history(UUID org, UUID asset) {
    access.role(org);
    return db.queryForList(
        "select e.id,e.event_type,e.occurred_at,e.changes::text,u.full_name from asset_events e"
            + " join app_users u on u.id=e.user_id where e.organization_id=? and e.asset_id=? order"
            + " by e.occurred_at desc",
        org,
        asset);
  }
}
