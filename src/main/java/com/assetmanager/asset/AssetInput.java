package com.assetmanager.asset;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public record AssetInput(
    @NotBlank @Size(max = 60) String assetCode,
    @NotBlank @Size(max = 160) String name,
    @Size(max = 5000) String description,
    @NotBlank @Pattern(regexp = "HARDWARE|DIGITAL") String assetKind,
    @NotNull UUID categoryId,
    @PastOrPresent LocalDate acquisitionDate,
    @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal acquisitionCost,
    @DecimalMin("0") BigDecimal residualValue,
    @NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
    @PastOrPresent LocalDate inServiceDate,
    @Min(1) @Max(1200) Integer usefulLifeMonths,
    UUID locationId,
    UUID departmentId,
    UUID supplierId,
    UUID parentAssetId,
    @Size(max = 200) String invoiceReference,
    @Size(max = 5000) String notes,
    @Valid Hardware hardware,
    @Valid Digital digital,
    UUID employeeId) {
  public record Hardware(
      @Size(max = 100) String brand,
      @Size(max = 100) String model,
      @Size(max = 160) String serialNumber,
      @Size(max = 100) String patrimonialTag,
      @NotBlank @Pattern(regexp = "NEW|GOOD|FAIR|DAMAGED") String physicalCondition,
      LocalDate warrantyEndDate,
      Map<String, String> specifications) {}

  public record Digital(
      @Size(max = 160) String product,
      @Size(max = 100) String licenseType,
      @Size(max = 200) String contractReference,
      LocalDate activationDate,
      LocalDate expirationDate,
      boolean autoRenew,
      @DecimalMin("0") @Digits(integer = 17, fraction = 2) BigDecimal renewalCost,
      @Min(1) Integer seats,
      UUID responsibleEmployeeId,
      @Size(max = 500) String managementUrl) {
    public Digital(
        String product,
        String licenseType,
        String contractReference,
        LocalDate activationDate,
        LocalDate expirationDate,
        boolean autoRenew,
        BigDecimal renewalCost,
        Integer seats,
        UUID responsibleEmployeeId) {
      this(
          product,
          licenseType,
          contractReference,
          activationDate,
          expirationDate,
          autoRenew,
          renewalCost,
          seats,
          responsibleEmployeeId,
          null);
    }
  }
}
