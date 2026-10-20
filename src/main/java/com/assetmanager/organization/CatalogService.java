package com.assetmanager.organization;

import com.assetmanager.asset.AssetService;
import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.ApiException;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {
  public record Input(
      @NotBlank @Size(max = 160) String name,
      @Size(max = 200) String address,
      @Email @Size(max = 200) String email,
      @Size(max = 60) String phone,
      @Pattern(regexp = "HARDWARE|DIGITAL") String assetKind,
      boolean active) {}

  public record EmployeeInput(
      @NotBlank @Size(max = 60) String employeeCode,
      @NotBlank @Size(max = 100) String firstName,
      @NotBlank @Size(max = 100) String lastName,
      @Email @Size(max = 200) String email,
      UUID departmentId,
      UUID locationId,
      @Size(max = 160) String jobTitle,
      boolean active,
      @PastOrPresent LocalDate hiredOn) {}

  private final JdbcTemplate db;
  private final AccessService access;
  private final AssetService assets;

  public CatalogService(JdbcTemplate db, AccessService access, AssetService assets) {
    this.db = db;
    this.access = access;
    this.assets = assets;
  }

  public String table(String type) {
    return switch (type) {
      case "departments", "locations", "suppliers" -> type;
      case "categories" -> "asset_categories";
      default -> throw ApiException.missing();
    };
  }

  public Map<String, Object> get(UUID org, String type, UUID id) {
    access.role(org);
    var rows =
        db.queryForList(
            "select * from " + table(type) + " where organization_id=? and id=?", org, id);
    if (rows.isEmpty()) throw ApiException.missing();
    return rows.getFirst();
  }

  @Transactional
  public void archive(UUID org, String type, UUID id) {
    access.write(org);
    String table = type.equals("employees") ? "employees" : table(type);
    if (type.equals("employees")
        && db.queryForObject(
                "select count(*) from asset_assignments where organization_id=? and employee_id=?"
                    + " and returned_at is null",
                Long.class,
                org,
                id)
            > 0)
      throw ApiException.conflict("Devuelve sus activos antes de desactivar al empleado");
    if (db.update("update " + table + " set active=false where organization_id=? and id=?", org, id)
        == 0) throw ApiException.missing();
  }

  public Map<String, Object> list(
      UUID org, String type, String search, int page, int size, boolean activeOnly) {
    return list(org, type, search, page, size, activeOnly, "ALL");
  }

  public Map<String, Object> list(
      UUID org, String type, String search, int page, int size, boolean activeOnly, String state) {
    access.role(org);
    if (!Set.of("ALL", "ACTIVE", "INACTIVE").contains(state))
      throw ApiException.invalid("Estado de filtro no válido");
    String table = table(type);
    page = Math.max(0, page);
    size = Math.min(100, Math.max(1, size));
    String where =
        " where organization_id=? and name ilike ?"
            + (activeOnly || state.equals("ACTIVE")
                ? " and active=true"
                : state.equals("INACTIVE") ? " and active=false" : "");
    String related = "";
    if (type.equals("departments") || type.equals("locations")) {
      String column = type.equals("departments") ? "department_id" : "location_id";
      related =
          ",(select count(*) from assets a where a.organization_id="
              + table
              + ".organization_id and a."
              + column
              + "="
              + table
              + ".id) asset_count,(select count(*) from employees e where e.organization_id="
              + table
              + ".organization_id and e."
              + column
              + "="
              + table
              + ".id) employee_count";
    }
    long total =
        db.queryForObject(
            "select count(*) from " + table + where, Long.class, org, "%" + search + "%");
    return Map.of(
        "content",
        db.queryForList(
            "select "
                + table
                + ".*"
                + related
                + " from "
                + table
                + where
                + " order by name,id limit ? offset ?",
            org,
            "%" + search + "%",
            size,
            page * size),
        "totalElements",
        total,
        "page",
        page,
        "size",
        size);
  }

  @Transactional
  public Map<String, Object> save(UUID org, String type, UUID id, Input in) {
    access.write(org);
    String name = in.name().trim();
    String table = table(type);
    boolean create = id == null;
    if (create) id = UUID.randomUUID();
    else if (db.queryForObject(
            "select count(*) from " + table + " where organization_id=? and id=?",
            Long.class,
            org,
            id)
        == 0) throw ApiException.missing();
    if (type.equals("categories") && in.assetKind() == null)
      throw ApiException.invalid("Selecciona el tipo de categoría");
    if (!create
        && type.equals("categories")
        && db.queryForObject(
                "select count(*) from assets where organization_id=? and category_id=? and"
                    + " asset_kind<>?",
                Long.class,
                org,
                id,
                in.assetKind())
            > 0) throw ApiException.conflict("No puedes cambiar el tipo de una categoría en uso");
    if (create)
      db.update(
          "insert into "
              + table
              + "(id,organization_id,name,active"
              + (type.equals("categories") ? ",asset_kind" : "")
              + ") values(?,?,?,?"
              + (type.equals("categories") ? ",?" : "")
              + ")",
          type.equals("categories")
              ? new Object[] {id, org, name, in.active(), in.assetKind()}
              : new Object[] {id, org, name, in.active()});
    else
      db.update(
          "update " + table + " set name=?,active=? where organization_id=? and id=?",
          name,
          in.active(),
          org,
          id);
    if (type.equals("locations"))
      db.update(
          "update locations set address=? where organization_id=? and id=?", in.address(), org, id);
    if (type.equals("suppliers"))
      db.update(
          "update suppliers set email=?,phone=? where organization_id=? and id=?",
          in.email(),
          in.phone(),
          org,
          id);
    if (type.equals("categories"))
      db.update(
          "update asset_categories set asset_kind=? where organization_id=? and id=?",
          in.assetKind(),
          org,
          id);
    return db.queryForMap("select * from " + table + " where organization_id=? and id=?", org, id);
  }

  public Map<String, Object> employees(
      UUID org, String search, int page, int size, boolean activeOnly) {
    access.role(org);
    page = Math.max(0, page);
    size = Math.min(100, Math.max(1, size));
    String term = "%" + search + "%";
    String where =
        " where e.organization_id=? and (concat_ws(' ',e.first_name,e.last_name) ilike ? or"
            + " e.employee_code ilike ?)"
            + (activeOnly ? " and e.active=true" : "");
    long total =
        db.queryForObject("select count(*) from employees e" + where, Long.class, org, term, term);
    var rows =
        db.queryForList(
            "select e.*,d.name department_name,l.name location_name,(select count(*) from"
                + " asset_assignments aa where aa.employee_id=e.id and aa.returned_at is null)"
                + " assigned_count from employees e left join departments d on d.id=e.department_id"
                + " left join locations l on l.id=e.location_id"
                + where
                + " order by e.last_name,e.id limit ? offset ?",
            org,
            term,
            term,
            size,
            page * size);
    return Map.of("content", rows, "totalElements", total, "page", page, "size", size);
  }

  public Map<String, Object> employee(UUID org, UUID id) {
    access.role(org);
    var rows = db.queryForList("select * from employees where organization_id=? and id=?", org, id);
    if (rows.isEmpty()) throw ApiException.missing();
    var row = rows.getFirst();
    row.put(
        "assets",
        db.queryForList(
            AssetService.SELECT
                + " where a.organization_id=? and"
                + " coalesce(aa.employee_id,dd.responsible_employee_id)=?",
            org,
            id));
    row.put(
        "history",
        db.queryForList(
            "select aa.*,a.asset_code,a.name asset_name from asset_assignments aa join assets a on"
                + " a.id=aa.asset_id where aa.organization_id=? and aa.employee_id=? order by"
                + " aa.assigned_at desc",
            org,
            id));
    return row;
  }

  @Transactional
  public Map<String, Object> saveEmployee(UUID org, UUID id, EmployeeInput in) {
    access.write(org);
    Map<String, Object> previous = Map.of();
    if (id != null) {
      var rows =
          db.queryForList(
              "select department_id,location_id from employees where organization_id=? and id=?",
              org,
              id);
      if (rows.isEmpty()) throw ApiException.missing();
      previous = rows.getFirst();
    }
    assets.reference(org, "departments", in.departmentId(), (UUID) previous.get("department_id"));
    assets.reference(org, "locations", in.locationId(), (UUID) previous.get("location_id"));
    if (!in.active()
        && id != null
        && db.queryForObject(
                "select count(*) from asset_assignments where organization_id=? and employee_id=?"
                    + " and returned_at is null",
                Long.class,
                org,
                id)
            > 0)
      throw ApiException.conflict(
          "Devuelve o transfiere sus activos antes de desactivar al empleado");
    if (id == null) {
      id = UUID.randomUUID();
      db.update(
          "insert into employees(id,organization_id,employee_code,first_name,last_name)"
              + " values(?,?,?,?,?)",
          id,
          org,
          in.employeeCode(),
          in.firstName(),
          in.lastName());
    }
    int count =
        db.update(
            "update employees set"
                + " employee_code=?,first_name=?,last_name=?,email=?,department_id=?,location_id=?,job_title=?,active=?,hired_on=?"
                + " where organization_id=? and id=?",
            in.employeeCode(),
            in.firstName(),
            in.lastName(),
            in.email(),
            in.departmentId(),
            in.locationId(),
            in.jobTitle(),
            in.active(),
            in.hiredOn(),
            org,
            id);
    if (count == 0) throw ApiException.missing();
    return employee(org, id);
  }
}
