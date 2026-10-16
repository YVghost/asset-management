import { test, expect } from "@playwright/test";
test.use({ trace: "off" });

test("maestro administra empresas y usuarios sin ampliar el acceso de cuentas normales", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.AMS_MASTER_E2E_EMAIL,
    "Requiere una cuenta maestra configurada",
  );
  const suffix = Date.now(),
    company = `Prueba maestro E2E ${suffix}`,
    email = `prueba-maestro-${suffix}@example.test`,
    password = "E2E-Only-Password-123";
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
  await page
    .getByRole("link", { name: "Administración maestra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Administración maestra" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva organización" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre de la organización *")
    .fill(company);
  const orgResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/system/organizations") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  const org = await (await orgResponse).json();
  await expect(
    page.getByRole("cell", { name: company, exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Usuarios del sistema", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Nuevo usuario", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre completo *")
    .fill("Usuario prueba maestro");
  await page
    .getByRole("dialog")
    .getByLabel("Correo *", { exact: true })
    .fill(email);
  await page
    .getByRole("dialog")
    .getByLabel("Contraseña inicial *")
    .fill(password);
  const userResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/system/users") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar", exact: true })
    .click();
  const user = await (await userResponse).json();
  try {
    await page.getByLabel("Buscar en administración maestra").fill(email);
    await page
      .getByRole("button", { name: "Empresas y permisos", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Empresa *", { exact: true })
      .selectOption(org.id);
    await page
      .getByRole("dialog")
      .getByLabel("Rol en la empresa")
      .selectOption("ORG_ADMIN");
    const assigned = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/system/users/${user.id}/memberships`) &&
        r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Guardar acceso" }).click();
    expect((await assigned).status()).toBe(204);
    await expect(
      page
        .getByRole("dialog")
        .getByRole("cell", { name: company, exact: true }),
    ).toBeVisible();
    await page.getByRole("dialog").getByText("Cerrar", { exact: true }).click();
    const tenant = await browser.newContext();
    const tenantPage = await tenant.newPage();
    try {
      await tenantPage.goto(process.env.AMS_E2E_URL || "http://localhost:3000");
      await tenantPage.getByLabel("Correo empresarial").fill(email);
      await tenantPage.getByLabel("Contraseña", { exact: true }).fill(password);
      await tenantPage
        .getByRole("button", { name: "Entrar al espacio de trabajo" })
        .click();
      await expect(tenantPage.getByLabel("Organización activa")).toHaveValue(
        org.id,
      );
      await expect(
        tenantPage.getByLabel("Organización activa").locator("option"),
      ).toHaveCount(1);
      await expect(
        tenantPage.getByRole("link", {
          name: "Administración maestra",
          exact: true,
        }),
      ).toHaveCount(0);
      const denied = await tenantPage.request.get("/api/v1/system/users");
      expect(denied.status()).toBe(403);
    } finally {
      await tenant.close();
    }
    await page.screenshot({
      path: "test-results/master-admin.png",
      fullPage: true,
    });
  } finally {
    const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
    const headers = { [csrf.headerName]: csrf.token };
    await page.request.put(`/api/v1/system/users/${user.id}`, {
      headers,
      data: {
        email,
        fullName: "Usuario prueba maestro",
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
