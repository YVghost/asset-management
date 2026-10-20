let csrf: { token: string; headerName: string } | undefined;
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
export async function refreshCsrf() {
  const res = await fetch("/api/v1/auth/csrf", { credentials: "same-origin" });
  if (!res.ok)
    throw new ApiError("No se pudo conectar al servidor", res.status);
  csrf = await res.json();
}
export async function api<T = any>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  if (method !== "GET" && !csrf) await refreshCsrf();
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "same-origin",
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" && csrf ? { [csrf.headerName]: csrf.token } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "El servidor no está disponible" }));
    throw new ApiError(
      error.message || "No se pudo completar la operación",
      response.status,
      error.fields,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const orgPath = (org: string, path: string) =>
  `/organizations/${org}${path}`;
export async function allPages(org: string, path: string, activeOnly = true) {
  let page = 0;
  let rows: any[] = [];
  let total = 0;
  do {
    const result = await api(
      orgPath(
        org,
        `${path}${path.includes("?") ? "&" : "?"}size=100&page=${page}&activeOnly=${activeOnly}`,
      ),
    );
    rows = rows.concat(result.content);
    total = result.totalElements;
    page++;
  } while (rows.length < total);
  return rows;
}
export async function upload(path: string, file: File) {
  if (!csrf) await refreshCsrf();
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/v1" + path, {
    method: "POST",
    credentials: "same-origin",
    headers: { [csrf!.headerName]: csrf!.token },
    body,
  });
  if (!res.ok) {
    const error = await res
      .json()
      .catch(() => ({ message: "No se pudo cargar la imagen" }));
    throw new ApiError(
      error.message || "No se pudo cargar la imagen",
      res.status,
    );
  }
}
