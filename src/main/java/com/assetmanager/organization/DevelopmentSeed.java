package com.assetmanager.organization;

import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile("dev")
@ConditionalOnProperty(name = "ams.demo.enabled", havingValue = "true")
public class DevelopmentSeed implements CommandLineRunner {
  private final JdbcTemplate db;
  private final PasswordEncoder passwords;
  private final String email, password;

  public DevelopmentSeed(
      JdbcTemplate db,
      PasswordEncoder passwords,
      @Value("${ams.demo.email}") String email,
      @Value("${ams.demo.password}") String password) {
    this.db = db;
    this.passwords = passwords;
    this.email = email;
    this.password = password;
  }

  public static UUID key(String value) {
    return UUID.nameUUIDFromBytes(
        ("ams-demo:" + value).getBytes(java.nio.charset.StandardCharsets.UTF_8));
  }

  @Override
  @Transactional
  public void run(String... args) {
    if (password.length() < 12
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalStateException(
          "DEMO_PASSWORD debe tener al menos 12 caracteres y máximo 72 bytes");
    db.execute("select pg_advisory_xact_lock(1091294001)");
    UUID org = key("org"), user = key("user");
    if (db.queryForObject("select count(*) from organizations where id=?", Long.class, org) > 0)
      return;
    db.update(
        "insert into organizations(id,name,legal_name) values(?,? ,?)",
        org,
        "Empresa Demo IT",
        "Empresa Demo IT S.A.");
    db.update(
        "insert into app_users(id,email,password_hash,full_name,system_admin) values(?,?,?,?,true)",
        user,
        email.toLowerCase(Locale.ROOT),
        passwords.encode(password),
        "Administrador Demo");
    db.update(
        "insert into organization_memberships(id,organization_id,user_id,role)"
            + " values(?,?,?,'ORG_ADMIN')",
        key("membership"),
        org,
        user);
    String[] departments = {"IT", "Finanzas", "Administración", "Recursos Humanos"};
    for (String name : departments)
      db.update(
          "insert into departments(id,organization_id,name) values(?,?,?)", key(name), org, name);
    for (String name :
        List.of("Oficina principal", "Bodega", "Sala de reuniones", "Soporte técnico"))
      db.update(
          "insert into locations(id,organization_id,name) values(?,?,?)", key(name), org, name);
    for (String name : List.of("Dell Ecuador", "Microsoft", "Adobe", "Proveedor de dominios"))
      db.update(
          "insert into suppliers(id,organization_id,name) values(?,?,?)", key(name), org, name);
    List<String> hardware =
        List.of(
            "Computadoras de escritorio",
            "Laptops",
            "Monitores",
            "Teclados",
            "Mouse",
            "Impresoras",
            "Escáneres",
            "Servidores",
            "Routers",
            "Switches",
            "Access points",
            "Teléfonos corporativos",
            "Tablets",
            "Discos duros externos",
            "UPS",
            "Docking stations",
            "Proyectores",
            "Cámaras web",
            "Audífonos corporativos",
            "Otros periféricos");
    List<String> digital =
        List.of(
            "Licencias de software",
            "Suscripciones SaaS",
            "Dominios",
            "Certificados SSL",
            "Software adquirido",
            "Servicios cloud",
            "Otros activos digitales");
    for (String name : hardware)
      db.update(
          "insert into asset_categories(id,organization_id,name,asset_kind)"
              + " values(?,?,?,'HARDWARE')",
          key(name),
          org,
          name);
    for (String name : digital)
      db.update(
          "insert into asset_categories(id,organization_id,name,asset_kind)"
              + " values(?,?,?,'DIGITAL')",
          key(name),
          org,
          name);
    String[][] employees = {
      {"Ana", "Torres"},
      {"Carlos", "Mendoza"},
      {"María", "Vega"},
      {"Diego", "Ruiz"},
      {"Lucía", "Paredes"},
      {"Andrés", "Castro"}
    };
    for (int i = 0; i < employees.length; i++)
      db.update(
          "insert into"
              + " employees(id,organization_id,employee_code,first_name,last_name,email,department_id,location_id,job_title)"
              + " values(?,?,?,?,?,?,?,?,?)",
          key("employee" + i),
          org,
          "EMP-00" + (i + 1),
          employees[i][0],
          employees[i][1],
          "empleado" + (i + 1) + "@demo.local",
          key(departments[i % 4]),
          key("Oficina principal"),
          i % 2 == 0 ? "Analista" : "Coordinador");
    String[] categories = {
      "Laptops",
      "Laptops",
      "Laptops",
      "Laptops",
      "Computadoras de escritorio",
      "Computadoras de escritorio",
      "Monitores",
      "Monitores",
      "Monitores",
      "Teclados",
      "Teclados",
      "Teclados",
      "Mouse",
      "Mouse",
      "Impresoras",
      "Routers",
      "Licencias de software",
      "Suscripciones SaaS",
      "Dominios"
    };
    String[] names = {
      "Dell Latitude 5450",
      "Lenovo ThinkPad T14",
      "HP EliteBook 840",
      "Dell Latitude 5440",
      "Dell OptiPlex 7010",
      "HP ProDesk 400",
      "Monitor Dell P2422H",
      "Monitor LG 24MP400",
      "Monitor Samsung S24",
      "Teclado Logitech K120",
      "Teclado Dell KB216",
      "Teclado Logitech MX Keys",
      "Mouse Logitech M185",
      "Mouse Dell MS116",
      "Impresora HP LaserJet",
      "Router TP-Link Archer",
      "Microsoft 365 Business",
      "Adobe Creative Cloud",
      "Dominio empresa-demo.com"
    };
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    for (int i = 0; i < names.length; i++) {
      UUID id = key("asset" + i);
      boolean isDigital = i >= 16;
      LocalDate start =
          i == 0
              ? today.minusMonths(46)
              : i == 1 ? today.minusMonths(60) : today.minusMonths(4L + i);
      String status = i < 8 ? "ASSIGNED" : i == 14 ? "IN_MAINTENANCE" : "AVAILABLE";
      db.update(
          "insert into"
              + " assets(id,organization_id,asset_code,name,asset_kind,category_id,status,acquisition_date,acquisition_cost,currency,in_service_date,useful_life_months,location_id,department_id,supplier_id,created_by)"
              + " values(?,?,?,?,?,?,?,?,?,'USD',?,?,?,?,?,?)",
          id,
          org,
          (isDigital ? "DIG-" : "HW-") + String.format("%04d", i + 1),
          names[i],
          isDigital ? "DIGITAL" : "HARDWARE",
          key(categories[i]),
          status,
          start.minusDays(5),
          new java.math.BigDecimal(i < 6 ? "1250.00" : isDigital ? "299.00" : "95.00"),
          start,
          48,
          key("Oficina principal"),
          key(departments[i % 4]),
          key(
              isDigital
                  ? i == 16 ? "Microsoft" : i == 17 ? "Adobe" : "Proveedor de dominios"
                  : "Dell Ecuador"),
          user);
      if (isDigital)
        db.update(
            "insert into"
                + " digital_asset_details(asset_id,organization_id,product,license_type,activation_date,expiration_date,renewal_cost,seats)"
                + " values(?,?,?,?,?,?,?,?)",
            id,
            org,
            names[i],
            i == 18 ? "Dominio" : "Suscripción",
            today.minusMonths(11),
            today.plusDays(i == 16 ? 12 : i == 17 ? 25 : 80),
            new java.math.BigDecimal("299.00"),
            i == 18 ? 1 : 10);
      else
        db.update(
            "insert into"
                + " hardware_asset_details(asset_id,organization_id,brand,model,serial_number,warranty_end_date,specifications)"
                + " values(?,?,?,?,?,?,?::jsonb)",
            id,
            org,
            names[i].split(" ")[0],
            names[i].substring(names[i].indexOf(' ') + 1),
            "DEMO-SN-" + (i + 1),
            today.plusDays(i == 2 ? 15 : 180),
            i < 6
                ? "{\"processor\":\"Intel Core i7\",\"ram\":\"16 GB\",\"storage\":\"512"
                    + " GB\",\"storageType\":\"SSD\",\"operatingSystem\":\"Windows 11 Pro\"}"
                : "{}");
      if (i < 8)
        db.update(
            "insert into"
                + " asset_assignments(id,organization_id,asset_id,employee_id,department_id,assigned_at,assigned_by_user_id,notes)"
                + " values(?,?,?,?,?,?,?,?)",
            key("assignment" + i),
            org,
            id,
            key("employee" + (i % 6)),
            key(departments[i % 4]),
            java.sql.Timestamp.from(Instant.now().minusSeconds(86400L * (i + 1))),
            user,
            "Entrega inicial de demostración");
      db.update(
          "insert into asset_events(id,organization_id,asset_id,user_id,event_type,changes)"
              + " values(?,?,?,?,'CREATED','{\"source\":\"development-seed\"}'::jsonb)",
          key("event" + i),
          org,
          id,
          user);
    }
  }
}
