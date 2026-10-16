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
} from "../components/ui";
import type { Row, Page } from "../types";
const names: Record<string, string> = {
  employees: "Empleados",
  departments: "Departamentos",
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
  const q = useQuery({
    queryKey: [org.id, type, page, search],
    queryFn: () =>
      api<Page>(
        orgPath(
          org.id,
          `/${type}?page=${page}&search=${encodeURIComponent(search)}`,
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
              : "Administra los registros de tu empresa y su disponibilidad."}
          </p>
        </div>
        {write && (
          <button className="button" onClick={() => setEdit({})}>
            <Plus size={18} />
            Agregar registro
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
                        <button
                          className="icon-button"
                          aria-label="Editar registro"
                          onClick={() => setEdit(r)}
                        >
                          <Pencil size={16} />
                        </button>
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
      title={(r.id ? "Editar · " : "Nuevo · ") + names[type]}
      onClose={() => !pending && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data: Record<string, any> = Object.fromEntries(
            new FormData(e.currentTarget),
          );
          data.active = data.active === ("on" as any);
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
              {input("name", "Nombre *", true)}
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
          <label className="checkbox">
            <input
              name="active"
              type="checkbox"
              defaultChecked={r.active ?? true}
            />
            Registro activo
          </label>
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
