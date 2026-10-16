import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Plus,
  Pencil,
  ShieldCheck,
  Search,
} from "lucide-react";
import { api } from "../services/api";
import { useSession } from "../hooks/session";
import {
  Modal,
  Field,
  ErrorBox,
  Loading,
  Empty,
  Pagination,
  Confirm,
} from "../components/ui";
import type { Row, Page } from "../types";

const roles: Record<string, string> = {
  ORG_ADMIN: "Administrador de empresa",
  ASSET_MANAGER: "Gestor de activos",
  VIEWER: "Solo consulta",
};
export function SystemAdmin() {
  const { session } = useSession();
  if (!session.user.system_admin)
    return (
      <ErrorBox
        error={
          new Error("Esta sección requiere administrador maestro del sistema")
        }
      />
    );
  return <SystemWorkspace />;
}
function SystemWorkspace() {
  const [tab, setTab] = useState<"organizations" | "users">("organizations"),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [edit, setEdit] = useState<Row | null>(null),
    [member, setMember] = useState<Row | null>(null);
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["system", tab, search, page],
    queryFn: () =>
      api<Page>(
        `/system/${tab}?page=${page}&search=${encodeURIComponent(search)}`,
      ),
  });
  const refresh = async () => {
    await client.invalidateQueries();
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CONTROL GLOBAL DEL SISTEMA</span>
          <h1>Administración maestra</h1>
          <p>
            Gestiona todas las empresas, cuentas y permisos desde un solo lugar.
          </p>
        </div>
        <span className="badge available">
          <ShieldCheck size={14} />
          Acceso maestro
        </span>
      </div>
      <div className="report-presets">
        <button
          className={`button ${tab === "organizations" ? "" : "secondary"}`}
          onClick={() => {
            setTab("organizations");
            setPage(0);
            setSearch("");
          }}
        >
          <Building2 size={17} />
          Organizaciones
        </button>
        <button
          className={`button ${tab === "users" ? "" : "secondary"}`}
          onClick={() => {
            setTab("users");
            setPage(0);
            setSearch("");
          }}
        >
          <Users size={17} />
          Usuarios del sistema
        </button>
      </div>
      <section className="panel">
        <div className="inventory-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Buscar en administración maestra"
              placeholder={
                tab === "organizations"
                  ? "Buscar empresa…"
                  : "Buscar nombre o correo…"
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <button className="button" onClick={() => setEdit({})}>
            <Plus size={17} />
            {tab === "organizations" ? "Nueva organización" : "Nuevo usuario"}
          </button>
        </div>
        {q.isPending ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox error={q.error} />
        ) : !q.data.content.length ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    {tab === "organizations" ? "ORGANIZACIÓN" : "USUARIO"}
                  </th>
                  <th>
                    {tab === "organizations" ? "USUARIOS / ACTIVOS" : "ACCESO"}
                  </th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {q.data.content.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>
                        {tab === "organizations" ? r.name : r.full_name}
                      </strong>
                      <small>
                        {tab === "organizations"
                          ? r.legal_name || r.tax_id
                          : r.email}
                      </small>
                    </td>
                    <td>
                      {tab === "organizations" ? (
                        `${r.user_count} usuarios · ${r.asset_count} activos`
                      ) : r.system_admin ? (
                        <span className="badge available">
                          Maestro · todas las empresas
                        </span>
                      ) : (
                        <>
                          {r.memberships?.length
                            ? r.memberships.map((m: Row) => (
                                <small key={m.organization_id}>
                                  {m.name} · {roles[m.role]}
                                </small>
                              ))
                            : "Sin empresas autorizadas"}
                        </>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${r.active ? "available" : "retired"}`}
                      >
                        {r.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="report-presets" style={{ margin: 0 }}>
                        <button
                          className="button secondary"
                          onClick={() => setEdit(r)}
                        >
                          <Pencil size={14} />
                          Editar
                        </button>
                        {tab === "users" ? (
                          <button
                            className="button secondary"
                            onClick={() => setMember(r)}
                          >
                            Empresas y permisos
                          </button>
                        ) : (
                          <Confirm
                            label={r.active ? "Desactivar" : "Activar"}
                            danger={r.active}
                            description={
                              r.active
                                ? "Los usuarios de esta empresa perderán acceso a su inventario. Los datos se conservarán."
                                : "La empresa volverá a estar disponible para sus usuarios autorizados."
                            }
                            onConfirm={async () => {
                              await api(
                                `/system/organizations/${r.id}`,
                                "PUT",
                                {
                                  name: r.name,
                                  legalName: r.legal_name,
                                  taxId: r.tax_id,
                                  active: !r.active,
                                },
                              );
                              await refresh();
                            }}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={q.data?.totalElements || 0}
          setPage={setPage}
        />
      </section>
      {edit && (
        <SystemEditor type={tab} record={edit} onClose={() => setEdit(null)} />
      )}
      {member && (
        <MembershipEditor user={member} onClose={() => setMember(null)} />
      )}
    </>
  );
}
function SystemEditor({
  type,
  record: r,
  onClose,
}: {
  type: "organizations" | "users";
  record: Row;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>();
  const client = useQueryClient();
  const { session } = useSession();
  const self = r.id === session.user.id;
  return (
    <Modal
      title={
        type === "organizations"
          ? r.id
            ? "Editar organización"
            : "Nueva organización"
          : r.id
            ? "Editar usuario"
            : "Nuevo usuario"
      }
      onClose={() => !pending && onClose()}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const data: Record<string, any> = Object.fromEntries(
            new FormData(e.currentTarget),
          );
          if (type === "organizations") data.active = r.active ?? true;
          else {
            data.active = self ? true : data.active === "on";
            data.systemAdmin = self ? true : data.systemAdmin === "on";
            data.email = r.email || data.email;
            if (
              ((!r.system_admin && data.systemAdmin) ||
                (r.active && !data.active)) &&
              !window.confirm(
                data.systemAdmin
                  ? "Esta cuenta tendrá acceso global a todas las empresas y usuarios. ¿Confirmar permiso maestro?"
                  : "Se bloqueará el acceso de esta cuenta en todas las empresas. ¿Confirmar?",
              )
            )
              return;
          }
          setPending(true);
          try {
            await api(
              `/system/${type}${r.id ? "/" + r.id : ""}`,
              r.id ? "PUT" : "POST",
              data,
            );
            await client.invalidateQueries();
            onClose();
          } catch (error) {
            setError(error);
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="form-grid">
          {type === "organizations" ? (
            <>
              <Field label="Nombre de la organización *">
                <input
                  name="name"
                  required
                  maxLength={160}
                  defaultValue={r.name || ""}
                />
              </Field>
              <Field label="Razón social">
                <input
                  name="legalName"
                  maxLength={200}
                  defaultValue={r.legal_name || ""}
                />
              </Field>
              <Field label="Identificación tributaria">
                <input
                  name="taxId"
                  maxLength={60}
                  defaultValue={r.tax_id || ""}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Nombre completo *">
                <input
                  name="fullName"
                  required
                  maxLength={160}
                  defaultValue={r.full_name || ""}
                />
              </Field>
              <Field label="Correo *">
                <input
                  name="email"
                  type="email"
                  required
                  readOnly={!!r.id}
                  defaultValue={r.email || ""}
                />
              </Field>
              <Field
                label={
                  r.id
                    ? "Nueva contraseña (dejar vacía para conservar)"
                    : "Contraseña inicial *"
                }
              >
                <input
                  name="password"
                  type="password"
                  required={!r.id}
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                />
              </Field>
              <label className="checkbox">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={r.active ?? true}
                  disabled={self}
                />
                Cuenta activa
              </label>
              <label className="checkbox">
                <input
                  name="systemAdmin"
                  type="checkbox"
                  defaultChecked={r.system_admin ?? false}
                  disabled={self}
                />
                Administrador maestro (acceso global)
              </label>
            </>
          )}
        </div>
        {type === "users" && (
          <p className="muted" style={{ marginTop: 18, fontSize: 12 }}>
            Los usuarios normales requieren una empresa autorizada. Configúrala
            en «Empresas y permisos» después de guardar.
          </p>
        )}
        {error ? <ErrorBox error={error} /> : null}
        <footer>
          <button
            className="button secondary"
            type="button"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button" disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
function MembershipEditor({
  user,
  onClose,
}: {
  user: Row;
  onClose: () => void;
}) {
  const [error, setError] = useState<unknown>(),
    [pending, setPending] = useState(false),
    [search, setSearch] = useState("");
  const client = useQueryClient();
  const choices = useQuery({
    queryKey: ["system", "organization-choices"],
    queryFn: async () => {
      const rows: Row[] = [];
      let page = 0,
        total = 0;
      do {
        const r = await api<Page>(
          `/system/organizations?size=100&page=${page++}`,
        );
        rows.push(...r.content);
        total = r.totalElements;
      } while (rows.length < total);
      return rows;
    },
  });
  const q = useQuery({
    queryKey: ["system", "memberships", user.id],
    queryFn: () => api<Row[]>(`/system/users/${user.id}/memberships`),
  });
  return (
    <Modal
      title={`Empresas y permisos · ${user.full_name}`}
      onClose={() => !pending && onClose()}
    >
      {user.system_admin && (
        <p className="success">
          Esta cuenta es maestra y ya tiene acceso global. Las membresías no
          limitan ese permiso.
        </p>
      )}
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : q.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>EMPRESA</th>
                <th>ROL</th>
                <th>ACCESO</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((m) => (
                <tr key={m.organization_id}>
                  <td>{m.name}</td>
                  <td>{roles[m.role]}</td>
                  <td>
                    <Confirm
                      danger
                      label="Revocar"
                      description="Se retirará el acceso de esta cuenta a esta empresa. No se eliminarán activos ni empleados."
                      onConfirm={async () => {
                        await api(
                          `/system/users/${user.id}/memberships/${m.organization_id}`,
                          "DELETE",
                        );
                        await client.invalidateQueries();
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Sin membresías específicas</Empty>
      )}
      <form
        style={{ marginTop: 22 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          try {
            await api(
              `/system/users/${user.id}/memberships`,
              "POST",
              Object.fromEntries(new FormData(e.currentTarget)),
            );
            await client.invalidateQueries();
          } catch (e) {
            setError(e);
          } finally {
            setPending(false);
          }
        }}
      >
        <h2>Agregar o cambiar acceso</h2>
        <Field label="Buscar empresa">
          <input value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field label="Empresa *">
          <select name="organizationId" required>
            <option value="">Selecciona una organización</option>
            {choices.data
              ?.filter((o) =>
                o.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                  {o.active ? "" : " (inactiva)"}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Rol en la empresa">
          <select name="role">
            {Object.entries(roles).map(([k, v]) => (
              <option value={k} key={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        {error ? <ErrorBox error={error} /> : null}
        {choices.error ? <ErrorBox error={choices.error} /> : null}
        <footer>
          <button className="button secondary" type="button" onClick={onClose}>
            Cerrar
          </button>
          <button
            className="button"
            disabled={pending || choices.isPending || !!choices.error}
          >
            {pending ? "Guardando…" : "Guardar acceso"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
