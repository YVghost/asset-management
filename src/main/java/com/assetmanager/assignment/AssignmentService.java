package com.assetmanager.assignment;

import com.assetmanager.asset.*;
import com.assetmanager.audit.AuditService;
import com.assetmanager.identity.AccessService;
import com.assetmanager.shared.ApiException;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssignmentService {
  public record Input(
      @NotNull UUID employeeId,
      UUID departmentId,
      @NotNull Instant assignedAt,
      Instant expectedReturnAt,
      @Size(max = 5000) String notes) {}

  public record ReturnInput(@NotNull Instant returnedAt, @Size(max = 5000) String notes) {}

  private final JdbcTemplate db;
  private final AssetService assets;
  private final AssetRepository repository;
  private final AccessService access;
  private final AuditService audit;

  public AssignmentService(
      JdbcTemplate db,
      AssetService assets,
      AssetRepository repository,
      AccessService access,
      AuditService audit) {
    this.db = db;
    this.assets = assets;
    this.repository = repository;
    this.access = access;
    this.audit = audit;
  }

  public List<Map<String, Object>> history(UUID org, UUID id) {
    assets.require(org, id);
    return db.queryForList(
        "select aa.*,concat_ws(' ',e.first_name,e.last_name) employee_name,e.employee_code,d.name"
            + " department_name,l.name location_name,u.full_name assigned_by from asset_assignments"
            + " aa join employees e on e.id=aa.employee_id left join departments d on"
            + " d.id=aa.department_id left join locations l on l.id=e.location_id join app_users u"
            + " on u.id=aa.assigned_by_user_id where aa.organization_id=? and aa.asset_id=? order"
            + " by aa.assigned_at desc",
        org,
        id);
  }

  @Transactional
  public Map<String, Object> assign(UUID org, UUID id, Input in, boolean transfer) {
    Asset a = assets.locked(org, id);
    if (!a.assetKind.equals("HARDWARE"))
      throw ApiException.invalid(
          "Usa el responsable del activo digital; los puestos no son asignaciones físicas");
    assets.reference(org, "employees", in.employeeId());
    assets.reference(org, "departments", in.departmentId());
    if (in.assignedAt().isAfter(Instant.now().plusSeconds(60))
        || in.expectedReturnAt() != null && in.expectedReturnAt().isBefore(in.assignedAt()))
      throw ApiException.invalid("Fechas de entrega incorrectas");
    var active =
        db.queryForList(
            "select * from asset_assignments where organization_id=? and asset_id=? and returned_at"
                + " is null",
            org,
            id);
    if (transfer) {
      if (active.isEmpty()) throw ApiException.conflict("No hay una asignación para transferir");
      if (active.getFirst().get("employee_id").equals(in.employeeId()))
        throw ApiException.invalid("Selecciona un empleado distinto");
      close(org, id, in.assignedAt(), in.notes());
    } else if (!a.status.equals("AVAILABLE") || !active.isEmpty())
      throw ApiException.conflict("El activo no está disponible para asignación");
    db.update(
        "insert into"
            + " asset_assignments(id,organization_id,asset_id,employee_id,department_id,assigned_at,expected_return_at,notes,assigned_by_user_id)"
            + " values(?,?,?,?,?,?,?,?,?)",
        UUID.randomUUID(),
        org,
        id,
        in.employeeId(),
        in.departmentId(),
        java.sql.Timestamp.from(in.assignedAt()),
        in.expectedReturnAt() == null ? null : java.sql.Timestamp.from(in.expectedReturnAt()),
        in.notes(),
        access.userId());
    a.status = "ASSIGNED";
    if (in.departmentId() != null) a.departmentId = in.departmentId();
    a.updatedAt = Instant.now();
    repository.saveAndFlush(a);
    audit.record(
        org,
        id,
        transfer ? "TRANSFERRED" : "ASSIGNED",
        Map.of("employeeId", in.employeeId(), "assignedAt", in.assignedAt()));
    return assets.detail(org, id);
  }

  private void close(UUID org, UUID id, Instant at, String notes) {
    var rows =
        db.queryForList(
            "select assigned_at from asset_assignments where organization_id=? and asset_id=? and"
                + " returned_at is null",
            org,
            id);
    if (rows.isEmpty()) throw ApiException.conflict("El activo no tiene asignación vigente");
    Instant assigned = ((java.sql.Timestamp) rows.getFirst().get("assigned_at")).toInstant();
    if (at.isBefore(assigned) || at.isAfter(Instant.now().plusSeconds(60)))
      throw ApiException.invalid("La devolución debe ser posterior a la entrega y no futura");
    db.update(
        "update asset_assignments set returned_at=?,returned_by_user_id=?,notes=concat_ws(E'\\n"
            + "',notes,?) where organization_id=? and asset_id=? and returned_at is null",
        java.sql.Timestamp.from(at),
        access.userId(),
        notes,
        org,
        id);
  }

  @Transactional
  public Map<String, Object> giveBack(UUID org, UUID id, ReturnInput in) {
    var a = assets.locked(org, id);
    close(org, id, in.returnedAt(), in.notes());
    a.status = "AVAILABLE";
    a.updatedAt = Instant.now();
    repository.saveAndFlush(a);
    audit.record(org, id, "RETURNED", Map.of("returnedAt", in.returnedAt()));
    return assets.detail(org, id);
  }
}
