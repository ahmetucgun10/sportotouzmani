import { test, expect } from "@playwright/test";
const matches = Array.from({ length: 15 }, (_, i) => ({
  matchNo: i + 1,
  home: `Ev ${i + 1}`,
  away: `Konuk ${i + 1}`,
  kickoff: "2099-01-01T00:00:00Z",
  finished: false,
  homeGoals: null,
  awayGoals: null,
}));
test.beforeEach(async ({ page }) => {
  await page.route("**/api/me", (r) => r.fulfill({ json: null }));
  await page.route("**/api/weeks", (r) =>
    r.fulfill({
      json: [{ id: "week", season: "2026/2027", number: 1, matches }],
    }),
  );
});
test("renders all 15 matches and worker generates a column", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".match")).toHaveCount(15);
  await page.getByRole("button", { name: "Kolonları hesapla" }).click();
  await expect(page.getByRole("status")).toContainText("1 kolondan 1 kolon");
  await expect(
    page.getByRole("button", { name: "Kuponu kaydet" }),
  ).toBeDisabled();
});
test("full system guarantees are calculated in worker", async ({ page }) => {
  await page.goto("/");
  await page
    .locator(".match")
    .first()
    .getByRole("button", { name: "X", exact: true })
    .click();
  await page.getByLabel("Garanti", { exact: true }).selectOption("14");
  await page.getByRole("button", { name: "Kolonları hesapla" }).click();
  await expect(page.getByRole("status")).toContainText("2 kolondan 1 kolon");
  await expect(page.locator("summary")).toContainText(
    "14 doğru kapsama doğrulandı",
  );
});
test("restrictive filters cannot claim a guarantee", async ({ page }) => {
  await page.goto("/");
  await page
    .locator(".match")
    .first()
    .getByRole("button", { name: "X", exact: true })
    .click();
  await page.getByLabel("En çok beraberlik").fill("0");
  await page.getByLabel("Garanti", { exact: true }).selectOption("14");
  await page.getByRole("button", { name: "Kolonları hesapla" }).click();
  await expect(page.getByRole("status")).toContainText("garanti verilemez");
});
test("empty program does not show fabricated matches", async ({ page }) => {
  await page.route("**/api/weeks", (r) => r.fulfill({ json: [] }));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Henüz program yüklenmedi" }),
  ).toBeVisible();
  await expect(page.locator(".match")).toHaveCount(0);
});
test("mobile navigation exposes registration but not admin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Giriş / Kayıt" }).click();
  await expect(page.getByLabel("E-posta", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Yönetim", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
});
