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
    [categorySearch, setCategorySearch] = useState(""),
    [specificResponsible, setSpecificResponsible] = useState(
      !!initial?.digital?.responsible_employee_id,
    ),
    [newCategory, setNewCategory] = useState(""),
    [creatingCategory, setCreatingCategory] = useState(false);
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
    setValue,
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
      <select {...register(name)} value={String(watch(name) ?? "")}>
        <option value="">Seleccionar…</option>
        {initial &&
          watch(name) &&
          watch(name) !== "__other__" &&
          !rows.some((r) => r.id === watch(name)) && (
            <option value={String(watch(name))}>
              {initial[name.replace(/Id$/, "_name")] || "Registro actual"}{" "}
              (inactivo)
            </option>
          )}
        {name === "categoryId" && (
          <option value="__other__">Otros / Crear categoría…</option>
        )}
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
    const responsibleKey =
      assetKind === "HARDWARE" ? "employeeId" : "responsibleEmployeeId";
    if (
      specificResponsible &&
      (!id || assetKind === "DIGITAL") &&
      !v[responsibleKey]
    ) {
      fieldError(responsibleKey, { message: "Selecciona un responsable" });
      return;
    }
    const payload = {
      ...v,
      employeeId: specificResponsible ? v.employeeId : null,
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
                storagePlace: v.storagePlace,
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
              managementUrl: v.managementUrl,
              licenseType: v.licenseType,
              contractReference: v.contractReference,
              activationDate: v.activationDate,
              expirationDate: v.expirationDate,
              autoRenew: v.autoRenew,
              renewalCost: v.renewalCost,
              seats: v.seats,
              responsibleEmployeeId: specificResponsible
                ? v.responsibleEmployeeId
                : null,
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
        setSpecificResponsible(false);
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
              <select
                disabled={!!id}
                {...register("assetKind")}
                onChange={(e) => {
                  register("assetKind").onChange(e);
                  setValue("categoryId", "");
                  setValue("employeeId", "");
                  setValue("responsibleEmployeeId", "");
                  setSpecificResponsible(false);
                  setCategorySearch("");
                }}
              >
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
            {watch("categoryId") === "__other__" && (
              <div>
                <Field label="Nombre de la nueva categoría">
                  <input
                    value={newCategory}
                    maxLength={160}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  className="button secondary"
                  disabled={creatingCategory || !newCategory.trim()}
                  onClick={async () => {
                    setCreatingCategory(true);
                    setError(undefined);
                    try {
                      const category = await api(
                        orgPath(org.id, "/categories"),
                        "POST",
                        { name: newCategory.trim(), assetKind, active: true },
                      );
                      await client.invalidateQueries({
                        queryKey: [org.id, "lookups"],
                      });
                      setCategorySearch("");
                      setValue("categoryId", category.id, {
                        shouldValidate: true,
                      });
                      setNewCategory("");
                    } catch (e) {
                      setError(e);
                    } finally {
                      setCreatingCategory(false);
                    }
                  }}
                >
                  Añadir categoría
                </button>
              </div>
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
            {assetKind === "HARDWARE" ? (
              <>
                {select("locationId", "Ubicación física", q.data?.locations)}
                {input(
                  "storagePlace",
                  "Lugar de almacenamiento (bodega, estante o puesto)",
                )}
              </>
            ) : (
              input(
                "managementUrl",
                "Portal o referencia de gestión (sin credenciales)",
              )
            )}
            {id && assetKind === "HARDWARE" && (
              <p className="muted">
                Responsable:{" "}
                {initial?.assigned_employee || "custodia de la organización"}.
                Usa Entregar, Transferir o Devolver en la ficha para cambiarlo y
                conservar su historial.
              </p>
            )}
            {(!id || assetKind === "DIGITAL") && (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={specificResponsible}
                    onChange={(e) => {
                      setSpecificResponsible(e.target.checked);
                      if (!e.target.checked) {
                        setValue("employeeId", "");
                        setValue("responsibleEmployeeId", "");
                      }
                    }}
                  />
                  Este activo tiene un responsable específico
                </label>
                {!specificResponsible && (
                  <p className="muted">
                    Custodia de {org.name}. Puedes asignar un responsable más
                    adelante.
                  </p>
                )}
              </>
            )}
            {assetKind === "DIGITAL" &&
              specificResponsible &&
              select(
                "responsibleEmployeeId",
                "Responsable administrativo *",
                q.data?.employees,
              )}
            {!id && assetKind === "HARDWARE" && specificResponsible && (
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
                  "Asignar ahora *",
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
            disabled={
              isSubmitting ||
              creatingCategory ||
              watch("categoryId") === "__other__" ||
              q.isPending ||
              !!q.error
            }
          >
            <Save size={17} />
            {isSubmitting ? "Guardando…" : "Guardar activo"}
          </button>
        </div>
      </form>
    </>
  );
}
