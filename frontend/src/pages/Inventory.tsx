import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Download,
  SlidersHorizontal,
  ArrowUpRight,
  Monitor,
  Cloud,
} from "lucide-react";
import { api, orgPath, allPages } from "../services/api";
import { useSession, useCanWrite } from "../hooks/session";
import {
  Badge,
  Loading,
  ErrorBox,
  Empty,
  Pagination,
  remaining,
} from "../components/ui";
import { statuses, type Page, type Row } from "../types";
export function Inventory({
  kind,
  assignments = false,
  reports = false,
}: {
  kind?: string;
  assignments?: boolean;
  reports?: boolean;
}) {
  const { org } = useSession(),
    write = useCanWrite();
  const [params, setParams] = useSearchParams();
  const [more, setMore] = useState(false),
    [downloadError, setDownloadError] = useState<unknown>();
  const page = Number(params.get("page") || 0);
  const filters = new URLSearchParams(params);
  if (kind) filters.set("kind", kind);
  if (assignments) filters.set("status", "ASSIGNED");
  const q = useQuery({
    queryKey: [org.id, "inventory", filters.toString()],
    queryFn: () => api<Page>(orgPath(org.id, "/assets?" + filters)),
  });
  const lookups = useQuery({
    queryKey: [org.id, "lookups"],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          [
            "categories",
            "employees",
            "departments",
            "locations",
            "suppliers",
          ].map(async (t) => [t, await allPages(org.id, "/" + t)]),
        ),
      ),
  });
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INVENTARIO Y CONTROL</span>
          <h1>
            {reports
              ? "Reportes"
              : assignments
                ? "Asignaciones"
                : kind === "HARDWARE"
                  ? "Hardware"
                  : kind === "DIGITAL"
                    ? "Activos digitales"
                    : "Inventario general"}
          </h1>
          <p>
            {assignments
              ? "Equipos entregados y responsables actuales."
              : reports
                ? "Consulta y exporta el inventario con los filtros que necesitas."
                : "Cada recurso, su ubicación y su responsable en un solo lugar."}
          </p>
        </div>
        {write && !reports && (
          <Link
            className="button"
            to={"/assets/new" + (kind ? "?kind=" + kind : "")}
          >
            <Plus size={18} />
            Registrar activo
          </Link>
        )}
      </div>
      {reports && (
        <div className="report-presets">
          {[
            ["Todo el inventario", ""],
            ["Disponibles", "status=AVAILABLE"],
            ["Vida útil próxima", "lifecycle=EXPIRING"],
            ["Vida útil superada", "lifecycle=EXCEEDED"],
            ["Licencias por vencer", "expiry=DIGITAL"],
            ["Dados de baja", "status=RETIRED"],
          ].map(([label, value]) => (
            <button
              className="button secondary"
              key={label}
              onClick={() => setParams(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <section className="panel inventory-panel">
        <div className="inventory-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar activos"
              placeholder="Buscar por nombre, código o serie…"
              value={params.get("search") || ""}
              onChange={(e) => update("search", e.target.value)}
            />
          </div>
          <select
            aria-label="Filtrar estado"
            value={params.get("status") || ""}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(statuses).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="button secondary" onClick={() => setMore(!more)}>
            <SlidersHorizontal size={16} />
            Filtros
          </button>
          <button
            className="button secondary"
            onClick={async () => {
              try {
                const f = new URLSearchParams(filters);
                f.delete("page");
                const res = await fetch(
                  "/api/v1" + orgPath(org.id, "/assets/export?" + f),
                );
                if (!res.ok)
                  throw new Error("No se pudo exportar el inventario");
                const url = URL.createObjectURL(await res.blob()),
                  a = document.createElement("a");
                a.href = url;
                a.download = "inventario.csv";
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                setDownloadError(e);
              }
            }}
          >
            <Download size={16} />
            Exportar
          </button>
        </div>
        {(more || reports) && (
          <div className="extra-filters">
            {[
              ["categoryId", "categories", "Categoría"],
              ["employeeId", "employees", "Empleado"],
              ["departmentId", "departments", "Departamento"],
              ["locationId", "locations", "Ubicación"],
            ].map(([key, table, label]) => (
              <label key={key}>
                {label}
                <select
                  value={params.get(key) || ""}
                  onChange={(e) => update(key, e.target.value)}
                >
                  <option value="">Todos</option>
                  {lookups.data?.[table]?.map((r: Row) => (
                    <option value={r.id} key={r.id}>
                      {r.name ||
                        `${r.first_name} ${r.last_name} · ${r.employee_code}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              Ciclo de vida
              <select
                value={params.get("lifecycle") || ""}
                onChange={(e) => update("lifecycle", e.target.value)}
              >
                <option value="">Todos</option>
                <option value="EXPIRING">Próximo a finalizar</option>
                <option value="EXCEEDED">Vida útil superada</option>
              </select>
            </label>
            <label>
              Ordenar
              <select
                value={params.get("sort") || "createdAt"}
                onChange={(e) => update("sort", e.target.value)}
              >
                <option value="createdAt">Más recientes</option>
                <option value="name">Nombre</option>
                <option value="assetCode">Código</option>
                <option value="status">Estado</option>
              </select>
            </label>
            <label>
              Dirección
              <select
                value={params.get("direction") || "desc"}
                onChange={(e) => update("direction", e.target.value)}
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </label>
            <button className="text-link" onClick={() => setParams({})}>
              Limpiar filtros
            </button>
          </div>
        )}
        {downloadError ? <ErrorBox error={downloadError} /> : null}
        {lookups.error ? <ErrorBox error={lookups.error} /> : null}
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} />
        ) : q.data.content.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ACTIVO</th>
                  <th>CATEGORÍA</th>
                  <th>ESTADO</th>
                  <th>RESPONSABLE</th>
                  <th>UBICACIÓN</th>
                  <th>ANTIGÜEDAD</th>
                  <th>VIDA ÚTIL RESTANTE</th>
                  <th>
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {q.data.content.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={"/assets/" + a.id} className="asset-cell">
                        <span
                          className={
                            "asset-icon " +
                            (a.asset_kind === "DIGITAL" ? "purple" : "")
                          }
                        >
                          {a.asset_kind === "HARDWARE" ? (
                            <Monitor size={18} />
                          ) : (
                            <Cloud size={18} />
                          )}
                        </span>
                        <span>
                          <strong>{a.name}</strong>
                          <small>
                            {a.asset_code}{" "}
                            {a.brand && `· ${a.brand} ${a.model || ""}`}
                          </small>
                          {a.serial_number && (
                            <small>S/N {a.serial_number}</small>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td>
                      {a.category_name}
                      <small>
                        {a.asset_kind === "HARDWARE" ? "Hardware" : "Digital"}
                      </small>
                    </td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>
                      {a.assigned_employee || "Sin asignar"}
                      {a.employee_code && <small>{a.employee_code}</small>}
                    </td>
                    <td>
                      {a.location_name || "—"}
                      <small>{a.department_name}</small>
                    </td>
                    <td>{remaining(a.lifecycle.ageDays)}</td>
                    <td>
                      <span
                        className={
                          a.lifecycle.state === "EXCEEDED" ? "text-warning" : ""
                        }
                      >
                        {remaining(a.lifecycle.remainingDays)}
                      </span>
                      {a.lifecycle.consumedPercent != null && (
                        <div className="life-track">
                          <i
                            className={a.lifecycle.state.toLowerCase()}
                            style={{ width: a.lifecycle.consumedPercent + "%" }}
                          />
                        </div>
                      )}
                    </td>
                    <td>
                      <Link to={"/assets/" + a.id} aria-label={"Ver " + a.name}>
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No se encontraron activos</Empty>
        )}
        <Pagination
          page={page}
          total={q.data?.totalElements || 0}
          setPage={(p) => update("page", String(p))}
        />
      </section>
    </>
  );
}
