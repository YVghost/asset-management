import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Pencil,
  UserPlus,
  ArrowRightLeft,
  Undo2,
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
  Field,
  Modal,
  Confirm,
  Empty,
  date,
  remaining,
} from "../components/ui";
import { events, lifeStates } from "../types";
export function AssetDetail() {
  const { id } = useParams(),
    { org } = useSession(),
    write = useCanWrite(),
    client = useQueryClient();
  const [action, setAction] = useState("");
  const q = useQuery({
    queryKey: [org.id, "asset", id],
    queryFn: () => api(orgPath(org.id, "/assets/" + id)),
  });
  const history = useQuery({
    queryKey: [org.id, "history", id],
    queryFn: () => api(orgPath(org.id, `/assets/${id}/assignments`)),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const a = q.data,
    l = a.lifecycle;
  return (
    <>
      <Link className="back-link" to="/assets">
        <ArrowLeft size={16} />
        Volver al inventario
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FICHA DEL ACTIVO · {a.asset_code}</span>
          <h1>{a.name}</h1>
          <p>
            {a.category_name} ·{" "}
            {a.asset_kind === "HARDWARE" ? "Hardware" : "Activo digital"}
          </p>
        </div>
        <Link className="button secondary" to={"/labels?ids=" + id}>
          <QrCode size={18} />
          Etiqueta QR
        </Link>
        {write && (
          <Link className="button secondary" to={`/assets/${id}/edit`}>
            <Pencil size={16} />
            Editar activo
          </Link>
        )}
      </div>
      <div className="detail-grid">
        <div>
          <section className="panel detail-panel">
            <div className="panel-heading">
              <h2>Información general</h2>
              <Badge status={a.status} />
            </div>
            <dl className="details">
              {[
                ["Código", a.asset_code],
                ["Categoría", a.category_name],
                ["Descripción", a.description],
                ["Ubicación", a.location_name],
                ["Departamento", a.department_name],
                ["Proveedor", a.supplier_name],
                ["Adquisición", date(a.acquisition_date)],
                [
                  "Costo",
                  a.acquisition_cost != null
                    ? `${a.currency} ${a.acquisition_cost}`
                    : null,
                ],
                ["Factura", a.invoice_reference],
                ["Observaciones", a.notes],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="panel detail-panel">
            <div className="panel-heading">
              <h2>
                {a.hardware
                  ? "Características técnicas"
                  : "Información digital"}
              </h2>
              {a.hardware ? <Monitor size={20} /> : <Cloud size={20} />}
            </div>
            <dl className="details">
              {Object.entries(
                a.hardware
                  ? {
                      Marca: a.hardware.brand,
                      Modelo: a.hardware.model,
                      Serie: a.hardware.serial_number,
                      "Etiqueta patrimonial": a.hardware.patrimonial_tag,
                      "Estado físico": (
                        {
                          NEW: "Nuevo",
                          GOOD: "Bueno",
                          FAIR: "Regular",
                          DAMAGED: "Dañado",
                        } as Record<string, string>
                      )[a.hardware.physical_condition],
                      Garantía: date(a.hardware.warranty_end_date),
                      ...Object.fromEntries(
                        Object.entries(a.hardware.specifications || {}).map(
                          ([k, v]) => [
                            (
                              {
                                processor: "Procesador",
                                ram: "RAM",
                                storage: "Almacenamiento",
                                storageType: "Tipo de almacenamiento",
                                operatingSystem: "Sistema operativo",
                                architecture: "Arquitectura",
                                hostname: "Hostname",
                              } as Record<string, string>
                            )[k] || k,
                            v,
                          ],
                        ),
                      ),
                    }
                  : {
                      Producto: a.digital.product,
                      "Tipo de licencia": a.digital.license_type,
                      Contrato: a.digital.contract_reference,
                      Activación: date(a.digital.activation_date),
                      Vencimiento: date(a.digital.expiration_date),
                      "Renovación automática": a.digital.auto_renew
                        ? "Sí"
                        : "No",
                      "Costo renovación": a.digital.renewal_cost,
                      "Puestos contratados": a.digital.seats,
                    },
              ).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v ? String(v) : "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <aside>
          <section className="panel detail-panel life-card">
            <span className="eyebrow">CICLO DE VIDA</span>
            <h2>{remaining(l.remainingDays)}</h2>
            <p>{lifeStates[l.state]}</p>
            <div className="life-track">
              <i
                className={l.state.toLowerCase()}
                style={{ width: (l.consumedPercent || 0) + "%" }}
              />
            </div>
            <span>
              {l.consumedPercent == null
                ? "Sin datos suficientes"
                : `${l.consumedPercent.toFixed(1)}% de vida útil consumida`}
            </span>
            <dl className="details">
              <div>
                <dt>Entrada en servicio</dt>
                <dd>{date(a.in_service_date)}</dd>
              </div>
              <div>
                <dt>Vida útil estimada</dt>
                <dd>
                  {a.useful_life_months ? `${a.useful_life_months} meses` : "—"}
                </dd>
              </div>
              <div>
                <dt>Finalización estimada</dt>
                <dd>{date(l.estimatedEndOfLife)}</dd>
              </div>
              <div>
                <dt>Antigüedad</dt>
                <dd>{remaining(l.ageDays)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel detail-panel">
            <span className="eyebrow">RESPONSABLE ACTUAL</span>
            <h2>{a.assigned_employee || "Sin asignar"}</h2>
            {a.current_assigned_at && (
              <p className="muted">
                Entrega: {date(a.current_assigned_at)}
                {a.current_expected_return_at
                  ? " · Devolución prevista: " +
                    date(a.current_expected_return_at)
                  : ""}
              </p>
            )}
            <p className="muted">
              {a.employee_code ||
                "El activo pertenece al inventario de la empresa."}
            </p>
            {a.employee_id && (
              <Link className="text-link" to={"/employees/" + a.employee_id}>
                Ver ficha del empleado →
              </Link>
            )}
            {write && a.asset_kind === "HARDWARE" && (
              <div className="action-stack">
                {a.status === "AVAILABLE" && (
                  <button
                    className="button"
                    onClick={() => setAction("assign")}
                  >
                    <UserPlus size={16} />
                    Asignar a empleado
                  </button>
                )}
                {a.status === "ASSIGNED" && (
                  <>
                    <button
                      className="button secondary"
                      onClick={() => setAction("transfer")}
                    >
                      <ArrowRightLeft size={16} />
                      Transferir
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => setAction("return")}
                    >
                      <Undo2 size={16} />
                      Registrar devolución
                    </button>
                  </>
                )}
              </div>
            )}
            {write && a.status !== "ASSIGNED" && (
              <div className="action-stack">
                {a.status === "AVAILABLE" && (
                  <Confirm
                    label="Enviar a mantenimiento"
                    description="El activo dejará de estar disponible para entregas."
                    onConfirm={async () => {
                      await api(
                        orgPath(org.id, `/assets/${id}/status`),
                        "PATCH",
                        { status: "IN_MAINTENANCE" },
                      );
                      await client.invalidateQueries();
                    }}
                  />
                )}
                {a.status === "IN_MAINTENANCE" && (
                  <Confirm
                    label="Finalizar mantenimiento"
                    description="El activo volverá a estar disponible."
                    onConfirm={async () => {
                      await api(
                        orgPath(org.id, `/assets/${id}/status`),
                        "PATCH",
                        { status: "AVAILABLE" },
                      );
                      await client.invalidateQueries();
                    }}
                  />
                )}
                {!["RETIRED", "DISPOSED"].includes(a.status) && (
                  <Confirm
                    danger
                    label="Dar de baja"
                    description="El activo se archivará y conservará todo su historial. No podrá asignarse mientras esté dado de baja."
                    onConfirm={async () => {
                      await api(
                        orgPath(org.id, `/assets/${id}/status`),
                        "PATCH",
                        { status: "RETIRED" },
                      );
                      await client.invalidateQueries();
                    }}
                  />
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Historial de asignaciones</h2>
        </div>
        {history.isPending ? (
          <Loading />
        ) : history.error ? (
          <ErrorBox error={history.error} />
        ) : history.data.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>EMPLEADO</th>
                  <th>DEPARTAMENTO / UBICACIÓN</th>
                  <th>ENTREGA</th>
                  <th>DEVOLUCIÓN PREVISTA</th>
                  <th>DEVOLUCIÓN</th>
                  <th>OBSERVACIONES</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={"/employees/" + r.employee_id}>
                        {r.employee_name}
                      </Link>
                      <small>{r.employee_code}</small>
                    </td>
                    <td>
                      {r.department_name || "—"}
                      <small>{r.location_name}</small>
                    </td>
                    <td>{date(r.assigned_at)}</td>
                    <td>{date(r.expected_return_at)}</td>
                    <td>
                      {r.returned_at ? (
                        date(r.returned_at)
                      ) : (
                        <Badge status="ASSIGNED" />
                      )}
                    </td>
                    <td>{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Sin entregas registradas</Empty>
        )}
      </section>
      <section className="panel activity">
        <div className="panel-heading">
          <h2>Historial de movimientos</h2>
        </div>
        <div className="timeline">
          {a.events.map((e: any) => (
            <div key={e.id}>
              <i />
              <span>
                <strong>{events[e.event_type] || e.event_type}</strong>
                <small>
                  {e.full_name} ·{" "}
                  {new Date(e.occurred_at).toLocaleString("es-EC")}
                </small>
                <details>
                  <summary>Ver cambios</summary>
                  <pre>{JSON.stringify(JSON.parse(e.changes), null, 2)}</pre>
                </details>
              </span>
            </div>
          ))}
        </div>
      </section>
      {action && (
        <AssignmentModal
          action={action}
          id={id!}
          onClose={() => setAction("")}
        />
      )}
    </>
  );
}
function AssignmentModal({
  action,
  id,
  onClose,
}: {
  action: string;
  id: string;
  onClose: () => void;
}) {
  const { org } = useSession(),
    client = useQueryClient();
  const [search, setSearch] = useState(""),
    [employeeId, setEmployee] = useState(""),
    [departmentId, setDepartment] = useState(""),
    [notes, setNotes] = useState(""),
    [at, setAt] = useState(() => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    }),
    [expected, setExpected] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>();
  const q = useQuery({
    queryKey: [org.id, "assign-lookups"],
    queryFn: async () => ({
      employees: await allPages(org.id, "/employees"),
      departments: await allPages(org.id, "/departments"),
    }),
  });
  return (
    <Modal
      title={
        action === "return"
          ? "Registrar devolución"
          : action === "transfer"
            ? "Transferir activo"
            : "Asignar a empleado"
      }
      onClose={() => !pending && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          try {
            await api(
              orgPath(org.id, `/assets/${id}/${action}`),
              "POST",
              action === "return"
                ? { returnedAt: new Date(at).toISOString(), notes }
                : {
                    employeeId,
                    departmentId: departmentId || null,
                    assignedAt: new Date(at).toISOString(),
                    expectedReturnAt: expected
                      ? new Date(expected).toISOString()
                      : null,
                    notes,
                  },
            );
            await client.invalidateQueries();
            onClose();
          } catch (e) {
            setError(e);
          } finally {
            setPending(false);
          }
        }}
      >
        {action !== "return" && (
          <>
            <Field label="Buscar empleado">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre o código…"
              />
            </Field>
            <Field label="Empleado *">
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployee(e.target.value)}
              >
                <option value="">Selecciona un empleado</option>
                {q.data?.employees
                  .filter((r) =>
                    `${r.first_name} ${r.last_name} ${r.employee_code}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <option value={r.id} key={r.id}>
                      {r.first_name} {r.last_name} · {r.employee_code}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Departamento">
              <select
                value={departmentId}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">Sin cambio de departamento</option>
                {q.data?.departments.map((r) => (
                  <option value={r.id} key={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        <Field
          label={
            action === "return" ? "Fecha de devolución *" : "Fecha de entrega *"
          }
        >
          <input
            required
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </Field>
        {action !== "return" && (
          <Field label="Devolución prevista">
            <input
              type="datetime-local"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
            />
          </Field>
        )}
        <Field label="Observaciones">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {error ? <ErrorBox error={error} /> : null}
        {q.error ? <ErrorBox error={q.error} /> : null}
        <footer>
          <button
            type="button"
            className="button secondary"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button"
            disabled={pending || q.isPending || !!q.error}
          >
            {pending ? "Guardando…" : "Confirmar movimiento"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
