// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { studio } from "../../services/studio";
import { useSession } from "../../stores/session";
import { authenticate } from "../../tenants";
import { seed } from "../../mocks/studio";

beforeEach(() => {
  localStorage.clear();
  useSession.getState().logout();
});

describe("estúdios e sessão", () => {
  it("autentica as contas demo", () => {
    expect(authenticate(" YANNIS@demo.app ", "demo123")).toBe("yannis");
    expect(useSession.getState().login("lumi@demo.app", "errada")).toBe(false);
    expect(useSession.getState().login("YANNIS@demo.app ", "demo123")).toBe(
      true,
    );
    expect(useSession.getState().tenantId).toBe("yannis");
  });

  it("isola os dados de cada estúdio", async () => {
    useSession.getState().login("yannis@demo.app", "demo123");
    const base = (await studio.get()).clients[1];
    await studio.addClient({ ...base, id: "iso", name: "Teste Isolado" });
    expect(
      (await studio.get()).clients.some((c) => c.name === "Teste Isolado"),
    ).toBe(true);
    useSession.getState().logout();
    useSession.getState().login("lumi@demo.app", "demo123");
    const lumi = await studio.get();
    expect(lumi.settings.studio).toBe("Lumi Estética Avançada");
    expect(lumi.clients.some((c) => c.name === "Teste Isolado")).toBe(false);
    expect(localStorage.getItem("studio-data-v3-lumi")).not.toContain(
      "Teste Isolado",
    );
  });

  it("exige sessão para ler dados", async () => {
    await expect(studio.get()).rejects.toThrow("Sessão expirada.");
  });

  it("gera bases fictícias distintas e coerentes", () => {
    const y = seed("yannis");
    const l = seed("lumi");
    const names = new Set(y.clients.map((c) => c.name));
    expect(l.clients.some((c) => names.has(c.name))).toBe(false);
    for (const d of [y, l]) {
      expect(d.payments.length).toBeGreaterThan(5);
      expect(d.payments.some((p) => p.installments.length > 1)).toBe(true);
      expect(d.stock.filter((i) => i.qty <= i.min).length).toBe(2);
      expect(d.followUps.length).toBeGreaterThan(5);
      expect(d.coupons.length).toBe(2);
      expect(d.clients.some((c) => c.referredBy)).toBe(true);
    }
    expect(l.coupons.find((c) => c.code === "LUMI15")?.pct).toBe(15);
    expect(y.coupons.find((c) => c.code === "FLASH10")?.pct).toBe(10);
    expect(l.settings.procedures.map((p) => p.returnDays)).toEqual([
      120, 270, 180, 30,
    ]);
  });
});
