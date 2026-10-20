import { z } from "zod";
const optionalId = z.string().transform((v) => v || null);
const optionalDate = z.string().transform((v) => v || null);
const money = z
  .string()
  .refine(
    (v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0),
    "Ingresa un importe positivo con hasta 2 decimales",
  )
  .transform((v) => v || null);
export const assetSchema = z
  .object({
    assetCode: z.string().trim().min(1, "El código es obligatorio").max(60),
    name: z.string().trim().min(1, "El nombre es obligatorio").max(160),
    assetKind: z.enum(["HARDWARE", "DIGITAL"]),
    categoryId: z.string().min(1, "Selecciona una categoría"),
    description: z.string(),
    acquisitionDate: optionalDate,
    acquisitionCost: money,
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "Usa un código de moneda de 3 letras"),
    inServiceDate: optionalDate,
    usefulLifeMonths: z
      .string()
      .refine(
        (v) => !v || (/^\d+$/.test(v) && Number(v) > 0 && Number(v) <= 1200),
        "Ingresa entre 1 y 1200 meses",
      )
      .transform((v) => (v ? Number(v) : null)),
    locationId: optionalId,
    departmentId: optionalId,
    supplierId: optionalId,
    invoiceReference: z.string(),
    notes: z.string(),
    employeeId: optionalId,
    brand: z.string(),
    model: z.string(),
    serialNumber: z.string(),
    patrimonialTag: z.string(),
    physicalCondition: z.string(),
    warrantyEndDate: optionalDate,
    processor: z.string(),
    ram: z.string(),
    storage: z.string(),
    storageType: z.string(),
    operatingSystem: z.string(),
    architecture: z.string(),
    hostname: z.string(),
    managementUrl: z.string().max(500),
    storagePlace: z.string().max(500),
    product: z.string(),
    licenseType: z.string(),
    contractReference: z.string(),
    activationDate: optionalDate,
    expirationDate: optionalDate,
    autoRenew: z.boolean(),
    renewalCost: money,
    seats: z
      .string()
      .refine(
        (v) => !v || (/^\d+$/.test(v) && Number(v) > 0),
        "Ingresa un número entero positivo",
      )
      .transform((v) => (v ? Number(v) : null)),
    responsibleEmployeeId: optionalId,
  })
  .superRefine((v, ctx) => {
    if (
      v.inServiceDate &&
      v.acquisitionDate &&
      v.inServiceDate < v.acquisitionDate
    )
      ctx.addIssue({
        code: "custom",
        path: ["inServiceDate"],
        message: "Debe ser posterior a la compra",
      });
    if (
      v.expirationDate &&
      v.activationDate &&
      v.expirationDate < v.activationDate
    )
      ctx.addIssue({
        code: "custom",
        path: ["expirationDate"],
        message: "Debe ser posterior a la activación",
      });
    const today = new Date().toISOString().slice(0, 10);
    for (const key of ["acquisitionDate", "inServiceDate"] as const) {
      const value = v[key];
      if (value && value > today)
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "La fecha no puede ser futura",
        });
    }
  });
export type AssetFormValues = z.input<typeof assetSchema>;
export type AssetFormOutput = z.output<typeof assetSchema>;
export const blankAsset: AssetFormValues = {
  assetCode: "",
  name: "",
  assetKind: "HARDWARE",
  categoryId: "",
  description: "",
  acquisitionDate: "",
  acquisitionCost: "",
  currency: "USD",
  inServiceDate: "",
  usefulLifeMonths: "",
  locationId: "",
  departmentId: "",
  supplierId: "",
  invoiceReference: "",
  notes: "",
  employeeId: "",
  brand: "",
  model: "",
  serialNumber: "",
  patrimonialTag: "",
  physicalCondition: "GOOD",
  warrantyEndDate: "",
  processor: "",
  ram: "",
  storage: "",
  storageType: "",
  operatingSystem: "",
  architecture: "",
  hostname: "",
  managementUrl: "",
  storagePlace: "",
  product: "",
  licenseType: "",
  contractReference: "",
  activationDate: "",
  expirationDate: "",
  autoRenew: false,
  renewalCost: "",
  seats: "",
  responsibleEmployeeId: "",
};
