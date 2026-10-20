import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { readFile } from "node:fs/promises";

test.use({ trace: "off" });
test("tema por empresa, historial filtrado y QR decodificado con responsable actualizado", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.AMS_MASTER_E2E_EMAIL,
    "Requiere credenciales maestras",
  );
  const tag = Date.now(),
    company = `QA identidad ${tag}`,
    code = `QR-QA-${tag}`;
  await page.goto("/");
  await page
    .getByLabel("Correo empresarial")
    .fill(process.env.AMS_MASTER_E2E_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(process.env.AMS_MASTER_E2E_PASSWORD!);
  await page
    .getByRole("button", { name: "Entrar al espacio de trabajo" })
    .click();
  await expect(
    page.getByRole("link", { name: "Administración maestra", exact: true }),
  ).toBeVisible();
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  const headers = { [csrf.headerName]: csrf.token };
  async function post(path: string, data: unknown) {
    const response = await page.request.post("/api/v1" + path, {
      headers,
      data,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.status() === 204 ? undefined : response.json();
  }
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const generic =
    me.organizations.find((o: any) => o.name === "Empresa Demo IT") ||
    me.organizations[0];
  expect(generic).toBeTruthy();
  const org = await post("/system/organizations", {
    name: company,
    active: true,
  });
  let managed: any;
  try {
    const department = await post(`/organizations/${org.id}/departments`, {
      name: "Área QA",
      active: true,
    });
    const location = await post(`/organizations/${org.id}/locations`, {
      name: "Oficina QA",
      active: true,
    });
    const first = await post(`/organizations/${org.id}/employees`, {
      employeeCode: "QA-001",
      firstName: "QA",
      lastName: "Ana",
      departmentId: department.id,
      locationId: location.id,
      active: true,
    });
    const second = await post(`/organizations/${org.id}/employees`, {
      employeeCode: "QA-002",
      firstName: "QA",
      lastName: "Carlos",
      departmentId: department.id,
      locationId: location.id,
      active: true,
    });
    await page.reload();
    await page
      .getByRole("link", { name: "Administración maestra", exact: true })
      .click();
    await page.getByLabel("Buscar en administración maestra").fill(company);
    await page
      .getByRole("button", { name: "Identidad visual", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Tema de la organización")
      .selectOption("EDINUN");
    await page
      .getByRole("button", { name: "Guardar identidad", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "GENERIC");
    await page.getByLabel("Organización activa").selectOption(org.id);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "EDINUN");
    await expect(page.locator(".organization-brand img")).toBeVisible();
    await expect(page.locator("body")).toHaveCSS(
      "font-family",
      "Arial, Helvetica, sans-serif",
    );
    await page.screenshot({
      path: "test-results/edinun-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Registrar activo", exact: true })
      .click();
    await page.getByLabel("Código de inventario *").fill(code);
    await page
      .getByLabel("Nombre del activo *")
      .fill("Laptop QA de trazabilidad");
    await page
      .getByLabel("Categoría *", { exact: true })
      .selectOption({ label: "Laptops" });
    await page.getByLabel("Marca", { exact: true }).fill("Dell");
    await page.getByLabel("Modelo", { exact: true }).fill("Latitude QA");
    await page
      .getByLabel("Departamento", { exact: true })
      .selectOption(department.id);
    await page.getByLabel("Ubicación física").selectOption(location.id);
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/hardware-assets") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Guardar activo" }).click();
    const asset = await (await saved).json();
    await expect(
      page.getByRole("heading", { name: "Laptop QA de trazabilidad" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Asignar a empleado" }).click();
    await page
      .getByRole("dialog")
      .getByLabel("Empleado *", { exact: true })
      .selectOption(first.id);
    await page.getByRole("button", { name: "Confirmar movimiento" }).click();
    await expect(
      page.getByRole("heading", { name: "QA Ana", exact: true }),
    ).toBeVisible();
    await post(`/organizations/${org.id}/assets/${asset.id}/transfer`, {
      employeeId: second.id,
      assignedAt: new Date().toISOString(),
      departmentId: department.id,
      notes: "Transferencia QA",
    });
    const inactive = await page.request.put(
      `/api/v1/organizations/${org.id}/employees/${first.id}`,
      {
        headers,
        data: {
          employeeCode: "QA-001",
          firstName: "QA",
          lastName: "Ana",
          departmentId: department.id,
          locationId: location.id,
          active: false,
        },
      },
    );
    expect(inactive.ok(), await inactive.text()).toBe(true);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "QA Carlos", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Etiqueta QR", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Imprimir etiquetas" }),
    ).toBeEnabled();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "Descargar QR PNG" }).click();
    const downloaded = await downloading;
    const png = PNG.sync.read(await readFile((await downloaded.path())!));
    const decoded = jsQR(
      new Uint8ClampedArray(png.data),
      png.width,
      png.height,
    );
    expect(decoded?.data).toBe(
      new URL(`/a/${asset.tracking_id}`, page.url()).href,
    );
    expect(decoded?.data).not.toContain("Carlos");
    await page.emulateMedia({ media: "print" });
    await expect(page.locator(".sidebar")).toHaveCSS("display", "none");
    await page.pdf({
      path: "test-results/etiqueta-qr.pdf",
      format: "A4",
      printBackground: true,
    });
    await page.emulateMedia({ media: "screen" });
    await page.getByLabel("Organización activa").selectOption(generic.id);
    await page.goto(decoded!.data);
    await expect(
      page.getByRole("heading", { name: "QA Carlos", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Organización activa")).toHaveValue(org.id);
    await page.goto("/assets");
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
    await page.getByLabel("Buscar persona o código").fill("QA Ana");
    await expect(
      page.getByText("No se encontraron activos", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Personas y movimientos").selectOption("HISTORY");
    await expect(
      page.getByRole("option", {
        name: "QA Ana · QA-001 (inactivo)",
        exact: true,
      }),
    ).toHaveCount(1);
    await expect(
      page.getByRole("link", { name: /Laptop QA de trazabilidad/ }).first(),
    ).toBeVisible();
    const csvDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar", exact: true }).click();
    const csv = await readFile((await (await csvDownload).path())!, "utf8");
    expect(csv).toContain(code);
    expect(csv).toContain("QA Carlos");
    await page
      .getByRole("checkbox", { name: `Seleccionar ${code}`, exact: true })
      .check();
    await page.getByRole("link", { name: "Generar etiquetas QR" }).click();
    await expect(
      page.getByRole("button", { name: "Imprimir etiquetas" }),
    ).toBeEnabled();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".sidebar")).toHaveCSS(
      "transform",
      "matrix(1, 0, 0, 1, -235, 0)",
    );
    await page.screenshot({
      path: "test-results/edinun-etiqueta-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.getByLabel("Organización activa").selectOption(generic.id);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "GENERIC");
    await expect(page.locator(".organization-brand img")).toHaveCount(0);
    await page.screenshot({
      path: "test-results/generic-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("link", { name: "Administración maestra", exact: true })
      .click();
    await page.getByLabel("Buscar en administración maestra").fill(company);
    await page
      .getByRole("button", { name: "Identidad visual", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Tema de la organización")
      .selectOption("CUSTOM");
    await page.getByLabel("Color de botones").fill("#59358f");
    await page.getByLabel("Fondo del menú").fill("#24143c");
    await page.getByLabel("Fondo de páginas").fill("#f7f4fc");
    await page
      .getByLabel("Tipografía", { exact: true })
      .selectOption("GEORGIA");
    await page
      .getByLabel(/Logo propio/)
      .setInputFiles("src/branding/edinun/assets/logo.png");
    await page
      .getByRole("button", { name: "Guardar identidad", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Organización activa").selectOption(org.id);
    await page.goto("/assets");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "CUSTOM");
    await expect(page.locator("body")).toHaveCSS(
      "font-family",
      "Georgia, serif",
    );
    await expect(page.locator(".organization-brand img")).toHaveAttribute(
      "src",
      new RegExp(`/organizations/${org.id}/branding/logo`),
    );
    await page.screenshot({
      path: "test-results/custom-theme-desktop.png",
      fullPage: true,
    });
    managed = await post("/system/users", {
      email: `qa-identity-${tag}@example.test`,
      fullName: "QA usuario aislado",
      password: "QA-Only-Password-123",
      active: true,
      systemAdmin: false,
    });
    await post(`/system/users/${managed.id}/memberships`, {
      organizationId: generic.id,
      role: "ORG_ADMIN",
    });
    const tenant = await browser.newContext();
    try {
      const tenantPage = await tenant.newPage();
      await tenantPage.goto(new URL("/", page.url()).href);
      await tenantPage.getByLabel("Correo empresarial").fill(managed.email);
      await tenantPage
        .getByLabel("Contraseña", { exact: true })
        .fill("QA-Only-Password-123");
      await tenantPage
        .getByRole("button", { name: "Entrar al espacio de trabajo" })
        .click();
      await expect(tenantPage.getByLabel("Organización activa")).toHaveValue(
        generic.id,
      );
      expect(
        (
          await tenantPage.request.get(`/api/v1/tracking/${asset.tracking_id}`)
        ).status(),
      ).toBe(404);
      expect(
        (
          await tenantPage.request.get(
            `/api/v1/organizations/${org.id}/branding`,
          )
        ).status(),
      ).toBe(403);
    } finally {
      await tenant.close();
    }
  } finally {
    if (managed)
      await page.request.put(`/api/v1/system/users/${managed.id}`, {
        headers,
        data: {
          email: managed.email,
          fullName: "QA usuario aislado",
          active: false,
          systemAdmin: false,
        },
      });
    await page.request.put(`/api/v1/system/organizations/${org.id}`, {
      headers,
      data: { name: company, active: false },
    });
  }
});
