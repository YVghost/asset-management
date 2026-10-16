package com.assetmanager.asset;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "assets")
public class Asset {
  @Id public UUID id;
  public UUID organizationId;
  public String assetCode;
  public String name;
  public String description;
  public String assetKind;
  public UUID categoryId;
  public String status;
  public LocalDate acquisitionDate;
  public BigDecimal acquisitionCost;
  public BigDecimal residualValue;
  public String currency;
  public LocalDate inServiceDate;
  public Integer usefulLifeMonths;
  public UUID locationId;
  public UUID departmentId;
  public UUID supplierId;
  public UUID parentAssetId;
  public String invoiceReference;
  public String notes;
  public UUID createdBy;
  public Instant createdAt;
  public Instant updatedAt;
  @Version public long version;
}
