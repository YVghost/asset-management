import { test, expect } from "@playwright/test";
test("registro, edición, asignación, devolución y activo digital desde el navegador", async ({
  page,
}) => {
  const code = "E2E-" + Date.now();
  await page.goto("/");
  await page.getByLabel("Correo empresarial").fill(process.env.AMS_E2E_EMAIL!);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill(process.env.AMS_E2E_PASSWORD!);
  await page
    .getByRole("button", { name: "Entrar al espacio de trabajo" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Todo bajo control." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Registrar activo" }).click();
  await page.getByLabel("Código de inventario *").fill(code);
  await page
    .getByLabel("Nombre del activo *")
    .fill("Laptop de prueba de navegador");
  await page
    .getByLabel("Categoría *", { exact: true })
    .selectOption({ label: "Laptops" });
  await page.getByLabel("Marca", { exact: true }).fill("Dell");
  await page.getByLabel("Modelo", { exact: true }).fill("Latitude E2E");
  await page.getByLabel("Número de serie").fill(code + "-SN");
  await page.getByLabel("Fecha de adquisición").fill("2025-01-01");
  await page.getByLabel("Entrada en servicio").fill("2025-01-02");
  await page.getByLabel("Vida útil estimada (meses)").fill("48");
  await page.getByRole("button", { name: "Guardar activo" }).click();
  await expect(
    page.getByRole("heading", { name: "Laptop de prueba de navegador" }),
  ).toBeVisible();
  await expect(
    page.getByText("Vida útil vigente", { exact: true }),
  ).toBeVisible();
  const assetUrl = page.url();
  await page.getByRole("link", { name: "Editar activo" }).click();
  await expect(page.getByLabel("Fecha de adquisición")).toHaveValue(
    "2025-01-01",
  );
  await page.getByLabel("Observaciones").fill("Editado desde prueba E2E");
  await page.getByRole("button", { name: "Guardar activo" }).click();
  await expect(
    page.getByText("Editado desde prueba E2E", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Asignar a empleado" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Empleado *", { exact: true })
    .selectOption({ label: "Ana Torres · EMP-001" });
  await page.getByRole("button", { name: "Confirmar movimiento" }).click();
  await expect(
    page.getByRole("heading", { name: "Ana Torres", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver ficha del empleado" }).click();
  await expect(
    page.getByRole("link", {
      name: "Laptop de prueba de navegador",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto(assetUrl);
  await page.getByRole("button", { name: "Registrar devolución" }).click();
  await page.getByRole("button", { name: "Confirmar movimiento" }).click();
  await expect(
    page.getByRole("heading", { name: "Sin asignar", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Devolución registrada", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Laptop de prueba de navegador" }),
  ).toBeVisible();
  await page.goto("/assets/new?kind=DIGITAL");
  await page.getByLabel("Código de inventario *").fill(code + "-DIG");
  await page
    .getByLabel("Nombre del activo *")
    .fill("Licencia de navegador E2E");
  await page
    .getByLabel("Categoría *", { exact: true })
    .selectOption({ label: "Licencias de software" });
  await page.getByLabel("Producto o servicio").fill("Servicio de prueba");
  await page
    .getByLabel("Vencimiento", { exact: true })
    .fill(new Date(Date.now() + 864000000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Guardar activo" }).click();
  await expect(
    page.getByRole("heading", { name: "Licencia de navegador E2E" }),
  ).toBeVisible();
  await page.goto("/assets?expiry=DIGITAL");
  await expect(
    page.getByRole("link", { name: /Licencia de navegador E2E/ }).first(),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Todo bajo control." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".sidebar")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, -235, 0)",
  );
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
});
