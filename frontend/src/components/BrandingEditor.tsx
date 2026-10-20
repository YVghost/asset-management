import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, upload } from "../services/api";
import { Modal, Field, Loading, ErrorBox } from "./ui";
import type { Row } from "../types";
export function BrandingEditor({
  org,
  onClose,
}: {
  org: Row;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["system", "branding", org.id],
    queryFn: () => api(`/system/organizations/${org.id}/branding`),
  });
  return (
    <Modal title={`Identidad visual · ${org.name}`} onClose={onClose}>
      {q.isPending ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <BrandForm org={org} initial={q.data} onClose={onClose} />
      )}
    </Modal>
  );
}
function BrandForm({
  org,
  initial,
  onClose,
}: {
  org: Row;
  initial: Row;
  onClose: () => void;
}) {
  const [key, setKey] = useState(initial.theme_key),
    [file, setFile] = useState<File | null>(null),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>();
  const client = useQueryClient();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        setPending(true);
        setError(undefined);
        try {
          await api(`/system/organizations/${org.id}/branding`, "PUT", {
            themeKey: key,
            ...values,
          });
          if (file)
            await upload(`/system/organizations/${org.id}/branding/logo`, file);
          await client.invalidateQueries();
          onClose();
        } catch (e) {
          setError(e);
        } finally {
          setPending(false);
        }
      }}
    >
      <Field label="Tema de la organización">
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          <option value="GENERIC">AMS · Genérico</option>
          <option value="EDINUN">Edinun · Azul editorial</option>
          <option value="CUSTOM">Personalizado para esta empresa</option>
        </select>
      </Field>
      {key === "CUSTOM" && (
        <div className="form-grid">
          {[
            ["primary", "Color de botones", "#185A65"],
            ["sidebar", "Fondo del menú", "#172E3D"],
            ["background", "Fondo de páginas", "#F4F6FA"],
          ].map(([name, label, fallback]) => (
            <Field key={name} label={label}>
              <input
                type="color"
                name={name}
                defaultValue={initial.config[name] || fallback}
              />
            </Field>
          ))}
          <Field label="Tipografía">
            <select name="font" defaultValue={initial.config.font || "SYSTEM"}>
              <option value="SYSTEM">Sistema · Segoe UI / Arial</option>
              <option value="ARIAL">Arial / Helvetica</option>
              <option value="GEORGIA">Georgia</option>
            </select>
          </Field>
        </div>
      )}
      <p className="muted brand-help">
        El tema se aplica únicamente a esta empresa. El acceso general y la
        administración maestra conservan el tema neutro. Los colores
        personalizados deben mantener contraste de 4.5:1.
      </p>
      <Field label="Logo propio (opcional, PNG o JPEG, máximo 1 MB)">
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </Field>
      {initial.has_logo && (
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            try {
              await api(
                `/system/organizations/${org.id}/branding/logo`,
                "DELETE",
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
          Restaurar logo del tema
        </button>
      )}
      {error ? <ErrorBox error={error} /> : null}
      <footer>
        <button
          type="button"
          className="button secondary"
          disabled={pending}
          onClick={onClose}
        >
          Cancelar
        </button>
        <button className="button" disabled={pending}>
          {pending ? "Guardando…" : "Guardar identidad"}
        </button>
      </footer>
    </form>
  );
}
