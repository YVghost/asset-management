import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Layers3,
  LayoutDashboard,
  Boxes,
  Monitor,
  Cloud,
  Users,
  ArrowRightLeft,
  Building2,
  MapPin,
  Truck,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { api } from "./services/api";
import { SessionContext, useSession } from "./hooks/session";
import { Loading, ErrorBox } from "./components/ui";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { AssetForm } from "./pages/AssetForm";
import { AssetDetail } from "./pages/AssetDetail";
import { Catalog, EmployeeDetail } from "./pages/Catalogs";
import { SystemAdmin } from "./pages/SystemAdmin";
import type { Session } from "./types";
import "./styles.css";
const client = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});
const nav = [
  ["/", "Dashboard", LayoutDashboard],
  ["/assets", "Inventario general", Boxes],
  ["/hardware", "Hardware", Monitor],
  ["/digital", "Activos digitales", Cloud],
  ["/employees", "Empleados", Users],
  ["/assignments", "Asignaciones", ArrowRightLeft],
  ["/departments", "Departamentos", Building2],
  ["/locations", "Ubicaciones", MapPin],
  ["/suppliers", "Proveedores", Truck],
  ["/reports", "Reportes", ChartNoAxesCombined],
  ["/settings", "Configuración", Settings],
] as const;
function App() {
  const q = useQuery({
      queryKey: ["session"],
      queryFn: () => api<Session>("/auth/me"),
    }),
    cache = useQueryClient();
  const [selected, setSelected] = useState(
    () => localStorage.getItem("ams-org") || "",
  );
  if (q.isPending) return <Loading />;
  if (q.error) {
    if ((q.error as any).status === 401)
      return (
        <Login
          onLogin={() => cache.invalidateQueries({ queryKey: ["session"] })}
        />
      );
    return (
      <div className="connection-error">
        <ErrorBox error={q.error} />
        <button className="button" onClick={() => q.refetch()}>
          Reintentar conexión
        </button>
      </div>
    );
  }
  const org =
    q.data.organizations.find((o) => o.id === selected) ||
    q.data.organizations[0] ||
    (q.data.user.system_admin
      ? { id: "", name: "Administración global", role: "ORG_ADMIN" as const }
      : undefined);
  if (!org)
    return (
      <div className="connection-error">
        <ErrorBox
          error={
            new Error(
              "Tu cuenta no tiene organizaciones autorizadas. Contacta al administrador.",
            )
          }
        />
        <button
          className="button"
          onClick={async () => {
            await api("/auth/logout", "POST");
            window.location.assign("/");
          }}
        >
          Cerrar sesión
        </button>
      </div>
    );
  return (
    <SessionContext.Provider
      value={{
        session: q.data,
        org,
        selectOrg: (id) => {
          setSelected(id);
          localStorage.setItem("ams-org", id);
          cache.removeQueries({
            predicate: (q) => q.queryKey[0] !== "session",
          });
        },
        logout: async () => {
          await api("/auth/logout", "POST");
          window.location.assign("/");
        },
      }}
    >
      <Shell key={org.id} />
    </SessionContext.Provider>
  );
}
function Shell() {
  const { session, org, selectOrg, logout } = useSession(),
    location = useLocation();
  const [menu, setMenu] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <LinkBrand />
        <div className="workspace-selector">
          <span className="workspace-icon">
            <Building2 size={19} />
          </span>
          <div>
            <small>ORGANIZACIÓN</small>
            <select
              aria-label="Organización activa"
              value={org.id}
              onChange={(e) => selectOrg(e.target.value)}
            >
              {session.organizations.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.name}
                </option>
              ))}
              {!org.id && <option value="">Sin empresas activas</option>}
            </select>
          </div>
        </div>
        <span className="nav-label">ESPACIO DE TRABAJO</span>
        <nav>
          {(org.id ? nav : []).map(([path, label, Icon], i) => (
            <React.Fragment key={path}>
              {i === 6 && (
                <span className="nav-label nav-section">ORGANIZACIÓN</span>
              )}
              {i === 9 && (
                <span className="nav-label nav-section">ADMINISTRACIÓN</span>
              )}
              <NavLink
                to={path}
                end={path === "/" || path === "/assets"}
                onClick={() => setMenu(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {path === "/assets" && (
                  <ChevronRight className="nav-chevron" size={14} />
                )}
              </NavLink>
            </React.Fragment>
          ))}
          {session.user.system_admin && (
            <>
              <span className="nav-label nav-section">SISTEMA</span>
              <NavLink to="/system" onClick={() => setMenu(false)}>
                <ShieldCheck size={18} />
                <span>Administración maestra</span>
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-bottom">
          <ShieldCheck size={17} />
          <span>
            Tu inventario, protegido<small>Acceso por organización</small>
          </span>
        </div>
        <div className="user-card">
          <span className="avatar">
            {session.user.full_name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{session.user.full_name}</strong>
            <small>
              {session.user.system_admin
                ? "Administrador maestro"
                : org.role === "ORG_ADMIN"
                  ? "Administrador"
                  : org.role === "VIEWER"
                    ? "Consulta"
                    : "Gestor de activos"}
            </small>
          </div>
          <button
            aria-label="Cerrar sesión"
            className="icon-button"
            onClick={() => Promise.resolve(logout()).catch(setError)}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="Abrir menú"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span>
            Espacio de trabajo <ChevronRight size={13} />{" "}
            <strong>
              {location.pathname.startsWith("/system")
                ? "Administración maestra"
                : nav.find(
                    ([p]) => p !== "/" && location.pathname.startsWith(p),
                  )?.[1] || "Dashboard"}
            </strong>
          </span>
          <div>
            <span className="top-status">
              <i className="live-dot" />
              Sesión segura
            </span>
            <span className="top-date">
              {new Date().toLocaleDateString("es-EC", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <main className="main-content">
          {error ? <ErrorBox error={error} /> : null}
          <Routes>
            <Route
              path="/"
              element={
                org.id ? <Dashboard /> : <Navigate to="/system" replace />
              }
            />
            <Route path="/system" element={<SystemAdmin />} />
            <Route path="/assets" element={<Inventory />} />
            <Route path="/hardware" element={<Inventory kind="HARDWARE" />} />
            <Route path="/digital" element={<Inventory kind="DIGITAL" />} />
            <Route path="/assignments" element={<Inventory assignments />} />
            <Route path="/reports" element={<Inventory reports />} />
            <Route path="/assets/new" element={<AssetForm />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/assets/:id/edit" element={<AssetForm />} />
            {[
              "employees",
              "departments",
              "locations",
              "suppliers",
              "categories",
            ].map((t) => (
              <Route key={t} path={"/" + t} element={<Catalog type={t} />} />
            ))}
            <Route path="/employees/:id" element={<EmployeeDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="app-footer">
            AMS · Asset Management System<span>{org.name}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function LinkBrand() {
  return (
    <a href="/" className="brand">
      <span className="brand-symbol">
        <Layers3 size={23} />
      </span>
      <div>
        AMS<small>ASSET MANAGEMENT</small>
      </div>
      <span className="version">v1.0</span>
    </a>
  );
}
function SettingsPage() {
  const { org, session } = useSession();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>Configuración</h1>
          <p>Organización, catálogos y acceso de tu cuenta.</p>
        </div>
      </div>
      <section className="panel detail-panel">
        <h2>{org.name}</h2>
        <p className="muted">
          Cuenta: {session.user.email} · Rol: {org.role}
        </p>
        <NavLink className="button secondary" to="/categories">
          Administrar categorías
        </NavLink>
        {org.role === "ORG_ADMIN" && <UserManagement />}
      </section>
    </>
  );
}
function UserManagement() {
  const { org } = useSession();
  const [message, setMessage] = useState(""),
    [error, setError] = useState<unknown>(),
    [pending, setPending] = useState(false);
  return (
    <form
      className="user-management"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        setPending(true);
        setError(undefined);
        setMessage("");
        try {
          await api(
            `/organizations/${org.id}/users`,
            "POST",
            Object.fromEntries(new FormData(form)),
          );
          form.reset();
          setMessage("Usuario autorizado correctamente");
        } catch (e) {
          setError(e);
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Autorizar usuario en esta empresa</h2>
      <p className="muted">
        Si ya existe, se añade su acceso sin cambiar su contraseña.
      </p>
      <div className="form-grid">
        <label className="field">
          Nombre completo
          <input name="fullName" required maxLength={160} />
        </label>
        <label className="field">
          Correo
          <input name="email" type="email" required />
        </label>
        <label className="field">
          Contraseña inicial (usuario nuevo)
          <input
            name="password"
            type="password"
            minLength={12}
            maxLength={72}
            autoComplete="new-password"
          />
        </label>
        <label className="field">
          Rol
          <select name="role">
            <option value="VIEWER">Solo consulta</option>
            <option value="ASSET_MANAGER">Gestor de activos</option>
            <option value="ORG_ADMIN">Administrador</option>
          </select>
        </label>
      </div>
      {error ? <ErrorBox error={error} /> : null}
      {message && <p className="success">{message}</p>}
      <button className="button" disabled={pending}>
        {pending ? "Guardando…" : "Autorizar usuario"}
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
