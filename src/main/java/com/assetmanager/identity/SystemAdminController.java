package com.assetmanager.identity;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/system")
public class SystemAdminController {
  private final SystemAdminService service;

  public SystemAdminController(SystemAdminService service) {
    this.service = service;
  }

  @GetMapping("/organizations")
  public Map<String, Object> organizations(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return service.organizations(search, page, size);
  }

  @PostMapping("/organizations")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createOrganization(
      @Valid @RequestBody SystemAdminService.OrganizationInput in) {
    return service.organization(null, in);
  }

  @PutMapping("/organizations/{id}")
  public Map<String, Object> updateOrganization(
      @PathVariable UUID id, @Valid @RequestBody SystemAdminService.OrganizationInput in) {
    return service.organization(id, in);
  }

  @GetMapping("/users")
  public Map<String, Object> users(
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return service.users(search, page, size);
  }

  @PostMapping("/users")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createUser(@Valid @RequestBody SystemAdminService.UserInput in) {
    return service.user(null, in);
  }

  @PutMapping("/users/{id}")
  public Map<String, Object> updateUser(
      @PathVariable UUID id, @Valid @RequestBody SystemAdminService.UserInput in) {
    return service.user(id, in);
  }

  @PostMapping("/users/{id}/memberships")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void membership(
      @PathVariable UUID id, @Valid @RequestBody SystemAdminService.MembershipInput in) {
    service.membership(id, in);
  }

  @GetMapping("/users/{id}/memberships")
  public List<Map<String, Object>> memberships(@PathVariable UUID id) {
    return service.memberships(id);
  }

  @DeleteMapping("/users/{id}/memberships/{org}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void revoke(@PathVariable UUID id, @PathVariable UUID org) {
    service.revoke(id, org);
  }
}
