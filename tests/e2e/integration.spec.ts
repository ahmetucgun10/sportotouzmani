import { test, expect } from "@playwright/test";
import { randomBytes } from "node:crypto";
test("PostgreSQL: registration, admin, coupons, tamper rejection and results", async ({
  page,
  browser,
}) => {
  test.skip(
    process.env.INTEGRATION_TEST !== "1",
    "Dedicated migrated PostgreSQL required",
  );
  const email = `test-${randomBytes(6).toString("hex")}@example.test`,
    password = randomBytes(24).toString("hex");
  const origin = "http://localhost:3000";
  expect(
    (
      await page.request.post("/api/register", {
        data: { email, password },
        headers: { Origin: "https://untrusted.test" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/register", {
        data: { email, password },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(201);
  await page.goto("/");
  await page.getByRole("button", { name: "Giriş / Kayıt" }).click();
  await page.getByLabel("E-posta", { exact: true }).fill(email);
  await page.getByLabel("Şifre", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hesabım", exact: true }),
  ).toBeVisible();
  expect(
    (
      await page.request.post("/api/admin/program", {
        data: { weeks: [] },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(403);
  const context = await browser.newContext();
  const admin = await context.newPage();
  await admin.goto("/");
  await admin.getByRole("button", { name: "Giriş / Kayıt" }).click();
  await admin
    .getByLabel("E-posta", { exact: true })
    .fill(process.env.SEED_ADMIN_EMAIL!);
  await admin
    .getByLabel("Şifre", { exact: true })
    .fill(process.env.SEED_ADMIN_PASSWORD!);
  await admin.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    admin.getByRole("button", { name: "Yönetim", exact: true }),
  ).toBeVisible();
  const matches = Array.from({ length: 15 }, (_, i) => ({
    matchNo: i + 1,
    home: `Ev ${i + 1}`,
    away: `Konuk ${i + 1}`,
    kickoff: "2099-01-01T00:00:00Z",
    finished: false,
    homeGoals: null as number | null,
    awayGoals: null as number | null,
  }));
  const program = { weeks: [{ season: "2026/2027", number: 1, matches }] };
  await admin.getByRole("button", { name: "Yönetim", exact: true }).click();
  await admin.getByLabel("Program JSON").fill(JSON.stringify(program));
  await admin.getByRole("button", { name: "Doğrula ve yükle" }).click();
  await expect(admin.getByRole("status")).toContainText("Program güncellendi");
  await page.reload();
  await expect(page.locator(".match")).toHaveCount(15);
  const weeks = await (await page.request.get("/api/weeks")).json();
  const weekId = weeks[0].id;
  const selections = Array.from({ length: 15 }, () => ["1"]);
  const data = {
    weekId,
    selections,
    columns: ["111111111111111"],
    guarantee: 15,
  };
  expect(
    (
      await page.request.post("/api/coupons", {
        data: {
          ...data,
          selections: selections.map((s, i) => (i === 0 ? ["1", "X"] : s)),
        },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/coupons", {
        data,
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await page.request.post("/api/coupons", {
        data: { ...data, columns: ["111111111111111", "111111111111111"] },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(400);
  const altered = structuredClone(program);
  altered.weeks[0].matches[0].home = "Değişmiş takım";
  expect(
    (
      await admin.request.post("/api/admin/program", {
        data: altered,
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(409);
  const results = structuredClone(program);
  results.weeks[0].matches = matches.map((m) => ({
    ...m,
    finished: true,
    homeGoals: 2,
    awayGoals: 1,
  }));
  expect(
    (
      await admin.request.post("/api/admin/program", {
        data: results,
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post("/api/coupons", {
        data,
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(409);
  const coupons = await (await page.request.get("/api/coupons")).json();
  expect(coupons[0].bestHits).toBe(15);
  expect((await page.request.get("/api/health")).status()).toBe(200);
  await context.close();
});
