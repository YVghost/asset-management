package com.assetmanager.asset;

import static org.junit.jupiter.api.Assertions.*;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class LifecycleTest {
  @Test
  void usesCalendarMonthsAndLeapYears() {
    var life = Lifecycle.calculate(LocalDate.of(2024, 1, 31), 1, LocalDate.of(2024, 2, 1), 6);
    assertEquals(LocalDate.of(2024, 2, 29), life.estimatedEndOfLife());
    assertEquals(28L, life.remainingDays());
    assertEquals(100d / 29, life.consumedPercent(), .00001);
  }

  @Test
  void expiredIsCapped() {
    var life = Lifecycle.calculate(LocalDate.of(2020, 1, 1), 12, LocalDate.of(2026, 1, 1), 6);
    assertEquals(0L, life.remainingDays());
    assertEquals(100d, life.consumedPercent());
    assertEquals("EXCEEDED", life.state());
  }

  @Test
  void futureStartDoesNotConsumeLife() {
    var life = Lifecycle.calculate(LocalDate.of(2027, 1, 1), 12, LocalDate.of(2026, 1, 1), 6);
    assertEquals(0L, life.ageDays());
    assertEquals(0d, life.consumedPercent());
  }

  @Test
  void missingValuesAreNotInvented() {
    assertNull(Lifecycle.calculate(null, 12, LocalDate.now(), 6).remainingDays());
    assertNull(Lifecycle.calculate(LocalDate.now(), null, LocalDate.now(), 6).consumedPercent());
    assertEquals(
        "NOT_CALCULABLE", Lifecycle.calculate(LocalDate.now(), 0, LocalDate.now(), 6).state());
  }

  @Test
  void thresholdUsesCalendarMonths() {
    assertEquals(
        "EXPIRING",
        Lifecycle.calculate(LocalDate.of(2025, 1, 1), 12, LocalDate.of(2025, 7, 1), 6).state());
    assertEquals(
        "CURRENT",
        Lifecycle.calculate(LocalDate.of(2025, 1, 1), 12, LocalDate.of(2025, 6, 30), 6).state());
  }
}
