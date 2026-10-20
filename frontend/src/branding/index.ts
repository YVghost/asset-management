import { useLayoutEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, orgPath } from "../services/api";
import { genericTheme } from "./generic/theme";
import { edinunTheme } from "./edinun/theme";
export type Branding = {
  id: string;
  name: string;
  theme_key: "GENERIC" | "EDINUN" | "CUSTOM";
  has_logo: boolean;
  branding_version?: number;
  config: {
    primary?: string;
    sidebar?: string;
    background?: string;
    font?: string;
  };
};
const fonts: Record<string, string> = {
  SYSTEM: '"Segoe UI", Arial, sans-serif',
  ARIAL: "Arial, Helvetica, sans-serif",
  GEORGIA: "Georgia, serif",
};
export function resolveTheme(brand?: Branding) {
  const theme = brand?.theme_key === "EDINUN" ? edinunTheme : genericTheme;
  const config = brand?.theme_key === "CUSTOM" ? brand.config : {};
  return {
    ...theme,
    ...(config?.primary
      ? { primary: config.primary, accent: config.primary }
      : {}),
    ...(config?.sidebar ? { sidebar: config.sidebar } : {}),
    ...(config?.background ? { background: config.background } : {}),
    font: config?.font ? fonts[config.font] || genericTheme.font : theme.font,
    logo: brand?.has_logo
      ? `/api/v1/organizations/${brand.id}/branding/logo${brand.branding_version != null ? "?v=" + brand.branding_version : ""}`
      : theme.logo,
  };
}
export function useOrganizationBrand(
  org: string,
  neutral = false,
  apply = true,
) {
  const q = useQuery({
    queryKey: [org, "branding"],
    queryFn: () => api<Branding>(orgPath(org, "/branding")),
    enabled: !!org && !neutral,
  });
  const brand = neutral ? undefined : q.data;
  const theme = resolveTheme(brand);
  useLayoutEffect(() => {
    if (!apply) return;
    const root = document.documentElement;
    const vars = {
      "--brand-primary": theme.primary,
      "--brand-sidebar": theme.sidebar,
      "--brand-background": theme.background,
      "--brand-accent": theme.accent,
      "--brand-font": theme.font,
    };
    for (const [key, value] of Object.entries(vars))
      root.style.setProperty(key, value);
    root.dataset.theme = brand?.theme_key || "GENERIC";
    return () => {
      for (const key of Object.keys(vars)) root.style.removeProperty(key);
      delete root.dataset.theme;
    };
  }, [
    apply,
    brand?.theme_key,
    theme.primary,
    theme.sidebar,
    theme.background,
    theme.accent,
    theme.font,
  ]);
  return { brand, theme, error: q.error };
}
