import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, CheckCircle2 } from "lucide-react";
import { api, orgPath, allPages, ApiError } from "../services/api";
import { useSession, useCanWrite } from "../hooks/session";
import { Field, ErrorBox, Loading } from "../components/ui";
import {
  assetSchema,
  blankAsset,
  type AssetFormValues,
  type AssetFormOutput,
} from "../features/assetSchema";
import type { Row } from "../types";
export function AssetForm() {
  const { id } = useParams(),
    { org } = useSession();
  const canWrite = useCanWrite();
  const [params] = useSearchParams();
  const q = useQuery({
    queryKey: [org.id, "asset", id],
    queryFn: () => api(orgPath(org.id, "/assets/" + id)),
    enabled: !!id,
  });
  if (!canWrite)
    return (
      <ErrorBox
        error={new Error("Tu cuenta solo tiene permisos de consulta")}
      />
    );
  if (id && q.isPending) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  return (
    <AssetEditor
      key={org.id + String(id)}
      id={id}
      initial={q.data}
      kind={params.get("kind") || "HARDWARE"}
    />
  );
}
function AssetEditor({
  id,
  initial,
  kind,
}: {
  id?: string;
  initial?: Row;
  kind: string;
}) {
  const { org } = useSession(),
    client = useQueryClient(),
    navigate = useNavigate();
  const [error, setError] = useState<unknown>(),
    [success, setSuccess] = useState(false),
    [another, setAnother] = useState(false),
    [employeeSearch, setEmployeeSearch] = useState(""),
    [categorySearch, setCategorySearch] = useState("");
  const defaults = { ...blankAsset, assetKind: kind as "HARDWARE" | "DIGITAL" };
  if (initial) {
    for (const key of Object.keys(defaults)) {
      const snake = key.replace(/[A-Z]/g, (s) => "_" + s.toLowerCase());
      if (initial[snake] != null)
        (defaults as any)[key] = String(initial[snake]);
    }
    for (const key of Object.keys(initial.hardware || initial.digital || {})) {
      const camel = key.replace(/_([a-z])/g, (_, s) => s.toUpperCase());
      if (camel in defaults)
        (defaults as any)[camel] =
          typeof (initial.hardware || initial.digital)[key] === "boolean"
            ? (initial.hardware || initial.digital)[key]
            : String((initial.hardware || initial.digital)[key] ?? "");
    }
    Object.assign(defaults, initial.hardware?.specifications || {});
  }
  const {
    register,
    watch,
    handleSubmit,
    reset,
    setError: fieldError,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormValues, unknown, AssetFormOutput>({
    resolver: zodResolver(assetSchema),
    defaultValues: defaults,
  });
  const assetKind = watch("assetKind");
  const q = useQuery({
    queryKey: [org.id, "lookups"],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          [
            "categories",
            "employees",
            "departments",
            "locations",
            "suppliers",
          ].map(async (t) => [t, await allPages(org.id, "/" + t)]),
        ),
      ),
  });
  const input = (name: keyof AssetFormValues, label: string, type = "text") => (
    <Field label={label} error={errors[name]?.message}>
      <input
        type={type}
        {...register(name)}
        step={type === "number" ? "0.01" : undefined}
      />
    </Field>
  );
  const select = (
    name: keyof AssetFormValues,
    label: string,
    rows: Row[] = [],
  ) => (
    <Field label={label} error={errors[name]?.message}>
      <select {...register(name)}>
        <option value="">Seleccionar…</option>
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name || `${r.first_name} ${r.last_name} · ${r.employee_code}`}
          </option>
        ))}
      </select>
    </Field>
  );
  async function save(v: AssetFormOutput) {
    setError(undefined);
    setSuccess(false);
    const payload = {
      ...v,
      hardware:
        assetKind === "HARDWARE"
          ? {
              brand: v.brand,
              model: v.model,
              serialNumber: v.serialNumber,
              patrimonialTag: v.patrimonialTag,
              physicalCondition: v.physicalCondition,
              warrantyEndDate: v.warrantyEndDate,
              specifications: {
                processor: v.processor,
                ram: v.ram,
                storage: v.storage,
                storageType: v.storageType,
                operatingSystem: v.operatingSystem,
                architecture: v.architecture,
                hostname: v.hostname,
              },
            }
          : null,
      digital:
        assetKind === "DIGITAL"
          ? {
              product: v.product,
              licenseType: v.licenseType,
              contractReference: v.contractReference,
              activationDate: v.activationDate,
              expirationDate: v.expirationDate,
              autoRenew: v.autoRenew,
              renewalCost: v.renewalCost,
              seats: v.seats,
              responsibleEmployeeId: v.responsibleEmployeeId,
            }
          : null,
    };
    try {
      const result = await api(
        orgPath(
          org.id,
          `/${assetKind === "HARDWARE" ? "hardware-assets" : "digital-assets"}${id ? "/" + id : ""}`,
        ),
        id ? "PUT" : "POST",
        payload,
      );
      await client.invalidateQueries();
      if (another && !id) {
        reset({
          ...blankAsset,
          assetKind,
          departmentId: v.departmentId || "",
          locationId: v.locationId || "",
          categoryId: v.categoryId,
        });
        setSuccess(true);
        window.scrollTo(0, 0);
      } else navigate("/assets/" + result.id);
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.fields)
        for (const [key, msg] of Object.entries(e.fields))
          fieldError(key as keyof AssetFormValues, { message: msg });
    }
  }
  return (
    <>
      <Link className="back-link" to={id ? "/assets/" + id : "/assets"}>
        <ArrowLeft size={16} />
        Volver al inventario
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">REGISTRO DE INVENTARIO</span>
          <h1>{id ? "Editar activo" : "Nuevo activo"}</h1>
          <p>
            Completa la información disponible. Podrás actualizarla más
            adelante.
          </p>
        </div>
      </div>
      {success && (
        <div className="success">
          <CheckCircle2 />
          Activo registrado. Puedes continuar con el siguiente.
        </div>
      )}
      {q.error ? <ErrorBox error={q.error} /> : null}
      <form onSubmit={handleSubmit(save)} className="asset-form">
        <section className="panel form-section">
          <div className="section-title">
            <span>01</span>
            <div>
              <h2>Información general</h2>
              <p>Identifica el recurso dentro de tu empresa.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Tipo de activo">
              <select disabled={!!id} {...register("assetKind")}>
                <option value="HARDWARE">Hardware</option>
                <option value="DIGITAL">Activo digital</option>
              </select>
            </Field>
            {input("assetCode", "Código de inventario *")}
            {input("name", "Nombre del activo *")}
            <Field label="Buscar categoría">
              <input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Filtrar categorías…"
              />
            </Field>
            {select(
              "categoryId",
              "Categoría *",
              q.data?.categories?.filter(
                (r: Row) =>
                  r.asset_kind === assetKind &&
                  r.name.toLowerCase().includes(categorySearch.toLowerCase()),
              ),
            )}
            <Field label="Descripción">
              <textarea {...register("description")} rows={2} />
            </Field>
          </div>
        </section>
        <section className="panel form-section">
          <div className="section-title">
            <span>02</span>
            <div>
              <h2>
                {assetKind === "HARDWARE"
                  ? "Datos técnicos"
                  : "Licencia y servicio"}
              </h2>
              <p>
                {assetKind === "HARDWARE"
                  ? "Las especificaciones son opcionales para periféricos."
                  : "Registra referencias contractuales sin contraseñas ni claves privadas."}
              </p>
            </div>
          </div>
          <div className="form-grid">
            {assetKind === "HARDWARE" ? (
              <>
                {input("brand", "Marca")}
                {input("model", "Modelo")}
                {input("serialNumber", "Número de serie")}
                {input("patrimonialTag", "Etiqueta patrimonial")}
                {input("processor", "Procesador")}
                {input("ram", "Memoria RAM")}
                {input("storage", "Almacenamiento")}
                {input("storageType", "Tipo de almacenamiento")}
                {input("operatingSystem", "Sistema operativo")}
                {input("architecture", "Arquitectura / tipo")}
                {input("hostname", "Hostname")}
                <Field label="Estado físico">
                  <select {...register("physicalCondition")}>
                    <option value="NEW">Nuevo</option>
                    <option value="GOOD">Bueno</option>
                    <option value="FAIR">Regular</option>
                    <option value="DAMAGED">Dañado</option>
                  </select>
                </Field>
                {input("warrantyEndDate", "Fin de garantía", "date")}
              </>
            ) : (
              <>
                {input("product", "Producto o servicio")}
                {input("licenseType", "Tipo de licencia")}
                {input(
                  "contractReference",
                  "Referencia contractual no secreta",
                )}
                {input("activationDate", "Fecha de activación", "date")}
                {input("expirationDate", "Vencimiento", "date")}
                {input("renewalCost", "Costo de renovación")}
                {input("seats", "Puestos contratados")}
                <Field label="Renovación automática">
                  <input type="checkbox" {...register("autoRenew")} />
                </Field>
                <Field label="Buscar responsable">
                  <input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Nombre o código…"
                  />
                </Field>
                {select(
                  "responsibleEmployeeId",
                  "Responsable",
                  q.data?.employees?.filter((r: Row) =>
                    `${r.first_name} ${r.last_name} ${r.employee_code}`
                      .toLowerCase()
                      .includes(employeeSearch.toLowerCase()),
                  ),
                )}
              </>
            )}
          </div>
        </section>
        <section className="panel form-section">
          <div className="section-title">
            <span>03</span>
            <div>
              <h2>Compra y ciclo de vida</h2>
              <p>
                La garantía y la vida útil se calculan de forma independiente.
              </p>
            </div>
          </div>
          <div className="form-grid">
            {input("acquisitionDate", "Fecha de adquisición", "date")}
            {input("acquisitionCost", "Costo de adquisición")}
            {input("currency", "Moneda")}
            {select("supplierId", "Proveedor", q.data?.suppliers)}
            {input("invoiceReference", "Factura o referencia")}
            {input("inServiceDate", "Entrada en servicio", "date")}
            {input("usefulLifeMonths", "Vida útil estimada (meses)")}
          </div>
        </section>
        <section className="panel form-section">
          <div className="section-title">
            <span>04</span>
            <div>
              <h2>Ubicación y responsable</h2>
              <p>
                Organiza el activo y registra su entrega inicial si corresponde.
              </p>
            </div>
          </div>
          <div className="form-grid">
            {select("departmentId", "Departamento", q.data?.departments)}
            {select("locationId", "Ubicación física", q.data?.locations)}
            {!id && assetKind === "HARDWARE" && (
              <>
                <Field label="Buscar empleado">
                  <input
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Nombre o código…"
                  />
                </Field>
                {select(
                  "employeeId",
                  "Asignar ahora (opcional)",
                  q.data?.employees?.filter((r: Row) =>
                    `${r.first_name} ${r.last_name} ${r.employee_code}`
                      .toLowerCase()
                      .includes(employeeSearch.toLowerCase()),
                  ),
                )}
              </>
            )}
            <Field label="Observaciones">
              <textarea rows={3} {...register("notes")} />
            </Field>
          </div>
        </section>
        {error ? <ErrorBox error={error} /> : null}
        <div className="form-actions">
          {!id && (
            <label className="checkbox">
              <input
                type="checkbox"
                checked={another}
                onChange={(e) => setAnother(e.target.checked)}
              />
              Continuar registrando otro activo
            </label>
          )}
          <Link
            className="button secondary"
            to={id ? "/assets/" + id : "/assets"}
          >
            Cancelar
          </Link>
          <button
            className="button"
            disabled={isSubmitting || q.isPending || !!q.error}
          >
            <Save size={17} />
            {isSubmitting ? "Guardando…" : "Guardar activo"}
          </button>
        </div>
      </form>
    </>
  );
}
