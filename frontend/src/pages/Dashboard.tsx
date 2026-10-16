import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Boxes,
  Monitor,
  Cloud,
  UserCheck,
  Clock3,
  ShieldAlert,
  Plus,
  ArrowRight,
} from "lucide-react";
import { api, orgPath } from "../services/api";
import { useSession, useCanWrite } from "../hooks/session";
import { Loading, ErrorBox, date, Empty } from "../components/ui";
import { events, type Row } from "../types";
export function Dashboard() {
  const { org } = useSession(),
    canWrite = useCanWrite();
  const q = useQuery({
    queryKey: [org.id, "dashboard"],
    queryFn: () => api(orgPath(org.id, "/dashboard")),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const { counts: c, categories, departments, recentEvents } = q.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU ESPACIO DE TRABAJO</span>
          <h1>
            Todo bajo control<span className="heading-dot">.</span>
          </h1>
          <p>Una visión clara de la tecnología de tu organización.</p>
        </div>
        {canWrite && (
          <Link className="button" to="/assets/new">
            <Plus size={18} />
            Registrar activo
          </Link>
        )}
      </div>
      <div className="overview-label">
        <span>
          <i className="live-dot" />
          Resumen del inventario
        </span>
        <small>Actualizado desde tu inventario</small>
      </div>
      <div className="stats">
        {[
          [Boxes, "Activos totales", c.total, "/assets", "mint"],
          [Monitor, "Equipos de hardware", c.hardware, "/hardware", "blue"],
          [Cloud, "Activos digitales", c.digital, "/digital", "purple"],
          [
            UserCheck,
            "Activos asignados",
            c.assigned,
            "/assets?status=ASSIGNED",
            "sand",
          ],
        ].map(([Icon, title, value, path, color]: any) => (
          <Link className="stat" to={path} key={title}>
            <div>
              <span className={`stat-icon ${color}`}>
                <Icon size={21} />
              </span>
              <ArrowUpRight size={17} />
            </div>
            <span>{title}</span>
            <strong>{value}</strong>
            <small>
              {title === "Activos totales"
                ? "Recursos registrados en la empresa"
                : title === "Activos asignados"
                  ? "Con un responsable actual"
                  : "Consulta el inventario completo"}
            </small>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Estado del inventario</h2>
              <p>Disponibilidad de tus recursos</p>
            </div>
            <Link to="/assets">
              <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="status-overview">
            <div
              className="donut"
              style={{
                background: `conic-gradient(#2b7768 0 ${c.total ? (c.assigned / c.total) * 100 : 0}%, #a2c9bd ${c.total ? (c.assigned / c.total) * 100 : 0}% ${c.total ? ((c.assigned + c.available) / c.total) * 100 : 0}%, #e7b876 ${c.total ? ((c.assigned + c.available) / c.total) * 100 : 0}% 100%)`,
              }}
            >
              <div>
                <strong>{c.total}</strong>
                <small>activos</small>
              </div>
            </div>
            <div className="legend">
              {[
                ["Asignados", c.assigned, "#2b7768", "ASSIGNED"],
                ["Disponibles", c.available, "#a2c9bd", "AVAILABLE"],
                [
                  "En mantenimiento",
                  c.maintenance,
                  "#e7b876",
                  "IN_MAINTENANCE",
                ],
                ["Dados de baja", c.retired, "#c8cbd0", "RETIRED"],
              ].map(([label, n, color, status]) => (
                <Link key={label} to={`/assets?status=${status}`}>
                  <span>
                    <i style={{ background: String(color) }} />
                    {label}
                  </span>
                  <strong>{n}</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="panel alerts">
          <div className="panel-heading">
            <div>
              <h2>Requieren tu atención</h2>
              <p>Anticípate a los próximos vencimientos</p>
            </div>
            <span className="alert-count">
              {c.lifecycle_expiring + c.digital_expiring + c.warranty_expiring}
            </span>
          </div>
          {[
            [
              Clock3,
              "Vida útil por finalizar",
              "Próximos 6 meses",
              c.lifecycle_expiring,
              "/assets?lifecycle=EXPIRING",
            ],
            [
              Cloud,
              "Licencias por vencer",
              "Próximos 30 días",
              c.digital_expiring,
              "/assets?expiry=DIGITAL",
            ],
            [
              ShieldAlert,
              "Garantías por vencer",
              "Próximos 30 días",
              c.warranty_expiring,
              "/assets?expiry=WARRANTY",
            ],
          ].map(([Icon, title, sub, n, path]: any) => (
            <Link className="alert-row" key={title} to={path}>
              <span className="alert-icon">
                <Icon size={19} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
              <b>{n}</b>
              <ArrowRight size={16} />
            </Link>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Activos por categoría</h2>
              <p>Composición del inventario</p>
            </div>
            <Boxes size={19} />
          </div>
          {categories.length ? (
            categories.slice(0, 8).map((r: Row) => (
              <div className="bar-row" key={r.name}>
                <div>
                  <span>{r.name}</span>
                  <strong>{r.total}</strong>
                </div>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${c.total ? (r.total / c.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Por departamento</h2>
              <p>Distribución de recursos en la empresa</p>
            </div>
            <Link to="/departments">
              <ArrowUpRight size={19} />
            </Link>
          </div>
          {departments.length ? (
            departments.map((r: Row, i: number) => (
              <div className="department-row" key={r.name}>
                <span className="department-number">0{i + 1}</span>
                <span>{r.name}</span>
                <div className="mini-track">
                  <i
                    style={{
                      width: `${c.total ? (r.total / c.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <strong>{r.total}</strong>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </section>
      </div>
      <section className="panel activity">
        <div className="panel-heading">
          <div>
            <h2>Últimos movimientos</h2>
            <p>El historial de tu inventario, siempre disponible</p>
          </div>
          <Link className="text-link" to="/assignments">
            Ver asignaciones <ArrowRight size={15} />
          </Link>
        </div>
        {recentEvents.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ACTIVO</th>
                  <th>MOVIMIENTO</th>
                  <th>REALIZADO POR</th>
                  <th>FECHA</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((r: Row, i: number) => (
                  <tr key={i}>
                    <td>
                      <strong>{r.name}</strong>
                      <small>{r.asset_code}</small>
                    </td>
                    <td>{events[r.event_type] || r.event_type}</td>
                    <td>{r.full_name}</td>
                    <td>{date(r.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
