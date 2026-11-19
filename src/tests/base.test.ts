import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("usa a base do build na referência de exemplo", async () => {
  vi.stubEnv("BASE_URL", "/repo/");
  vi.resetModules();
  const { seed, sampleReference } = await import("../mocks/studio");
  expect(sampleReference).toBe("/repo/referencia-botanica.svg");
  expect(seed().clients[0].references).toEqual([
    "/repo/referencia-botanica.svg",
  ]);
});
