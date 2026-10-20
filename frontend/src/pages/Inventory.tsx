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
  QrCode,
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const page = Number(params.get("page") || 0);
  const filters = new URLSearchParams(params);
  if (kind) filters.set("kind", kind);
  if (assignments) filters.set("status", "ASSIGNED");
  const q = useQuery({
    queryKey: [org.id, "inventory", filters.toString()],
    queryFn: () => api<Page>(orgPath(org.id, "/assets?" + filters)),
  });
  const lookups = useQuery({
    queryKey: [org.id, "filter-lookups"],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          [
            "categories",
            "employees",
            "departments",
            "locations",
            "suppliers",
          ].map(async (t) => [t, await allPages(org.id, "/" + t, false)]),
        ),
      ),
  });
  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    if (key !== "page") setSelected(new Set());
    setParams(next);
  }
  const filterNames: Record<string, string> = {
    search: "Activo",
    status: "Estado",
    kind: "Tipo",
    categoryId: "Categoría",
    employeeId: "Empleado",
    departmentId: "Área",
    locationId: "Ubicación",
    supplierId: "Proveedor",
    person: "Persona",
    personScope: "Alcance",
    brand: "Marca",
    model: "Modelo",
    assignmentState: "Responsable",
    lifecycle: "Vida útil",
    expiry: "Vencimiento",
    dateField: "Fecha",
    from: "Desde",
    to: "Hasta",
  };
  function chipValue(key: string, value: string) {
    const table: Record<string, string> = {
      categoryId: "categories",
      employeeId: "employees",
      departmentId: "departments",
      locationId: "locations",
      supplierId: "suppliers",
    };
    const row = lookups.data?.[table[key]]?.find((r: Row) => r.id === value);
    return row
      ? row.name || `${row.first_name} ${row.last_name}`
      : statuses[value] ||
          (
            {
              CURRENT: "Actual",
              HISTORY: "Anterior",
              ANY: "Actual o anterior",
              UNASSIGNED: "Sin responsable",
              HARDWARE: "Hardware",
              DIGITAL: "Digital",
              ASSIGNED: "Con responsable",
              EXPIRING: "Próxima a finalizar",
              EXCEEDED: "Superada",
              NOT_CALCULABLE: "Sin datos",
              WARRANTY: "Garantía",
              EXPIRATION: "Vencimiento digital",
              ACQUISITION: "Compra",
              RETURNED: "Devolución",
            } as Record<string, string>
          )[value] ||
          value;
  }
  function select(id: string, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked && next.size < 100) next.add(id);
      else if (!checked) next.delete(id);
      return next;
    });
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
              placeholder="Nombre, código, serie, marca o modelo…"
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
                      {r.active === false ? " (inactivo)" : ""}
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
                <option value="CURRENT">Vigente</option>
                <option value="EXPIRING">Próximo a finalizar</option>
                <option value="EXCEEDED">Vida útil superada</option>
                <option value="NOT_CALCULABLE">
                  Sin información suficiente
                </option>
              </select>
            </label>
            {!kind && (
              <label>
                Tipo de activo
                <select
                  value={params.get("kind") || ""}
                  onChange={(e) => update("kind", e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="HARDWARE">Hardware</option>
                  <option value="DIGITAL">Digital</option>
                </select>
              </label>
            )}
            <label>
              Buscar persona o código
              <input
                value={params.get("person") || ""}
                placeholder="Nombre, apellido o código…"
                onChange={(e) => update("person", e.target.value)}
              />
            </label>
            <label>
              Personas y movimientos
              <select
                value={params.get("personScope") || "CURRENT"}
                onChange={(e) => update("personScope", e.target.value)}
              >
                <option value="CURRENT">Actualmente a cargo</option>
                <option value="HISTORY">Tuvo asignado anteriormente</option>
                <option value="ANY">Actual o anterior</option>
              </select>
            </label>
            <label>
              Asignación / responsable
              <select
                value={params.get("assignmentState") || ""}
                onChange={(e) => update("assignmentState", e.target.value)}
              >
                <option value="">Todos</option>
                <option value="ASSIGNED">Con responsable</option>
                <option value="UNASSIGNED">Sin responsable</option>
              </select>
            </label>
            <label>
              Marca
              <input
                value={params.get("brand") || ""}
                onChange={(e) => update("brand", e.target.value)}
              />
            </label>
            <label>
              Modelo
              <input
                value={params.get("model") || ""}
                onChange={(e) => update("model", e.target.value)}
              />
            </label>
            <label>
              Proveedor
              <select
                value={params.get("supplierId") || ""}
                onChange={(e) => update("supplierId", e.target.value)}
              >
                <option value="">Todos</option>
                {lookups.data?.suppliers?.map((r: Row) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vencimientos próximos
              <select
                value={params.get("expiry") || ""}
                onChange={(e) => update("expiry", e.target.value)}
              >
                <option value="">Todos</option>
                <option value="WARRANTY">Garantía · 30 días</option>
                <option value="DIGITAL">Licencias · 30 días</option>
              </select>
            </label>
            <label>
              Campo de fecha
              <select
                value={params.get("dateField") || "ACQUISITION"}
                onChange={(e) => {
                  if (e.target.value === "RETURNED") {
                    const next = new URLSearchParams(params);
                    next.set("dateField", "RETURNED");
                    next.set("personScope", "HISTORY");
                    next.delete("page");
                    setSelected(new Set());
                    setParams(next);
                  } else update("dateField", e.target.value);
                }}
              >
                <option value="ACQUISITION">Adquisición</option>
                <option value="ASSIGNED">Entrega</option>
                <option value="RETURNED">Devolución</option>
                <option value="WARRANTY">Fin de garantía</option>
                <option value="EXPIRATION">Vencimiento digital</option>
              </select>
            </label>
            <label>
              Desde
              <input
                type="date"
                value={params.get("from") || ""}
                onChange={(e) => update("from", e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={params.get("to") || ""}
                onChange={(e) => update("to", e.target.value)}
              />
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
            <button
              className="text-link"
              onClick={() => {
                setParams({});
                setSelected(new Set());
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
        {[...params].some(([key]) => !!filterNames[key]) && (
          <div className="filter-summary">
            <strong>Filtros aplicados</strong>
            {[...params]
              .filter(([key]) => !!filterNames[key])
              .map(([key, value]) => (
                <button
                  className="filter-chip"
                  key={key}
                  onClick={() => update(key, "")}
                  aria-label={`Quitar filtro ${filterNames[key]}`}
                >
                  {filterNames[key]}: {chipValue(key, value)} ×
                </button>
              ))}
          </div>
        )}
        {selected.size > 0 && (
          <div className="selection-bar">
            <strong>{selected.size} activos seleccionados</strong>
            <button
              className="text-link"
              onClick={() => setSelected(new Set())}
            >
              Limpiar selección
            </button>
            <Link
              className="button"
              to={"/labels?ids=" + [...selected].join(",")}
            >
              <QrCode size={18} />
              Generar etiquetas QR
            </Link>
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
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Seleccionar activos de esta página"
                      checked={
                        q.data.content.length > 0 &&
                        q.data.content.every((a) => selected.has(a.id))
                      }
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelected((previous) => {
                          const next = new Set(previous);
                          for (const a of q.data.content) {
                            if (checked && next.size < 100) next.add(a.id);
                            else if (!checked) next.delete(a.id);
                          }
                          return next;
                        });
                      }}
                    />
                  </th>
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
                      <input
                        type="checkbox"
                        aria-label={"Seleccionar " + a.asset_code}
                        checked={selected.has(a.id)}
                        onChange={(e) => select(a.id, e.target.checked)}
                      />
                    </td>
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
