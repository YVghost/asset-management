package com.assetmanager.organization;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/organizations/{org}")
public class CatalogController {
  private final CatalogService catalogs;

  public CatalogController(CatalogService catalogs) {
    this.catalogs = catalogs;
  }

  @GetMapping("/{type:departments|locations|suppliers|categories}/{id}")
  public Map<String, Object> get(
      @PathVariable UUID org, @PathVariable String type, @PathVariable UUID id) {
    return catalogs.get(org, type, id);
  }

  @DeleteMapping("/{type:departments|locations|suppliers|categories|employees}/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archive(@PathVariable UUID org, @PathVariable String type, @PathVariable UUID id) {
    catalogs.archive(org, type, id);
  }

  @GetMapping("/{type:departments|locations|suppliers|categories}")
  public Map<String, Object> list(
      @PathVariable UUID org,
      @PathVariable String type,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "false") boolean activeOnly) {
    return catalogs.list(org, type, search, page, size, activeOnly);
  }

  @PostMapping("/{type:departments|locations|suppliers|categories}")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> create(
      @PathVariable UUID org,
      @PathVariable String type,
      @Valid @RequestBody CatalogService.Input in) {
    return catalogs.save(org, type, null, in);
  }

  @PutMapping("/{type:departments|locations|suppliers|categories}/{id}")
  public Map<String, Object> edit(
      @PathVariable UUID org,
      @PathVariable String type,
      @PathVariable UUID id,
      @Valid @RequestBody CatalogService.Input in) {
    return catalogs.save(org, type, id, in);
  }

  @GetMapping("/employees")
  public Map<String, Object> employees(
      @PathVariable UUID org,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "false") boolean activeOnly) {
    return catalogs.employees(org, search, page, size, activeOnly);
  }

  @GetMapping("/employees/{id}")
  public Map<String, Object> employee(@PathVariable UUID org, @PathVariable UUID id) {
    return catalogs.employee(org, id);
  }

  @PostMapping("/employees")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createEmployee(
      @PathVariable UUID org, @Valid @RequestBody CatalogService.EmployeeInput in) {
    return catalogs.saveEmployee(org, null, in);
  }

  @PutMapping("/employees/{id}")
  public Map<String, Object> editEmployee(
      @PathVariable UUID org,
      @PathVariable UUID id,
      @Valid @RequestBody CatalogService.EmployeeInput in) {
    return catalogs.saveEmployee(org, id, in);
  }
}
