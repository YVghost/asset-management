package com.assetmanager.dashboard;

import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class DashboardController {
  private final DashboardService dashboard;

  public DashboardController(DashboardService dashboard) {
    this.dashboard = dashboard;
  }

  @GetMapping("/api/v1/organizations/{org}/dashboard")
  public Map<String, Object> get(@PathVariable UUID org) {
    return dashboard.get(org);
  }
}
