import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Search } from "lucide-react";
import { api, allPages, orgPath } from "../services/api";
import { useSession, useCanWrite } from "../hooks/session";
import {
  Modal,
  Field,
  Loading,
  ErrorBox,
  Empty,
  Pagination,
  date,
  Confirm,
} from "../components/ui";
import type { Row, Page } from "../types";
const names: Record<string, string> = {
  employees: "Empleados",
  departments: "Áreas y departamentos",
  locations: "Ubicaciones",
  suppliers: "Proveedores",
  categories: "Categorías",
};
export function Catalog({ type }: { type: string }) {
  const { org } = useSession(),
    write = useCanWrite();
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [edit, setEdit] = useState<Row | null>(null);
  const [state, setState] = useState("ALL");
  const related = type === "departments" || type === "locations",
    client = useQueryClient();
  const singular = type === "departments" ? "área" : "ubicación";
  const q = useQuery({
    queryKey: [org.id, type, page, search, state],
    queryFn: () =>
      api<Page>(
        orgPath(
          org.id,
          `/${type}?page=${page}&search=${encodeURIComponent(search)}${related ? "&state=" + state : ""}`,
        ),
      ),
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ORGANIZACIÓN</span>
          <h1>{names[type]}</h1>
          <p>
            {type === "employees"
              ? "Personas, departamentos y activos bajo su responsabilidad."
              : related
                ? "Crea y adapta los nombres a tu empresa. Desactiva los que ya no utilices sin perder sus relaciones ni su historial."
                : "Administra los registros de tu empresa y su disponibilidad."}
          </p>
        </div>
        {write && (
          <button className="button" onClick={() => setEdit({})}>
            <Plus size={18} />
            {related
              ? type === "departments"
                ? "Nueva área"
                : "Nueva ubicación"
              : "Agregar registro"}
          </button>
        )}
      </div>
      <section className="panel">
        <div className="inventory-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar registros"
              placeholder="Buscar por nombre o código…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {related && (
            <label className="field">
              Estado del registro
              <select
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setPage(0);
                }}
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </label>
          )}
        </div>
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} />
        ) : q.data.content.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{type === "employees" ? "EMPLEADO" : "NOMBRE"}</th>
                  <th>
                    {type === "employees"
                      ? "DEPARTAMENTO"
                      : type === "categories"
                        ? "TIPO"
                        : "INFORMACIÓN"}
                  </th>
                  {type === "employees" && <th>ACTIVOS</th>}
                  {related && <th>RELACIONES</th>}
                  <th>ESTADO</th>
                  {write && <th>ACCIONES</th>}
                </tr>
              </thead>
              <tbody>
                {q.data.content.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {type === "employees" ? (
                        <>
                          <Link to={"/employees/" + r.id}>
                            <strong>
                              {r.first_name} {r.last_name}
                            </strong>
                          </Link>
                          <small>
                            {r.employee_code} · {r.email || "Sin correo"}
                          </small>
                        </>
                      ) : (
                        <strong>{r.name}</strong>
                      )}
                    </td>
                    <td>
                      {type === "employees"
                        ? r.department_name || "—"
                        : type === "categories"
                          ? r.asset_kind === "HARDWARE"
                            ? "Hardware"
                            : "Digital"
                          : r.address || r.email || "—"}
                    </td>
                    {type === "employees" && <td>{r.assigned_count}</td>}
                    {related && (
                      <td>
                        {r.asset_count} activos · {r.employee_count} personas
                      </td>
                    )}
                    <td>
                      <span
                        className={
                          "badge " + (r.active ? "available" : "retired")
                        }
                      >
                        {r.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {write && (
                      <td>
                        <div className="report-presets" style={{ margin: 0 }}>
                          <button
                            className={
                              related ? "button secondary" : "icon-button"
                            }
                            aria-label={
                              related ? "Editar " + r.name : "Editar registro"
                            }
                            onClick={() => setEdit(r)}
                          >
                            <Pencil size={16} />
                            {related ? "Editar" : null}
                          </button>
                          {related && (
                            <Confirm
                              label={r.active ? "Desactivar" : "Reactivar"}
                              danger={r.active}
                              description={
                                r.active
                                  ? `Se desactivará ${singular} «${r.name}». Sus ${r.asset_count} activos y ${r.employee_count} personas conservarán sus vínculos. No aparecerá en nuevos registros y podrás reactivarla después.`
                                  : `«${r.name}» volverá a estar disponible en los formularios de esta empresa.`
                              }
                              onConfirm={async () => {
                                await api(
                                  orgPath(org.id, `/${type}/${r.id}`),
                                  r.active ? "DELETE" : "PUT",
                                  r.active
                                    ? undefined
                                    : {
                                        name: r.name,
                                        address: r.address,
                                        active: true,
                                      },
                                );
                                await client.invalidateQueries();
                              }}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty />
        )}
        <Pagination
          page={page}
          total={q.data?.totalElements || 0}
          setPage={setPage}
        />
      </section>
      {edit && (
        <CatalogModal type={type} record={edit} onClose={() => setEdit(null)} />
      )}
    </>
  );
}
function CatalogModal({
  type,
  record: r,
  onClose,
}: {
  type: string;
  record: Row;
  onClose: () => void;
}) {
  const { org } = useSession(),
    client = useQueryClient(),
    employee = type === "employees";
  const related = type === "departments" || type === "locations";
  const [error, setError] = useState<unknown>(),
    [pending, setPending] = useState(false);
  const q = useQuery({
    queryKey: [org.id, "employee-lookups"],
    queryFn: async () => ({
      departments: await allPages(org.id, "/departments"),
      locations: await allPages(org.id, "/locations"),
    }),
    enabled: employee,
  });
  const input = (
    key: string,
    label: string,
    required = false,
    inputType = "text",
  ) => (
    <Field label={label}>
      <input
        name={key}
        type={inputType}
        required={required}
        maxLength={
          key === "employeeCode"
            ? 60
            : key === "firstName" || key === "lastName"
              ? 100
              : 160
        }
        defaultValue={
          r[key.replace(/[A-Z]/g, (s) => "_" + s.toLowerCase())] || ""
        }
      />
    </Field>
  );
  return (
    <Modal
      title={
        related
          ? (r.id ? "Editar " : "Nueva ") +
            (type === "departments" ? "área" : "ubicación")
          : (r.id ? "Editar · " : "Nuevo · ") + names[type]
      }
      onClose={() => !pending && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data: Record<string, any> = Object.fromEntries(
            new FormData(e.currentTarget),
          );
          data.active = related
            ? (r.active ?? true)
            : data.active === ("on" as any);
          for (const key of ["locationId", "departmentId", "hiredOn"])
            if (data[key] === "") data[key] = null as any;
          setPending(true);
          try {
            await api(
              orgPath(org.id, `/${type}${r.id ? "/" + r.id : ""}`),
              r.id ? "PUT" : "POST",
              data,
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
        <div className="form-grid">
          {employee ? (
            <>
              {input("employeeCode", "Código *", true)}
              {input("firstName", "Nombres *", true)}
              {input("lastName", "Apellidos *", true)}
              {input("email", "Correo empresarial", false, "email")}
              {input("jobTitle", "Cargo")}
              {input("hiredOn", "Fecha de ingreso", false, "date")}
              {["departments", "locations"].map((t) => (
                <Field
                  label={t === "departments" ? "Departamento" : "Ubicación"}
                  key={t}
                >
                  <select
                    name={t === "departments" ? "departmentId" : "locationId"}
                    defaultValue={
                      r[
                        t === "departments" ? "department_id" : "location_id"
                      ] || ""
                    }
                  >
                    <option value="">Sin especificar</option>
                    {r[t === "departments" ? "department_id" : "location_id"] &&
                      !q.data?.[t as "departments" | "locations"].some(
                        (x) =>
                          x.id ===
                          r[
                            t === "departments"
                              ? "department_id"
                              : "location_id"
                          ],
                      ) && (
                        <option
                          value={
                            r[
                              t === "departments"
                                ? "department_id"
                                : "location_id"
                            ]
                          }
                        >
                          {r[
                            t === "departments"
                              ? "department_name"
                              : "location_name"
                          ] || "Registro actual"}{" "}
                          (inactivo)
                        </option>
                      )}
                    {q.data?.[t as "departments" | "locations"].map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ))}
            </>
          ) : (
            <>
              {input(
                "name",
                related
                  ? type === "departments"
                    ? "Nombre del área *"
                    : "Nombre de la ubicación *"
                  : "Nombre *",
                true,
              )}
              {type === "locations" && input("address", "Dirección")}
              {type === "suppliers" && (
                <>
                  {input("email", "Correo", false, "email")}
                  {input("phone", "Teléfono")}
                </>
              )}
              {type === "categories" && (
                <Field label="Tipo de activo">
                  <select
                    name="assetKind"
                    defaultValue={r.asset_kind || "HARDWARE"}
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="DIGITAL">Digital</option>
                  </select>
                </Field>
              )}
            </>
          )}
          {!related && (
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={r.active ?? true}
              />
              Registro activo
            </label>
          )}
        </div>
        {error ? <ErrorBox error={error} /> : null}
        {q.error ? <ErrorBox error={q.error} /> : null}
        <footer>
          <button
            type="button"
            disabled={pending}
            className="button secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="button"
            disabled={pending || (employee && (q.isPending || !!q.error))}
          >
            {pending ? "Guardando…" : "Guardar registro"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function EmployeeDetail() {
  const { id } = useParams(),
    { org } = useSession();
  const q = useQuery({
    queryKey: [org.id, "employee", id],
    queryFn: () => api(orgPath(org.id, "/employees/" + id)),
  });
  if (q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const e = q.data;
  return (
    <>
      <Link className="back-link" to="/employees">
        ← Volver a empleados
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{e.employee_code}</span>
          <h1>
            {e.first_name} {e.last_name}
          </h1>
          <p>
            {e.job_title || "Empleado"} · {e.email || "Sin correo empresarial"}
          </p>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Activos actualmente asignados</h2>
        </div>
        {e.assets.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>ACTIVO</th>
                  <th>UBICACIÓN</th>
                </tr>
              </thead>
              <tbody>
                {e.assets.map((a: Row) => (
                  <tr key={a.id}>
                    <td>{a.asset_code}</td>
                    <td>
                      <Link to={"/assets/" + a.id}>{a.name}</Link>
                    </td>
                    <td>{a.location_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Este empleado no tiene activos asignados</Empty>
        )}
      </section>
      <section className="panel activity">
        <div className="panel-heading">
          <h2>Historial de entregas</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ACTIVO</th>
                <th>ENTREGA</th>
                <th>DEVOLUCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {e.history.map((a: Row) => (
                <tr key={a.id}>
                  <td>
                    {a.asset_code} · {a.asset_name}
                  </td>
                  <td>{date(a.assigned_at)}</td>
                  <td>{a.returned_at ? date(a.returned_at) : "Vigente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
