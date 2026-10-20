import { it, expect } from "vitest";
import { qrOrigin } from "./qrOrigin";
it("conserva dominio y puerto y normaliza la barra final", () => {
  expect(qrOrigin("http://192.168.1.20:3000/")).toBe(
    "http://192.168.1.20:3000",
  );
  expect(qrOrigin(" HTTPS://Activos.Example.COM ")).toBe(
    "https://activos.example.com",
  );
});
it("rechaza credenciales, scripts, rutas, consultas y fragmentos", () => {
  for (const bad of [
    "javascript:alert(1)",
    "https://user:password@example.com",
    "https://example.com/prefix",
    "https://example.com/?secret=x",
    "https://example.com/#token",
    "invalid",
  ])
    expect(qrOrigin(bad)).toBeNull();
});
