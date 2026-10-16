import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Login } from "./Login";
import { api } from "../services/api";
vi.mock("../services/api", () => ({
  api: vi.fn(),
  refreshCsrf: vi.fn().mockResolvedValue(undefined),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("Inicio de sesión", () => {
  it("valida campos sin invocar la API", async () => {
    render(<Login onLogin={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(
      await screen.findByText("Ingresa tu contraseña"),
    ).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
  it("envía credenciales y abre la sesión", async () => {
    vi.mocked(api).mockResolvedValue({});
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);
    fireEvent.change(screen.getByLabelText("Correo empresarial"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "example-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    await waitFor(() => expect(onLogin).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith("/auth/login", "POST", {
      email: "admin@example.com",
      password: "example-password",
    });
  });
  it("muestra rechazo del servidor", async () => {
    vi.mocked(api).mockRejectedValue(
      new Error("Correo o contraseña incorrectos"),
    );
    render(<Login onLogin={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Correo empresarial"), {
      target: { value: "bad@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Contraseña"), {
      target: { value: "bad-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Entrar/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Correo o contraseña incorrectos",
    );
  });
});
