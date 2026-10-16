package com.assetmanager.asset;

import com.assetmanager.audit.AuditService;
import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssetService {
  private final AssetRepository assets;
  private final JdbcTemplate db;
  private final AccessService access;
  private final AuditService audit;
  private final JsonSupport json;
  private final int alertMonths;

  public AssetService(
      AssetRepository assets,
      JdbcTemplate db,
      AccessService access,
      AuditService audit,
      JsonSupport json,
      @Value("${ams.lifecycle.alert-months:6}") int alertMonths) {
    this.assets = assets;
    this.db = db;
    this.access = access;
    this.audit = audit;
    this.json = json;
    this.alertMonths = alertMonths;
  }

  public Asset require(UUID org, UUID id) {
    access.role(org);
    return assets.findByIdAndOrganizationId(id, org).orElseThrow(ApiException::missing);
  }

  public Asset locked(UUID org, UUID id) {
    access.write(org);
    return assets.lock(id, org).orElseThrow(ApiException::missing);
  }

  public void reference(UUID org, String table, UUID id) {
    if (id != null
        && db.queryForObject(
                "select count(*) from "
                    + table
                    + " where organization_id=? and id=? and active=true",
                Long.class,
                org,
                id)
            == 0)
      throw ApiException.invalid(
          "La referencia seleccionada no pertenece a la empresa o está inactiva");
  }

  @Transactional
  public Map<String, Object> save(UUID org, UUID id, AssetInput in, String kind) {
    access.write(org);
    // Serialize parent relationship edits per organization so concurrent changes cannot form a
    // cycle.
    db.queryForObject(
        "select pg_advisory_xact_lock(hashtextextended(?::text,0))", Object.class, org.toString());
    if (!in.assetKind().equals(kind)) throw ApiException.invalid("Tipo de activo incorrecto");
    reference(org, "asset_categories", in.categoryId());
    reference(org, "locations", in.locationId());
    reference(org, "departments", in.departmentId());
    reference(org, "suppliers", in.supplierId());
    String categoryKind =
        db.queryForObject(
            "select asset_kind from asset_categories where id=? and organization_id=?",
            String.class,
            in.categoryId(),
            org);
    if (!kind.equals(categoryKind))
      throw ApiException.invalid("La categoría no corresponde al tipo de activo");
    if (in.acquisitionDate() != null
        && in.inServiceDate() != null
        && in.inServiceDate().isBefore(in.acquisitionDate()))
      throw ApiException.invalid("La entrada en servicio no puede preceder a la compra");
    if (in.parentAssetId() != null) {
      var parent = require(org, in.parentAssetId());
      Set<UUID> visited = new HashSet<>();
      if (id != null) visited.add(id);
      while (parent != null) {
        if (!visited.add(parent.id))
          throw ApiException.invalid("La relación entre activos genera un ciclo");
        parent = parent.parentAssetId == null ? null : require(org, parent.parentAssetId);
      }
    }
    boolean create = id == null;
    Asset a = create ? new Asset() : locked(org, id);
    if (!create && !a.assetKind.equals(kind))
      throw ApiException.invalid("No puedes cambiar el tipo del activo");
    Map<String, Object> before = create ? Map.of() : snapshot(a);
    if (create) {
      a.id = UUID.randomUUID();
      a.organizationId = org;
      a.status = "AVAILABLE";
      a.createdAt = Instant.now();
      a.createdBy = access.userId();
    }
    a.assetCode = in.assetCode().trim();
    a.name = in.name().trim();
    a.description = in.description();
    a.assetKind = kind;
    a.categoryId = in.categoryId();
    a.acquisitionDate = in.acquisitionDate();
    a.acquisitionCost = in.acquisitionCost();
    a.residualValue = in.residualValue();
    a.currency = in.currency();
    a.inServiceDate = in.inServiceDate();
    a.usefulLifeMonths = in.usefulLifeMonths();
    a.locationId = in.locationId();
    a.departmentId = in.departmentId();
    a.supplierId = in.supplierId();
    a.parentAssetId = in.parentAssetId();
    a.invoiceReference = in.invoiceReference();
    a.notes = in.notes();
    a.updatedAt = Instant.now();
    assets.saveAndFlush(a);
    if (kind.equals("HARDWARE")) {
      var h = in.hardware();
      if (h == null) throw ApiException.invalid("Faltan los datos de hardware");
      Map<String, String> specs = h.specifications() == null ? Map.of() : h.specifications();
      if (specs.size() > 30
          || specs.entrySet().stream()
              .anyMatch(
                  e ->
                      e.getKey().length() > 80
                          || e.getValue() == null
                          || e.getValue().length() > 500))
        throw ApiException.invalid("Especificaciones técnicas demasiado extensas");
      db.update(
          "insert into"
              + " hardware_asset_details(asset_id,organization_id,brand,model,serial_number,patrimonial_tag,physical_condition,warranty_end_date,specifications)"
              + " values(?,?,?,?,?,?,?,?,?::jsonb) on conflict(asset_id) do update set"
              + " brand=excluded.brand,model=excluded.model,serial_number=excluded.serial_number,patrimonial_tag=excluded.patrimonial_tag,physical_condition=excluded.physical_condition,warranty_end_date=excluded.warranty_end_date,specifications=excluded.specifications",
          a.id,
          org,
          h.brand(),
          h.model(),
          h.serialNumber(),
          h.patrimonialTag(),
          h.physicalCondition(),
          h.warrantyEndDate(),
          json.write(specs));
    } else {
      var d = in.digital();
      if (d == null) throw ApiException.invalid("Faltan los datos del activo digital");
      reference(org, "employees", d.responsibleEmployeeId());
      if (d.activationDate() != null
          && d.expirationDate() != null
          && d.expirationDate().isBefore(d.activationDate()))
        throw ApiException.invalid("El vencimiento debe ser posterior a la activación");
      db.update(
          "insert into"
              + " digital_asset_details(asset_id,organization_id,product,license_type,contract_reference,activation_date,expiration_date,auto_renew,renewal_cost,seats,responsible_employee_id)"
              + " values(?,?,?,?,?,?,?,?,?,?,?) on conflict(asset_id) do update set"
              + " product=excluded.product,license_type=excluded.license_type,contract_reference=excluded.contract_reference,activation_date=excluded.activation_date,expiration_date=excluded.expiration_date,auto_renew=excluded.auto_renew,renewal_cost=excluded.renewal_cost,seats=excluded.seats,responsible_employee_id=excluded.responsible_employee_id",
          a.id,
          org,
          d.product(),
          d.licenseType(),
          d.contractReference(),
          d.activationDate(),
          d.expirationDate(),
          d.autoRenew(),
          d.renewalCost(),
          d.seats(),
          d.responsibleEmployeeId());
    }
    audit.record(
        org, a.id, create ? "CREATED" : "UPDATED", Map.of("before", before, "after", snapshot(a)));
    if (create && in.employeeId() != null) {
      if (!kind.equals("HARDWARE"))
        throw ApiException.invalid("Las licencias utilizan un responsable y puestos contratados");
      reference(org, "employees", in.employeeId());
      db.update(
          "insert into"
              + " asset_assignments(id,organization_id,asset_id,employee_id,assigned_at,assigned_by_user_id)"
              + " values(?,?,?,?,?,?)",
          UUID.randomUUID(),
          org,
          a.id,
          in.employeeId(),
          java.sql.Timestamp.from(Instant.now()),
          access.userId());
      a.status = "ASSIGNED";
      assets.saveAndFlush(a);
      audit.record(org, a.id, "ASSIGNED", Map.of("employeeId", in.employeeId()));
    }
    return detail(org, a.id);
  }

  private Map<String, Object> snapshot(Asset a) {
    var data = new LinkedHashMap<String, Object>();
    data.put("assetCode", a.assetCode);
    data.put("name", a.name);
    data.put("status", a.status);
    data.put("inServiceDate", a.inServiceDate);
    data.put("usefulLifeMonths", a.usefulLifeMonths);
    data.put("locationId", a.locationId);
    data.put("departmentId", a.departmentId);
    data.put("acquisitionCost", a.acquisitionCost);
    return data;
  }

  public static final String SELECT =
      "select a.*,c.name category_name,l.name location_name,d.name department_name,s.name"
          + " supplier_name,h.brand,h.model,h.serial_number,h.warranty_end_date,"
          + " coalesce(nullif(concat_ws(' ',e.first_name,e.last_name),''),concat_ws('"
          + " ',responsible.first_name,responsible.last_name))"
          + " assigned_employee,coalesce(e.employee_code,responsible.employee_code)"
          + " employee_code,coalesce(aa.employee_id,dd.responsible_employee_id) employee_id from"
          + " assets a join asset_categories c on c.id=a.category_id left join locations l on"
          + " l.id=a.location_id left join departments d on d.id=a.department_id left join"
          + " suppliers s on s.id=a.supplier_id left join hardware_asset_details h on"
          + " h.asset_id=a.id left join asset_assignments aa on aa.asset_id=a.id and aa.returned_at"
          + " is null left join employees e on e.id=aa.employee_id left join digital_asset_details"
          + " dd on dd.asset_id=a.id left join employees responsible on"
          + " responsible.id=dd.responsible_employee_id";

  public record Filter(
      String search,
      String kind,
      String status,
      UUID categoryId,
      UUID employeeId,
      UUID departmentId,
      UUID locationId,
      String lifecycle,
      String expiry) {}

  public record Query(String where, List<Object> args) {}

  public Query query(UUID org, Filter f) {
    access.role(org);
    StringBuilder w = new StringBuilder(" where a.organization_id=?");
    List<Object> args = new ArrayList<>();
    args.add(org);
    if (f.search() != null && !f.search().isBlank()) {
      w.append(" and (a.name ilike ? or a.asset_code ilike ? or h.serial_number ilike ?)");
      for (int i = 0; i < 3; i++) args.add("%" + f.search() + "%");
    }
    String[] cols = {
      "a.asset_kind",
      "a.status",
      "a.category_id",
      "coalesce(aa.employee_id,dd.responsible_employee_id)",
      "a.department_id",
      "a.location_id"
    };
    Object[] vals = {
      f.kind(), f.status(), f.categoryId(), f.employeeId(), f.departmentId(), f.locationId()
    };
    for (int i = 0; i < cols.length; i++)
      if (vals[i] != null && !vals[i].toString().isBlank()) {
        w.append(" and ").append(cols[i]).append("=?");
        args.add(vals[i]);
      }
    if ("EXPIRING".equals(f.lifecycle()))
      w.append(
          " and a.in_service_date is not null and a.useful_life_months is not null and"
              + " (a.in_service_date + make_interval(months=>a.useful_life_months))::date between"
              + " current_date and (current_date + make_interval(months=>"
              + alertMonths
              + "))::date");
    if ("EXCEEDED".equals(f.lifecycle()))
      w.append(
          " and (a.in_service_date + make_interval(months=>a.useful_life_months))::date <="
              + " current_date");
    if ("DIGITAL".equals(f.expiry()))
      w.append(
          " and exists(select 1 from digital_asset_details dd where dd.asset_id=a.id and"
              + " dd.expiration_date between current_date and current_date+30)");
    if ("WARRANTY".equals(f.expiry()))
      w.append(" and h.warranty_end_date between current_date and current_date+30");
    return new Query(w.toString(), args);
  }

  public Map<String, Object> list(
      UUID org, Filter f, int page, int size, String sort, String direction) {
    var q = query(org, f);
    page = Math.max(0, page);
    size = Math.min(100, Math.max(1, size));
    String col =
        Map.of(
                "name",
                "a.name",
                "assetCode",
                "a.asset_code",
                "createdAt",
                "a.created_at",
                "status",
                "a.status")
            .getOrDefault(sort == null ? "" : sort, "a.created_at");
    Long total =
        db.queryForObject(
            "select count(*) from (" + SELECT + q.where() + ") result",
            Long.class,
            q.args().toArray());
    var args = new ArrayList<>(q.args());
    args.add(size);
    args.add(page * size);
    var rows =
        db.queryForList(
            SELECT
                + q.where()
                + " order by "
                + col
                + ("asc".equalsIgnoreCase(direction) ? " asc" : " desc")
                + ",a.id limit ? offset ?",
            args.toArray());
    rows.forEach(this::enrich);
    return Map.of(
        "content",
        rows,
        "totalElements",
        total,
        "page",
        page,
        "size",
        size,
        "totalPages",
        (total + size - 1) / size);
  }

  private void enrich(Map<String, Object> row) {
    var start = (java.sql.Date) row.get("in_service_date");
    row.put(
        "lifecycle",
        Lifecycle.calculate(
            start == null ? null : start.toLocalDate(),
            (Integer) row.get("useful_life_months"),
            LocalDate.now(ZoneOffset.UTC),
            alertMonths));
  }

  public Map<String, Object> detail(UUID org, UUID id) {
    require(org, id);
    var row = db.queryForMap(SELECT + " where a.organization_id=? and a.id=?", org, id);
    enrich(row);
    if (row.get("asset_kind").equals("HARDWARE")) {
      var h =
          db.queryForMap(
              "select"
                  + " brand,model,serial_number,patrimonial_tag,physical_condition,warranty_end_date,specifications::text"
                  + " from hardware_asset_details where organization_id=? and asset_id=?",
              org,
              id);
      h.put("specifications", json.read((String) h.get("specifications")));
      row.put("hardware", h);
    } else
      row.put(
          "digital",
          db.queryForMap(
              "select"
                  + " product,license_type,contract_reference,activation_date,expiration_date,auto_renew,renewal_cost,seats,responsible_employee_id"
                  + " from digital_asset_details where organization_id=? and asset_id=?",
              org,
              id));
    row.put("events", audit.history(org, id));
    return row;
  }

  @Transactional
  public Map<String, Object> status(UUID org, UUID id, String next) {
    var a = locked(org, id);
    if (!Set.of("AVAILABLE", "IN_MAINTENANCE", "RETIRED", "DISPOSED", "LOST").contains(next))
      throw ApiException.invalid("Estado no válido");
    if (a.status.equals("ASSIGNED"))
      throw ApiException.conflict("Registra primero la devolución del activo");
    String before = a.status;
    a.status = next;
    a.updatedAt = Instant.now();
    assets.saveAndFlush(a);
    audit.record(org, id, "STATUS_CHANGED", Map.of("before", before, "after", next));
    return detail(org, id);
  }
}
