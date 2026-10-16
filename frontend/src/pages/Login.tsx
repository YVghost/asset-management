import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Layers3, ShieldCheck, Boxes, Users } from "lucide-react";
import { api, refreshCsrf } from "../services/api";
import { ErrorBox, Field } from "../components/ui";
const schema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});
export function Login({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState<unknown>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <Layers3 /> AMS<span>WORKSPACE</span>
        </div>
        <div>
          <span className="eyebrow">CADA ACTIVO, BAJO CONTROL</span>
          <h1>
            Tu inventario.
            <br />
            Una visión completa.
          </h1>
          <p>
            Conecta equipos, personas y espacios en un solo lugar. Gestiona el
            ciclo de vida de tu tecnología con claridad.
          </p>
          <div className="login-features">
            <span>
              <Boxes />
              Inventario centralizado
            </span>
            <span>
              <Users />
              Responsables e historial
            </span>
            <span>
              <ShieldCheck />
              Información por empresa
            </span>
          </div>
        </div>
        <small>Asset Management System · Gestión de tecnología</small>
      </section>
      <section className="login-form">
        <div>
          <span className="eyebrow">BIENVENIDO A AMS</span>
          <h2>Inicia sesión</h2>
          <p className="muted">
            Accede al espacio de trabajo de tu organización.
          </p>
          <form
            onSubmit={handleSubmit(async (data) => {
              try {
                await api("/auth/login", "POST", data);
                await refreshCsrf();
                onLogin();
              } catch (e) {
                setError(e);
              }
            })}
          >
            <Field label="Correo empresarial" error={errors.email?.message}>
              <input
                type="email"
                autoComplete="username"
                placeholder="nombre@empresa.com"
                {...register("email")}
              />
            </Field>
            <Field label="Contraseña" error={errors.password?.message}>
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
            </Field>
            {error ? <ErrorBox error={error} /> : null}
            <button className="button" disabled={isSubmitting}>
              {isSubmitting ? "Ingresando…" : "Entrar al espacio de trabajo"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-note">
            <ShieldCheck size={16} />
            Acceso restringido a personal autorizado.
          </p>
        </div>
      </section>
    </main>
  );
}
