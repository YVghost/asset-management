package com.assetmanager.organization;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BrandingContrastTest {
  @Test
  void calculatesWcagRelativeLuminance() {
    assertEquals(21d, BrandingService.contrast("#000000", "#FFFFFF"), .0001);
    assertEquals(1d, BrandingService.contrast("#FFFFFF", "#FFFFFF"), .0001);
    assertTrue(BrandingService.contrast("#006EB6", "#FFFFFF") >= 4.5);
    assertEquals(
        BrandingService.contrast("#185A65", "#FFFFFF"),
        BrandingService.contrast("#FFFFFF", "#185A65"),
        .0001);
  }
}
