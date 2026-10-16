import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { afterEach, it, expect } from "vitest";
import { Pagination, remaining } from "./ui";
afterEach(cleanup);
it("navega a una ficha desde su enlace", () => {
  render(
    <MemoryRouter>
      <Link to="/assets/example">Abrir activo</Link>
      <Routes>
        <Route path="/assets/:id" element={<h1>Detalle del activo</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText("Abrir activo"));
  expect(screen.getByRole("heading")).toHaveTextContent("Detalle del activo");
});
it("distingue vida restante ausente de vida agotada", () => {
  expect(remaining(null)).toBe("Sin calcular");
  expect(remaining(0)).toBe("0 días");
});
it("bloquea la paginación fuera de límites", () => {
  render(<Pagination page={0} total={2} setPage={() => {}} />);
  expect(screen.getByText("Anterior")).toBeDisabled();
  expect(screen.getByText("Siguiente")).toBeDisabled();
});
