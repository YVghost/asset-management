package com.assetmanager.asset;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface AssetRepository extends JpaRepository<Asset, UUID> {
  Optional<Asset> findByIdAndOrganizationId(UUID id, UUID organizationId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select a from Asset a where a.id=:id and a.organizationId=:org")
  Optional<Asset> lock(@Param("id") UUID id, @Param("org") UUID org);
}
