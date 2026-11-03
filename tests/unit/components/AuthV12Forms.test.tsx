import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "@/app/(public)/register/page";
import { PasswordSetupForm } from "@/components/domain/PasswordSetupForm";

describe("SSOT v12 access forms", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/register");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/");
  });
  it("prefills Notification hints and keeps only the supplied NIT read-only", async () => {
    window.history.replaceState(null, "", "/register?name=Ana&email=ana%40example.com&nit=1234567");
    render(<RegisterPage />);
    await waitFor(() => expect(screen.getByLabelText("NIT")).toHaveValue("1234567"));
    expect(screen.getByLabelText("NIT")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Nombre")).toHaveValue("Ana");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("ana@example.com");
    expect(screen.getByLabelText("Correo electrónico")).not.toHaveAttribute("readonly");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not accept duplicate or CF hints as a personal identity", () => {
    window.history.replaceState(null, "", "/register?name=A&name=B&nit=CF&email=invalid");
    render(<RegisterPage />);
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("NIT")).not.toHaveAttribute("readonly");
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("");
  });
  it.each(["first-login", "recovery"] as const)(
    "uses an opaque link token without requiring a session: %s",
    async (mode) => {
      window.history.replaceState(null, "", "/auth/reset-password?token=synthetic-opaque-token");
      fetchMock.mockResolvedValueOnce(Response.json({ status: "reset" }));
      render(<PasswordSetupForm mode={mode} />);
      expect(window.location.search).not.toContain("token");
      expect(screen.queryByLabelText("Código de recuperación")).not.toBeInTheDocument();
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Nueva contraseña"), "new-password-123");
      await user.type(screen.getByLabelText("Confirmar contraseña"), "new-password-123");
      const button = screen.getByRole("button", { name: /contraseña/i });
      await user.click(button);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
      expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({
        token: "synthetic-opaque-token",
        password: "new-password-123",
        confirmPassword: "new-password-123",
      });
      expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toHaveAttribute(
        "href",
        "/login",
      );
    },
  );
});
