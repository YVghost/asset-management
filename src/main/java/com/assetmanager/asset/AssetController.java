package com.assetmanager.asset;

import com.assetmanager.assignment.AssignmentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{org}")
public class AssetController {
  private final AssetService assets;
  private final AssignmentService assignments;

  public AssetController(AssetService assets, AssignmentService assignments) {
    this.assets = assets;
    this.assignments = assignments;
  }

  @GetMapping({"/assets", "/hardware-assets", "/digital-assets"})
  public Map<String, Object> list(
      @PathVariable UUID org,
      @Valid @ModelAttribute AssetService.Filter filter,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "createdAt") String sort,
      @RequestParam(defaultValue = "desc") String direction,
      jakarta.servlet.http.HttpServletRequest request) {
    String kind =
        request.getRequestURI().endsWith("/hardware-assets")
            ? "HARDWARE"
            : request.getRequestURI().endsWith("/digital-assets") ? "DIGITAL" : filter.kind();
    return assets.list(org, filter.withKind(kind), page, size, sort, direction);
  }

  @GetMapping({"/assets/{id}", "/hardware-assets/{id}", "/digital-assets/{id}"})
  public Map<String, Object> detail(@PathVariable UUID org, @PathVariable UUID id) {
    return assets.detail(org, id);
  }

  @PostMapping({"/hardware-assets", "/digital-assets"})
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(
      @PathVariable UUID org,
      @Valid @RequestBody AssetInput input,
      jakarta.servlet.http.HttpServletRequest request) {
    return assets.save(
        org,
        null,
        input,
        request.getRequestURI().endsWith("hardware-assets") ? "HARDWARE" : "DIGITAL");
  }

  @PutMapping({"/hardware-assets/{id}", "/digital-assets/{id}"})
  public Map<String, Object> edit(
      @PathVariable UUID org,
      @PathVariable UUID id,
      @Valid @RequestBody AssetInput input,
      jakarta.servlet.http.HttpServletRequest request) {
    return assets.save(
        org,
        id,
        input,
        request.getRequestURI().contains("/hardware-assets/") ? "HARDWARE" : "DIGITAL");
  }

  public record Status(@NotBlank String status) {}

  @PatchMapping("/assets/{id}/status")
  public Map<String, Object> status(
      @PathVariable UUID org, @PathVariable UUID id, @Valid @RequestBody Status input) {
    return assets.status(org, id, input.status());
  }

  @PostMapping("/assets/{id}/assign")
  public Map<String, Object> assign(
      @PathVariable UUID org,
      @PathVariable UUID id,
      @Valid @RequestBody AssignmentService.Input input) {
    return assignments.assign(org, id, input, false);
  }

  @PostMapping("/assets/{id}/transfer")
  public Map<String, Object> transfer(
      @PathVariable UUID org,
      @PathVariable UUID id,
      @Valid @RequestBody AssignmentService.Input input) {
    return assignments.assign(org, id, input, true);
  }

  @PostMapping("/assets/{id}/return")
  public Map<String, Object> giveBack(
      @PathVariable UUID org,
      @PathVariable UUID id,
      @Valid @RequestBody AssignmentService.ReturnInput input) {
    return assignments.giveBack(org, id, input);
  }

  @GetMapping("/assets/{id}/assignments")
  public List<Map<String, Object>> history(@PathVariable UUID org, @PathVariable UUID id) {
    return assignments.history(org, id);
  }

  @GetMapping("/assets/expiring")
  public Map<String, Object> expiring(
      @PathVariable UUID org,
      @RequestParam(defaultValue = "DIGITAL") String type,
      @RequestParam(defaultValue = "0") int page) {
    return assets.list(
        org,
        new AssetService.Filter(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "LIFECYCLE".equals(type) ? "EXPIRING" : null,
            "LIFECYCLE".equals(type) ? null : type),
        page,
        20,
        "name",
        "asc");
  }

  @GetMapping("/assets/export")
  public ResponseEntity<byte[]> export(
      @PathVariable UUID org, @Valid @ModelAttribute AssetService.Filter filter) {
    StringBuilder csv =
        new StringBuilder(
            "\uFEFFCódigo,Nombre,Tipo,Categoría,Estado,Responsable,Departamento,Ubicación,Fecha de"
                + " compra,Costo,Moneda,Fin vida útil,Días restantes\r\n");
    int page = 0;
    long total;
    do {
      var result = assets.list(org, filter, page, 100, "assetCode", "asc");
      total = ((Number) result.get("totalElements")).longValue();
      @SuppressWarnings("unchecked")
      var rows = (List<Map<String, Object>>) result.get("content");
      for (var row : rows) {
        var life = (Lifecycle) row.get("lifecycle");
        Object[] values = {
          row.get("asset_code"),
          row.get("name"),
          row.get("asset_kind"),
          row.get("category_name"),
          row.get("status"),
          row.get("assigned_employee"),
          row.get("department_name"),
          row.get("location_name"),
          row.get("acquisition_date"),
          row.get("acquisition_cost"),
          row.get("currency"),
          life.estimatedEndOfLife(),
          life.remainingDays()
        };
        csv.append(
                Arrays.stream(values)
                    .map(AssetController::cell)
                    .collect(java.util.stream.Collectors.joining(",")))
            .append("\r\n");
      }
    } while (++page * 100 < total);
    return ResponseEntity.ok()
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventario.csv")
        .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
        .body(csv.toString().getBytes(StandardCharsets.UTF_8));
  }

  static String cell(Object value) {
    String s = value == null ? "" : value.toString();
    if (s.stripLeading().matches("^[=+@\\-].*") || s.startsWith("\t") || s.startsWith("\r"))
      s = "'" + s;
    return "\"" + s.replace("\"", "\"\"") + "\"";
  }
}
