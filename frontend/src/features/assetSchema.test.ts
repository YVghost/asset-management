import { describe, it, expect } from "vitest";
import { assetSchema, blankAsset } from "./assetSchema";
const valid = {
  ...blankAsset,
  assetCode: "HW-001",
  name: "Laptop",
  categoryId: "category",
};
describe("Registro de activos", () => {
  it("permite periféricos sin procesador o RAM", () =>
    expect(assetSchema.safeParse(valid).success).toBe(true));
  it("requiere código, nombre y categoría", () => {
    const result = assetSchema.safeParse(blankAsset);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((i) => i.path[0])).toEqual(
        expect.arrayContaining(["assetCode", "name", "categoryId"]),
      );
  });
  it("rechaza costos negativos y fracciones de meses", () => {
    expect(
      assetSchema.safeParse({ ...valid, acquisitionCost: "-20" }).success,
    ).toBe(false);
    expect(
      assetSchema.safeParse({ ...valid, usefulLifeMonths: "1.5" }).success,
    ).toBe(false);
  });
  it("rechaza entrada en servicio previa a compra", () =>
    expect(
      assetSchema.safeParse({
        ...valid,
        acquisitionDate: "2025-02-01",
        inServiceDate: "2025-01-01",
      }).success,
    ).toBe(false));
  it("valida vencimiento digital y puestos", () => {
    expect(
      assetSchema.safeParse({
        ...valid,
        assetKind: "DIGITAL",
        activationDate: "2025-03-01",
        expirationDate: "2025-01-01",
      }).success,
    ).toBe(false);
    expect(assetSchema.safeParse({ ...valid, seats: "0" }).success).toBe(false);
  });
  it("normaliza los campos opcionales", () => {
    const result = assetSchema.parse(valid);
    expect(result.locationId).toBeNull();
    expect(result.usefulLifeMonths).toBeNull();
    expect(result.acquisitionCost).toBeNull();
  });
});
