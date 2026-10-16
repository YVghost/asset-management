package com.assetmanager.asset;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public record Lifecycle(
    LocalDate estimatedEndOfLife,
    Long ageDays,
    Long remainingDays,
    Double consumedPercent,
    String state) {
  public static Lifecycle calculate(
      LocalDate start, Integer months, LocalDate today, int alertMonths) {
    if (start == null || months == null || months <= 0)
      return new Lifecycle(null, null, null, null, "NOT_CALCULABLE");
    LocalDate end = start.plusMonths(months);
    long elapsed = Math.max(0, ChronoUnit.DAYS.between(start, today));
    long total = ChronoUnit.DAYS.between(start, end);
    long remaining = Math.max(0, ChronoUnit.DAYS.between(today, end));
    String state =
        !today.isBefore(end)
            ? "EXCEEDED"
            : !end.isAfter(today.plusMonths(alertMonths)) ? "EXPIRING" : "CURRENT";
    return new Lifecycle(
        end, elapsed, remaining, Math.min(100d, Math.max(0d, elapsed * 100d / total)), state);
  }
}
