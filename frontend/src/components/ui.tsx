import {
  useId,
  useState,
  isValidElement,
  cloneElement,
  type ReactNode,
  type ReactElement,
} from "react";
import { LoaderCircle, X, AlertCircle, PackageOpen } from "lucide-react";
import { statuses } from "../types";
export function Loading() {
  return (
    <div className="placeholder" role="status">
      <LoaderCircle className="spin" /> Cargando datos…
    </div>
  );
}
export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div className="error" role="alert">
      <AlertCircle size={17} />
      {error instanceof Error
        ? error.message
        : "No se pudo completar la operación"}
    </div>
  );
}
export function Empty({
  children = "No hay registros para mostrar",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="placeholder">
      <PackageOpen size={34} />
      <strong>{children}</strong>
      <span>Los nuevos registros aparecerán aquí.</span>
    </div>
  );
}
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      {statuses[status] || status}
    </span>
  );
}
export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {isValidElement(children)
        ? cloneElement(
            children as ReactElement<{
              id: string;
              "aria-invalid": boolean;
              "aria-describedby"?: string;
            }>,
            {
              id,
              "aria-invalid": !!error,
              "aria-describedby": error ? id + "-error" : undefined,
            },
          )
        : children}
      {error && (
        <small id={id + "-error"} className="field-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const id = useId();
  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const nodes = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button,input,select,textarea,a[href]",
              ),
            ).filter((n) => !n.hasAttribute("disabled"));
            const first = nodes[0],
              last = nodes.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2 id={id}>{title}</h2>
          <button
            autoFocus
            className="icon-button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Confirm({
  label,
  description,
  onConfirm,
  danger = false,
}: {
  label: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>();
  return (
    <>
      <button
        className={danger ? "button danger" : "button secondary"}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      {open && (
        <Modal title={label} onClose={() => !pending && setOpen(false)}>
          <p>{description}</p>
          {error ? <ErrorBox error={error} /> : null}
          <footer>
            <button
              className="button secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button
              className={`button ${danger ? "danger" : ""}`}
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (e) {
                  setError(e);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Guardando…" : "Confirmar"}
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
export function Pagination({
  page,
  total,
  size = 20,
  setPage,
}: {
  page: number;
  total: number;
  size?: number;
  setPage: (p: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        {total
          ? `${page * size + 1}–${Math.min((page + 1) * size, total)} de ${total}`
          : "0 registros"}
      </span>
      <div>
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          disabled={(page + 1) * size >= total}
          onClick={() => setPage(page + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
export const date = (value: unknown) =>
  value
    ? new Date(
        String(value).length === 10
          ? String(value) + "T12:00:00"
          : String(value),
      ).toLocaleDateString("es-EC")
    : "—";
export const remaining = (days: number | null | undefined) =>
  days == null
    ? "Sin calcular"
    : days === 0
      ? "0 días"
      : days >= 365
        ? `${Math.floor(days / 365)} a ${Math.floor((days % 365) / 30)} m`
        : days >= 30
          ? `${Math.floor(days / 30)} meses`
          : `${days} días`;
