import { expect, test } from "@playwright/test";

// These tests deliberately use the running Gateway and never intercept API responses.
test.describe("Frontend connected to the local Gateway", () => {
  test.skip(process.env["LIVE_GATEWAY_TEST"] !== "1", "Enable explicitly for a real local stack.");

  test("public catalog and offers agree with Gateway responses", async ({ page, request }) => {
    const upstreamBranches = await request.get("http://127.0.0.1:8080/api/v1/branches/catalog");
    expect(upstreamBranches.status()).toBe(200);
    const branches = (await upstreamBranches.json()) as { branchId: number; name: string }[];
    const frontendBranches = await request.get("/api/journey/branches");
    expect(frontendBranches.status()).toBe(200);
    expect(await frontendBranches.json()).toEqual(
      branches.map(({ branchId, name }) => ({ id: branchId, name })),
    );

    const upstreamTrips = await request.get("http://127.0.0.1:8080/api/v1/trips");
    expect(upstreamTrips.status()).toBe(200);
    const trips = (await upstreamTrips.json()) as {
      tripId: number;
      originBranchId: number;
      destinationBranchId: number;
      departureAt: string;
      seatsAvailable: number | null;
    }[];
    const frontendTrips = await request.get("/api/journey/trips");
    expect(frontendTrips.status()).toBe(200);
    const visible = (await frontendTrips.json()) as typeof trips;
    expect(visible.map((trip) => trip.tripId)).toEqual(trips.map((trip) => trip.tripId));
    if (trips.length === 0) return;

    const trip = trips[0]!;
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Guatemala",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(trip.departureAt));
    const part = (name: string) => local.find((item) => item.type === name)?.value;
    const date = `${part("year")}-${part("month")}-${part("day")}`;
    await page.goto("/trips");
    await expect(
      page.getByLabel("Origen").locator(`option[value="${trip.originBranchId}"]`),
    ).toHaveCount(1);
    await page.getByLabel("Origen").selectOption(String(trip.originBranchId));
    await page.getByLabel("Destino").selectOption(String(trip.destinationBranchId));
    await page.getByLabel("Fecha del viaje").fill(date);
    await page.getByRole("button", { name: "Buscar viajes" }).click();
    const card = page.locator("article").filter({ hasText: `Viaje #${trip.tripId}` });
    await expect(card).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
    if (trip.seatsAvailable === null) {
      await expect(card).toContainText("Disponibilidad por confirmar");
      await expect(card.getByRole("link", { name: "Consultar asientos" })).toBeVisible();
    }
  });

  test("a visitor sees a real login rejection and cannot access private APIs", async ({
    page,
    request,
  }) => {
    const privateResponse = await request.get("/api/admin/users");
    expect(privateResponse.status()).toBe(401);
    await page.goto("/login");
    await page.getByLabel("Correo electrónico").fill("nonexistent-gateway-test@example.invalid");
    await page.getByLabel("Contraseña", { exact: true }).fill("invalid-test-password");
    const rejection = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    expect((await rejection).status()).toBe(401);
    await expect(page.getByRole("status")).toBeVisible();
    expect((await page.context().cookies()).some((cookie) => cookie.name === "access_token")).toBe(
      false,
    );
  });
});
