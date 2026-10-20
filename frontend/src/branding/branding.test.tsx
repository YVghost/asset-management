import { it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { resolveTheme, useOrganizationBrand, type Branding } from "./index";
import { api } from "../services/api";
vi.mock("../services/api", () => ({
  api: vi.fn(),
  orgPath: (id: string, path: string) => `/organizations/${id}${path}`,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const edinun: Branding = {
  id: "edinun",
  name: "Edinun",
  theme_key: "EDINUN",
  has_logo: false,
  config: {},
};
it("mantiene un tema genérico independiente del tema Edinun", () => {
  expect(resolveTheme(edinun).primary).toBe("#006EB6");
  expect(resolveTheme().primary).toBe("#185A65");
  expect(resolveTheme().logo).toBe("");
});
it("usa el logo autenticado de la empresa y no el de otra", () => {
  expect(resolveTheme({ ...edinun, has_logo: true }).logo).toBe(
    "/api/v1/organizations/edinun/branding/logo",
  );
  expect(
    resolveTheme({
      ...edinun,
      id: "another",
      theme_key: "CUSTOM",
      config: { primary: "#493880", font: "GEORGIA" },
      has_logo: true,
    }).logo,
  ).toBe("/api/v1/organizations/another/branding/logo");
});
it("retira la identidad de Edinun al entrar al panel maestro", async () => {
  vi.mocked(api).mockResolvedValue(edinun);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { rerender } = renderHook(
    ({ neutral }) => useOrganizationBrand("edinun", neutral),
    { wrapper, initialProps: { neutral: false } },
  );
  await waitFor(() =>
    expect(document.documentElement.dataset.theme).toBe("EDINUN"),
  );
  expect(
    document.documentElement.style.getPropertyValue("--brand-primary"),
  ).toBe("#006EB6");
  rerender({ neutral: true });
  expect(document.documentElement.dataset.theme).toBe("GENERIC");
  expect(
    document.documentElement.style.getPropertyValue("--brand-primary"),
  ).toBe("#185A65");
});
