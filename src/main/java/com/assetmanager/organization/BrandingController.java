package com.assetmanager.organization;

import jakarta.validation.Valid;
import java.io.IOException;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class BrandingController {
  private final BrandingService service;

  public BrandingController(BrandingService service) {
    this.service = service;
  }

  @GetMapping("/api/v1/organizations/{org}/branding")
  public Map<String, Object> get(@PathVariable UUID org) {
    return service.get(org, false);
  }

  @GetMapping("/api/v1/system/organizations/{org}/branding")
  public Map<String, Object> system(@PathVariable UUID org) {
    return service.get(org, true);
  }

  @PutMapping("/api/v1/system/organizations/{org}/branding")
  public Map<String, Object> save(
      @PathVariable UUID org, @Valid @RequestBody BrandingService.Input in) {
    return service.save(org, in);
  }

  @PostMapping("/api/v1/system/organizations/{org}/branding/logo")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void upload(@PathVariable UUID org, @RequestParam MultipartFile file) throws IOException {
    service.logo(org, file);
  }

  @DeleteMapping("/api/v1/system/organizations/{org}/branding/logo")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void clear(@PathVariable UUID org) {
    service.clearLogo(org);
  }

  @GetMapping("/api/v1/organizations/{org}/branding/logo")
  public ResponseEntity<byte[]> logo(@PathVariable UUID org) {
    return ResponseEntity.ok()
        .contentType(MediaType.IMAGE_PNG)
        .header(HttpHeaders.CACHE_CONTROL, "no-store")
        .body(service.logo(org));
  }
}
