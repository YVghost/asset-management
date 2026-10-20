import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, Download, ArrowLeft, QrCode } from "lucide-react";
import { api, orgPath } from "../services/api";
import { useSession } from "../hooks/session";
import { useOrganizationBrand, resolveTheme } from "../branding";
import { ErrorBox, Loading, Empty, Field } from "../components/ui";
import type { Row } from "../types";
import { qrOrigin } from "../features/qrOrigin";

export function TrackingRedirect() {
  const { trackingId } = useParams(),
    { org, selectOrg } = useSession(),
    navigate = useNavigate();
  const q = useQuery({
    queryKey: ["tracking", trackingId],
    queryFn: () => api(`/tracking/${trackingId}`),
  });
  useEffect(() => {
    if (q.data) {
      if (org.id !== q.data.organization_id) selectOrg(q.data.organization_id);
      else navigate("/assets/" + q.data.id, { replace: true });
    }
  }, [q.data, org.id, selectOrg, navigate]);
  if (q.error) return <ErrorBox error={q.error} />;
  return <Loading />;
}
export function LabelPage() {
  const [params] = useSearchParams(),
    { org } = useSession();
  const ids = [
    ...new Set((params.get("ids") || "").split(",").filter(Boolean)),
  ];
  const q = useQuery({
    queryKey: [org.id, "labels", ...ids],
    queryFn: () =>
      Promise.all(ids.map((id) => api(orgPath(org.id, "/assets/" + id)))),
    enabled: ids.length > 0 && ids.length <= 100,
  });
  if (!ids.length)
    return (
      <Empty>Selecciona activos en el inventario para generar etiquetas</Empty>
    );
  if (ids.length > 100)
    return (
      <ErrorBox
        error={new Error("Selecciona como máximo 100 activos por lote")}
      />
    );
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  return <Labels assets={q.data} />;
}
function QR({
  asset,
  base,
  onReady,
}: {
  asset: Row;
  base: string;
  onReady: (ready: boolean) => void;
}) {
  const [svg, setSvg] = useState(""),
    [error, setError] = useState<unknown>();
  const url = base.replace(/\/$/, "") + "/a/" + asset.tracking_id;
  useEffect(() => {
    let live = true;
    onReady(false);
    setSvg("");
    setError(undefined);
    import("qrcode")
      .then((module) =>
        module.toString(url, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 4,
          width: 256,
          color: { dark: "#000000", light: "#ffffff" },
        }),
      )
      .then((svg) => {
        if (live) {
          setSvg(svg);
          onReady(true);
        }
      })
      .catch((e) => {
        if (live) setError(e);
      });
    return () => {
      live = false;
    };
  }, [url]);
  if (error) return <ErrorBox error={error} />;
  return (
    <div
      className="qr-image"
      aria-label={`QR de ${asset.asset_code}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
export function Labels({ assets }: { assets: Row[] }) {
  const { org } = useSession(),
    { brand } = useOrganizationBrand(org.id, false, false);
  const theme = resolveTheme(brand);
  const settings = useQuery({
    queryKey: ["tracking-settings"],
    queryFn: () => api("/tracking-settings"),
  });
  const [base, setBase] = useState(""),
    [ready, setReady] = useState<Record<string, boolean>>({});
  const resolvedBase =
    base || settings.data?.publicUrl || window.location.origin;
  const canonicalBase = qrOrigin(resolvedBase);
  const valid = !!canonicalBase;
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(
    resolvedBase,
  );
  async function download(asset: Row) {
    if (!canonicalBase) return;
    const qr = await import("qrcode");
    const data = await qr.toDataURL(canonicalBase + "/a/" + asset.tracking_id, {
      width: 1024,
      margin: 4,
      errorCorrectionLevel: "M",
    });
    const a = document.createElement("a");
    a.download = asset.asset_code.replace(/[^a-zA-Z0-9_-]/g, "_") + "-qr.png";
    a.href = data;
    a.click();
  }
  return (
    <div className="labels-page">
      <Link to="/assets" className="back-link no-print">
        <ArrowLeft size={16} />
        Volver al inventario
      </Link>
      <div className="page-heading no-print">
        <div>
          <span className="eyebrow">IDENTIFICACIÓN Y TRAZABILIDAD</span>
          <h1>Etiquetas de activos</h1>
          <p>
            El mismo QR abre siempre la ficha actualizada, después de iniciar
            sesión.
          </p>
        </div>
        <button
          className="button"
          disabled={!valid || !assets.every((a) => ready[a.id])}
          onClick={() => window.print()}
        >
          <Printer size={18} />
          Imprimir etiquetas
        </button>
      </div>
      <section className="panel label-settings no-print">
        <Field label="Dirección de la aplicación para los QR">
          <input
            type="url"
            value={resolvedBase}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://activos.empresa.com"
          />
        </Field>
        <p>
          Configura PUBLIC_APP_URL en el servidor para usar una dirección
          estable. No contiene contraseñas ni datos personales.
        </p>
        {!valid && (
          <ErrorBox
            error={
              new Error(
                "Usa un origen HTTP/HTTPS válido, sin rutas ni credenciales",
              )
            }
          />
        )}{" "}
        {local && (
          <p className="qr-warning">
            Esta dirección es local: al escanear desde otro dispositivo no
            abrirá este servidor. Para teléfonos, usa un dominio o una IP de red
            accesible y configura el enlace de red del frontend.
          </p>
        )}
        {settings.error ? <ErrorBox error={settings.error} /> : null}
      </section>
      <div className="label-grid">
        {canonicalBase &&
          assets.map((asset) => (
            <article className="asset-label" key={asset.id}>
              <div className="label-company">
                {theme.logo ? (
                  <img src={theme.logo} alt={org.name} />
                ) : (
                  <QrCode size={25} />
                )}
                <strong>{org.name}</strong>
              </div>
              <QR
                asset={asset}
                base={canonicalBase}
                onReady={(value) =>
                  setReady((previous) =>
                    previous[asset.id] === value
                      ? previous
                      : { ...previous, [asset.id]: value },
                  )
                }
              />
              <strong className="label-code">{asset.asset_code}</strong>
              <span>{asset.name}</span>
              <small>
                {asset.category_name}
                {asset.serial_number ? " · S/N " + asset.serial_number : ""}
              </small>
              <small>
                {asset.department_name || "Sin área"} ·{" "}
                {asset.location_name || "Sin ubicación"}
              </small>
              <span className="label-hint">
                Escanear para consultar responsable y ficha actual
              </span>
              <button
                className="button secondary no-print"
                onClick={() => download(asset)}
              >
                <Download size={16} />
                Descargar QR PNG
              </button>
            </article>
          ))}
      </div>
    </div>
  );
}
