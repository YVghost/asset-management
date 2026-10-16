package com.assetmanager;

import static org.junit.jupiter.api.Assertions.*;

import com.assetmanager.asset.*;
import com.assetmanager.assignment.AssignmentService;
import com.assetmanager.identity.AccessService;
import com.assetmanager.organization.*;
import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIf;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.postgresql.PostgreSQLContainer;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@EnabledIf("databaseAvailable")
class InventoryIntegrationTest {
  static PostgreSQLContainer container;

  static boolean databaseAvailable() {
    return System.getenv("AMS_TEST_DATABASE_URL") != null
        || DockerClientFactory.instance().isDockerAvailable();
  }

  @DynamicPropertySource
  static void properties(DynamicPropertyRegistry r) {
    String url = System.getenv("AMS_TEST_DATABASE_URL");
    if (url == null) {
      container = new PostgreSQLContainer("postgres:17.6-alpine");
      container.start();
      r.add("spring.datasource.url", container::getJdbcUrl);
      r.add("spring.datasource.username", container::getUsername);
      r.add("spring.datasource.password", container::getPassword);
    } else {
      r.add("spring.datasource.url", () -> url);
      r.add(
          "spring.datasource.username",
          () -> System.getenv().getOrDefault("AMS_TEST_DATABASE_USER", "postgres"));
      r.add(
          "spring.datasource.password",
          () -> System.getenv().getOrDefault("AMS_TEST_DATABASE_PASSWORD", ""));
    }
    r.add("ams.demo.enabled", () -> false);
  }

  @Autowired AssetService assets;
  @Autowired AssignmentService assignments;
  @Autowired AccessService access;
  @Autowired JdbcTemplate db;
  @Autowired CatalogService catalogs;
  @Autowired org.springframework.security.crypto.password.PasswordEncoder passwords;
  @Autowired com.assetmanager.shared.JsonSupport json;

  @org.springframework.beans.factory.annotation.Value("${local.server.port}")
  int port;

  UUID org, other, user, category, digitalCategory, employee, secondEmployee;
  String email;

  @BeforeEach
  void setup() {
    org = UUID.randomUUID();
    other = UUID.randomUUID();
    user = UUID.randomUUID();
    category = UUID.randomUUID();
    digitalCategory = UUID.randomUUID();
    employee = UUID.randomUUID();
    secondEmployee = UUID.randomUUID();
    email = user + "@test.local";
    db.update(
        "insert into organizations(id,name) values(?,?),(?,?)", org, "Integration", other, "Other");
    db.update(
        "insert into app_users(id,email,password_hash,full_name) values(?,?,?,?)",
        user,
        email,
        passwords.encode("Integration-Password-123"),
        "Test User");
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role)"
            + " values(?,?,?,'ORG_ADMIN')",
        UUID.randomUUID(),
        org,
        user);
    db.update(
        "insert into asset_categories(id,organization_id,name,asset_kind)"
            + " values(?,?,'Laptops','HARDWARE'),(?,?,'Licencias','DIGITAL')",
        category,
        org,
        digitalCategory,
        org);
    db.update(
        "insert into employees(id,organization_id,employee_code,first_name,last_name)"
            + " values(?,?,'E1','Ana','Torres'),(?,?,'E2','Carlos','Ruiz')",
        employee,
        org,
        secondEmployee,
        org);
    authenticate();
  }

  void authenticate() {
    SecurityContextHolder.getContext()
        .setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(email, null, List.of()));
  }

  @AfterEach
  void clear() {
    SecurityContextHolder.clearContext();
  }

  AssetInput input(String code, boolean digital) {
    return new AssetInput(
        code,
        "Test asset",
        "Description",
        digital ? "DIGITAL" : "HARDWARE",
        digital ? digitalCategory : category,
        LocalDate.of(2025, 1, 1),
        new BigDecimal("123.45"),
        null,
        "USD",
        LocalDate.of(2025, 1, 2),
        48,
        null,
        null,
        null,
        null,
        null,
        null,
        digital
            ? null
            : new AssetInput.Hardware(
                "Dell", "Latitude", "S-123", null, "GOOD", null, Map.of("ram", "16 GB")),
        digital
            ? new AssetInput.Digital(
                "Microsoft 365",
                "Subscription",
                "ref-1",
                LocalDate.of(2025, 1, 1),
                LocalDate.now().plusDays(10),
                true,
                new BigDecimal("200.00"),
                10,
                employee)
            : null,
        null);
  }

  UUID hardware() {
    return (UUID)
        assets.save(org, null, input("HW-" + UUID.randomUUID(), false), "HARDWARE").get("id");
  }

  AssignmentService.Input delivery(UUID to) {
    return new AssignmentService.Input(to, null, Instant.now().minusSeconds(5), null, "Entrega");
  }

  @Test
  void hardwareAndDigitalPersistWithDetails() {
    var h = assets.save(org, null, input("HW-1", false), "HARDWARE");
    assertEquals("Dell", ((Map<?, ?>) h.get("hardware")).get("brand"));
    assertNotNull(h.get("lifecycle"));
    var d = assets.save(org, null, input("DIG-1", true), "DIGITAL");
    assertEquals(10, ((Map<?, ?>) d.get("digital")).get("seats"));
    assertEquals(
        new BigDecimal("123.45"),
        db.queryForObject(
            "select acquisition_cost from assets where id=?", BigDecimal.class, h.get("id")));
  }

  @Test
  void duplicateCodesRejectedButReusableAcrossOrganizations() {
    assets.save(org, null, input("UNIQUE", false), "HARDWARE");
    assertThrows(
        org.springframework.dao.DataIntegrityViolationException.class,
        () -> assets.save(org, null, input("UNIQUE", false), "HARDWARE"));
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role)"
            + " values(?,?,?,'ORG_ADMIN')",
        UUID.randomUUID(),
        other,
        user);
    UUID otherCategory = UUID.randomUUID();
    db.update(
        "insert into asset_categories(id,organization_id,name,asset_kind)"
            + " values(?,?,'Laptop','HARDWARE')",
        otherCategory,
        other);
    var in = input("UNIQUE", false);
    var otherIn =
        new AssetInput(
            in.assetCode(),
            in.name(),
            in.description(),
            in.assetKind(),
            otherCategory,
            in.acquisitionDate(),
            in.acquisitionCost(),
            null,
            in.currency(),
            in.inServiceDate(),
            48,
            null,
            null,
            null,
            null,
            null,
            null,
            in.hardware(),
            null,
            null);
    assertNotNull(assets.save(other, null, otherIn, "HARDWARE"));
  }

  @Test
  void assignmentTransferAndReturnPreserveHistory() {
    UUID id = hardware();
    assignments.assign(org, id, delivery(employee), false);
    assertEquals("ASSIGNED", assets.detail(org, id).get("status"));
    assertEquals(1, ((List<?>) catalogs.employee(org, employee).get("assets")).size());
    assignments.assign(
        org,
        id,
        new AssignmentService.Input(
            secondEmployee, null, Instant.now().minusSeconds(2), null, "Transferencia"),
        true);
    assertEquals(2, assignments.history(org, id).size());
    assignments.giveBack(org, id, new AssignmentService.ReturnInput(Instant.now(), "Devuelto"));
    assertEquals("AVAILABLE", assets.detail(org, id).get("status"));
    assertEquals(2, assignments.history(org, id).size());
    assertEquals(
        0L,
        db.queryForObject(
            "select count(*) from asset_assignments where asset_id=? and returned_at is null",
            Long.class,
            id));
  }

  @Test
  void concurrentAssignmentsAllowOnlyOne() throws Exception {
    UUID id = hardware();
    var pool = Executors.newFixedThreadPool(2);
    var gate = new CountDownLatch(1);
    Callable<Boolean> task =
        () -> {
          authenticate();
          gate.await();
          try {
            assignments.assign(org, id, delivery(employee), false);
            return true;
          } catch (RuntimeException ex) {
            return false;
          } finally {
            SecurityContextHolder.clearContext();
          }
        };
    try {
      var a = pool.submit(task);
      var b = pool.submit(task);
      gate.countDown();
      assertNotEquals(a.get(15, TimeUnit.SECONDS), b.get(15, TimeUnit.SECONDS));
      assertEquals(
          1L,
          db.queryForObject(
              "select count(*) from asset_assignments where asset_id=? and returned_at is null",
              Long.class,
              id));
    } finally {
      pool.shutdownNow();
    }
  }

  @Test
  void crossOrganizationAndViewerWritesAreDenied() {
    UUID id = hardware();
    assertThrows(com.assetmanager.shared.ApiException.class, () -> assets.detail(other, id));
    db.update(
        "update organization_memberships set role='VIEWER' where organization_id=? and user_id=?",
        org,
        user);
    assertNotNull(assets.detail(org, id));
    assertThrows(
        com.assetmanager.shared.ApiException.class,
        () -> assignments.assign(org, id, delivery(employee), false));
    SecurityContextHolder.clearContext();
    assertThrows(com.assetmanager.shared.ApiException.class, () -> assets.detail(org, id));
  }

  @Test
  void crossOrganizationEmployeeAndRetiredAssetAreRejected() {
    UUID id = hardware(), outsider = UUID.randomUUID();
    db.update(
        "insert into employees(id,organization_id,employee_code,first_name,last_name)"
            + " values(?,?,'OUT','Other','Company')",
        outsider,
        other);
    assertThrows(
        com.assetmanager.shared.ApiException.class,
        () -> assignments.assign(org, id, delivery(outsider), false));
    assets.status(org, id, "RETIRED");
    assertThrows(
        com.assetmanager.shared.ApiException.class,
        () -> assignments.assign(org, id, delivery(employee), false));
    assertFalse(((List<?>) assets.detail(org, id).get("events")).isEmpty());
  }

  @Test
  void returnBeforeDeliveryIsRejected() {
    UUID id = hardware();
    assignments.assign(org, id, delivery(employee), false);
    assertThrows(
        com.assetmanager.shared.ApiException.class,
        () ->
            assignments.giveBack(
                org, id, new AssignmentService.ReturnInput(Instant.now().minusSeconds(100), null)));
    assertEquals("ASSIGNED", assets.detail(org, id).get("status"));
  }

  @Test
  void databaseEnforcesTenantForeignKeysAndCosts() {
    UUID id = hardware(), foreignLocation = UUID.randomUUID();
    db.update(
        "insert into locations(id,organization_id,name) values(?,?,'Other')",
        foreignLocation,
        other);
    assertThrows(
        org.springframework.dao.DataIntegrityViolationException.class,
        () -> db.update("update assets set location_id=? where id=?", foreignLocation, id));
    assertThrows(
        org.springframework.dao.DataIntegrityViolationException.class,
        () -> db.update("update assets set acquisition_cost=-1 where id=?", id));
  }

  @Test
  void directDatabaseAlsoPreventsDuplicateActiveAssignments() {
    UUID id = hardware();
    assignments.assign(org, id, delivery(employee), false);
    assertThrows(
        org.springframework.dao.DataIntegrityViolationException.class,
        () ->
            db.update(
                "insert into"
                    + " asset_assignments(id,organization_id,asset_id,employee_id,assigned_at,assigned_by_user_id)"
                    + " values(?,?,?,?,now(),?)",
                UUID.randomUUID(),
                org,
                id,
                secondEmployee,
                user));
  }

  @Test
  void developmentSeedIsCompleteAndIdempotent() {
    var seed =
        new DevelopmentSeed(
            db, passwords, "seed-" + UUID.randomUUID() + "@test.local", "Seed-Password-123");
    seed.run();
    UUID demo = DevelopmentSeed.key("org");
    long count =
        db.queryForObject("select count(*) from assets where organization_id=?", Long.class, demo);
    assertTrue(count >= 19);
    assertEquals(
        6L,
        db.queryForObject(
            "select count(*) from employees where organization_id=?", Long.class, demo));
    seed.run();
    assertEquals(
        count,
        db.queryForObject("select count(*) from assets where organization_id=?", Long.class, demo));
  }

  @Test
  void httpAuthenticationCsrfValidationAndTenantAuthorization() throws Exception {
    var cookies = new java.net.CookieManager();
    cookies.setCookiePolicy(java.net.CookiePolicy.ACCEPT_ALL);
    var client = java.net.http.HttpClient.newBuilder().cookieHandler(cookies).build();
    String root = "http://127.0.0.1:" + port + "/api/v1";
    assertEquals(401, http(client, root + "/auth/me", "GET", null, null).statusCode());
    assertEquals(
        403,
        http(
                client,
                root + "/auth/login",
                "POST",
                Map.of("email", email, "password", "Integration-Password-123"),
                null)
            .statusCode());
    @SuppressWarnings("unchecked")
    var token =
        (Map<String, String>)
            json.read(http(client, root + "/auth/csrf", "GET", null, null).body());
    assertEquals(
        401,
        http(
                client,
                root + "/auth/login",
                "POST",
                Map.of("email", email, "password", "wrong"),
                token.get("token"))
            .statusCode());
    assertEquals(
        200,
        http(
                client,
                root + "/auth/login",
                "POST",
                Map.of("email", email, "password", "Integration-Password-123"),
                token.get("token"))
            .statusCode());
    @SuppressWarnings("unchecked")
    var nextToken =
        (Map<String, String>)
            json.read(http(client, root + "/auth/csrf", "GET", null, null).body());
    String csrf = nextToken.get("token");
    assertEquals(
        200,
        http(client, root + "/organizations/" + org + "/assets", "GET", null, null).statusCode());
    assertEquals(
        403,
        http(client, root + "/organizations/" + other + "/assets", "GET", null, null).statusCode());
    var invalid = new HashMap<String, Object>();
    invalid.put("assetCode", "");
    invalid.put("name", "");
    invalid.put("assetKind", "HARDWARE");
    invalid.put("currency", "USD");
    invalid.put("acquisitionCost", -1);
    assertEquals(
        400,
        http(client, root + "/organizations/" + org + "/hardware-assets", "POST", invalid, csrf)
            .statusCode());
    var valid = input("HTTP-" + UUID.randomUUID(), false);
    var created =
        http(client, root + "/organizations/" + org + "/hardware-assets", "POST", valid, csrf);
    assertEquals(201, created.statusCode(), created.body());
    @SuppressWarnings("unchecked")
    var saved = (Map<String, Object>) json.read(created.body());
    assertEquals("2025-01-01", saved.get("acquisition_date"));
    var delivery =
        http(
            client,
            root + "/organizations/" + org + "/assets/" + saved.get("id") + "/assign",
            "POST",
            new AssignmentService.Input(
                employee, null, Instant.now().minusSeconds(1), null, "HTTP delivery"),
            csrf);
    assertEquals(200, delivery.statusCode(), delivery.body());
    assertEquals(
        200,
        http(client, root + "/organizations/" + org + "/dashboard", "GET", null, null)
            .statusCode());
    var exported =
        http(
            client,
            root + "/organizations/" + org + "/assets/export?status=ASSIGNED",
            "GET",
            null,
            null);
    assertEquals(200, exported.statusCode(), exported.body());
    assertTrue(exported.body().contains(valid.assetCode()));
    assertEquals(
        200,
        http(client, "http://127.0.0.1:" + port + "/v3/api-docs", "GET", null, null).statusCode());
    assertEquals(204, http(client, root + "/auth/logout", "POST", null, csrf).statusCode());
    assertEquals(401, http(client, root + "/auth/me", "GET", null, null).statusCode());
  }

  java.net.http.HttpResponse<String> http(
      java.net.http.HttpClient client, String url, String method, Object data, String csrf)
      throws Exception {
    var builder =
        java.net.http.HttpRequest.newBuilder(java.net.URI.create(url))
            .header("Content-Type", "application/json");
    if (csrf != null) builder.header("X-CSRF-TOKEN", csrf);
    return client.send(
        builder
            .method(
                method,
                data == null
                    ? java.net.http.HttpRequest.BodyPublishers.noBody()
                    : java.net.http.HttpRequest.BodyPublishers.ofString(json.write(data)))
            .build(),
        java.net.http.HttpResponse.BodyHandlers.ofString());
  }
}
