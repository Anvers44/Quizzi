import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:5173";

test("page d'accueil affiche les deux boutons", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByText("Créer une partie")).toBeVisible();
  await expect(page.getByText("Rejoindre")).toBeVisible();
});

test("clic Créer une partie → écran host", async ({ page }) => {
  await page.goto(BASE);
  await page.getByText("Créer une partie").click();
  await expect(
    page.getByRole("button", { name: /Créer une partie/i }),
  ).toBeVisible();
});

test("clic Rejoindre → formulaire avec champs", async ({ page }) => {
  await page.goto(BASE);
  await page.getByText("Rejoindre").click();
  await expect(page.getByPlaceholder("ABCDEF")).toBeVisible();
  await expect(page.getByPlaceholder("Ex: Alice")).toBeVisible();
});

test("code trop court → message d'erreur", async ({ page }) => {
  await page.goto(BASE);
  await page.getByText("Rejoindre").click();
  await page.getByPlaceholder("Ex: Alice").fill("TestUser");
  await page.getByRole("button", { name: /Rejoindre/i }).click();
  await expect(page.getByText("Le code doit faire 6 lettres")).toBeVisible();
});

test("pseudo vide → message d'erreur", async ({ page }) => {
  await page.goto(BASE);
  await page.getByText("Rejoindre").click();
  await page.getByPlaceholder("ABCDEF").fill("ABCDEF");
  await page.getByRole("button", { name: /Rejoindre/i }).click();
  await expect(page.getByText("Entre ton pseudo")).toBeVisible();
});
