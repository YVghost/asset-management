package com.assetmanager;

import static org.junit.jupiter.api.Assertions.*;

import com.assetmanager.organization.DevelopmentSeed;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DevelopmentSeedTest {
  @Test
  void idsAreStableAcrossRestarts() {
    UUID first = DevelopmentSeed.key("org");
    assertEquals(first, DevelopmentSeed.key("org"));
    assertNotEquals(first, DevelopmentSeed.key("user"));
  }
}
