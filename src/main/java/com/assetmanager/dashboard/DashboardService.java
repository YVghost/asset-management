package com.assetmanager.dashboard;

import com.assetmanager.identity.AccessService;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {
  private final JdbcTemplate db;
  private final AccessService access;
  private final int months;

  public DashboardService(
      JdbcTemplate db, AccessService access, @Value("${ams.lifecycle.alert-months:6}") int months) {
    this.db = db;
    this.access = access;
    this.months = months;
  }

  public Map<String, Object> get(UUID org) {
    access.role(org);
    var counts =
        db.queryForMap(
            "select count(*) total,count(*) filter(where asset_kind='HARDWARE') hardware,count(*)"
                + " filter(where asset_kind='DIGITAL') digital,count(*) filter(where"
                + " status='ASSIGNED') assigned,count(*) filter(where status='AVAILABLE')"
                + " available,count(*) filter(where status='IN_MAINTENANCE') maintenance,count(*)"
                + " filter(where status in ('RETIRED','DISPOSED')) retired,count(*) filter(where"
                + " (in_service_date+make_interval(months=>useful_life_months))::date between"
                + " current_date and (current_date+make_interval(months=>?))::date)"
                + " lifecycle_expiring,count(*) filter(where"
                + " (in_service_date+make_interval(months=>useful_life_months))::date <="
                + " current_date) lifecycle_exceeded from assets where organization_id=?",
            months,
            org);
    counts.put(
        "warranty_expiring",
        db.queryForObject(
            "select count(*) from hardware_asset_details where organization_id=? and"
                + " warranty_end_date between current_date and current_date+30",
            Long.class,
            org));
    counts.put(
        "digital_expiring",
        db.queryForObject(
            "select count(*) from digital_asset_details where organization_id=? and expiration_date"
                + " between current_date and current_date+30",
            Long.class,
            org));
    return Map.of(
        "counts",
        counts,
        "categories",
        db.queryForList(
            "select c.name,count(*) total from assets a join asset_categories c on"
                + " c.id=a.category_id where a.organization_id=? group by c.name order by total"
                + " desc",
            org),
        "departments",
        db.queryForList(
            "select coalesce(d.name,'Sin departamento') name,count(*) total from assets a left join"
                + " departments d on d.id=a.department_id where a.organization_id=? group by d.name"
                + " order by total desc",
            org),
        "recentEvents",
        db.queryForList(
            "select e.event_type,e.occurred_at,a.name,a.asset_code,u.full_name from asset_events e"
                + " join assets a on a.id=e.asset_id join app_users u on u.id=e.user_id where"
                + " e.organization_id=? order by occurred_at desc limit 8",
            org));
  }
}
