import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("categorías propias, custodia empresarial y responsables opcionales", async ({
  page,
}) => {
  test.skip(
    !process.env.AMS_MASTER_E2E_EMAIL,
    "Requiere credenciales de preparación",
  );
  const tag = Date.now();
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
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json(),
    headers = { [csrf.headerName]: csrf.token };
  const name = `QA categorías ${tag}`;
  const created = await page.request.post("/api/v1/system/organizations", {
    headers,
    data: { name, active: true },
  });
  expect(created.ok()).toBe(true);
  const org = await created.json();
  try {
    await page.reload();
    await page.getByLabel("Organización activa").selectOption(org.id);
    const employeeResponse = await page.request.post(
      `/api/v1/organizations/${org.id}/employees`,
      {
        headers,
        data: {
          employeeCode: "RESP-1",
          firstName: "Ana",
          lastName: "Custodia",
          active: true,
        },
      },
    );
    expect(employeeResponse.ok()).toBe(true);
    const employee = await employeeResponse.json();
    const categoryName = `Equipo especial ${tag}`;
    await page.goto("/assets/new");
    await expect(
      page
        .getByLabel("Categoría *", { exact: true })
        .locator("option")
        .filter({ hasText: "Laptops" }),
    ).toHaveCount(1);
    await expect(
      page.getByLabel("Este activo tiene un responsable específico"),
    ).not.toBeChecked();
    await page.getByLabel("Código de inventario *").fill(`ORG-${tag}`);
    await page
      .getByLabel("Nombre del activo *")
      .fill("Hardware de organización");
    await page
      .getByLabel("Categoría *", { exact: true })
      .selectOption("__other__");
    await page.getByLabel("Nombre de la nueva categoría").fill(categoryName);
    await page
      .getByRole("button", { name: "Añadir categoría", exact: true })
      .click();
    await expect(
      page.getByLabel("Categoría *", { exact: true }).locator("option:checked"),
    ).toHaveText(categoryName);
    await page
      .getByLabel("Lugar de almacenamiento (bodega, estante o puesto)")
      .fill("Bodega / estante 3");
    let saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/hardware-assets") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Guardar activo" }).click();
    const hardware = await (await saved).json();
    expect(hardware.employee_id).toBeNull();
    await expect(
      page.getByRole("heading", {
        name: "Custodia de la organización",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Bodega / estante 3", { exact: true }),
    ).toBeVisible();
    await page.goto("/assets/new");
    await page.getByLabel("Código de inventario *").fill(`PERSON-${tag}`);
    await page
      .getByLabel("Nombre del activo *")
      .fill("Hardware con responsable");
    await page
      .getByLabel("Categoría *", { exact: true })
      .selectOption({ label: categoryName });
    await page
      .getByLabel("Este activo tiene un responsable específico")
      .check();
    await page.getByRole("button", { name: "Guardar activo" }).click();
    await expect(
      page.getByText("Selecciona un responsable", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Asignar ahora *").selectOption(employee.id);
    saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/hardware-assets") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Guardar activo" }).click();
    const assigned = await (await saved).json();
    expect(assigned.employee_id).toBe(employee.id);
    expect(assigned.status).toBe("ASSIGNED");
    await page.goto("/assets/new?kind=DIGITAL");
    await page.getByLabel("Código de inventario *").fill(`DIG-${tag}`);
    await page
      .getByLabel("Nombre del activo *")
      .fill("Servicio digital corporativo");
    await page
      .getByLabel("Categoría *", { exact: true })
      .selectOption({ label: "Suscripciones SaaS" });
    await expect(page.getByLabel("Ubicación física")).toHaveCount(0);
    await page
      .getByLabel("Portal o referencia de gestión (sin credenciales)")
      .fill("https://admin.example.test");
    await page
      .getByLabel("Este activo tiene un responsable específico")
      .check();
    await page
      .getByLabel("Responsable administrativo *")
      .selectOption(employee.id);
    saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/digital-assets") && r.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Guardar activo" }).click();
    const digital = await (await saved).json();
    expect(digital.digital.management_url).toBe("https://admin.example.test");
    expect(digital.employee_id).toBe(employee.id);
    await page.goto(`/assets/${digital.id}/edit`);
    await expect(
      page.getByLabel("Este activo tiene un responsable específico"),
    ).toBeChecked();
    await page
      .getByLabel("Este activo tiene un responsable específico")
      .uncheck();
    saved = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/digital-assets/${digital.id}`) &&
        r.request().method() === "PUT",
    );
    await page.getByRole("button", { name: "Guardar activo" }).click();
    expect((await (await saved).json()).employee_id).toBeNull();
    await expect(
      page.getByRole("heading", {
        name: "Custodia de la organización",
        exact: true,
      }),
    ).toBeVisible();
  } finally {
    await page.request.put(`/api/v1/system/organizations/${org.id}`, {
      headers,
      data: { name, active: false },
    });
  }
});
