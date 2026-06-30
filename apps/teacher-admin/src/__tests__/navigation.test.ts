/**
 * NAV-DAILY-GATE-01: Test kontrak navigasi.
 */
import { describe, it, expect } from "vitest";
import { getPrimaryNavLabels, getMobileNavLabels, GATE_GROUPS } from "../shared/layout/navigation";

describe("NAV-DAILY-GATE-01 — Kontrak menu utama", () => {
  it("Sidebar menampilkan Absen", () => { expect(getPrimaryNavLabels()).toContain("Absen"); });
  it("Sidebar menampilkan Jurnal", () => { expect(getPrimaryNavLabels()).toContain("Jurnal"); });
  it("Sidebar menampilkan Nilai", () => { expect(getPrimaryNavLabels()).toContain("Nilai"); });
  it("Sidebar menampilkan Guru Piket", () => { expect(getPrimaryNavLabels()).toContain("Guru Piket"); });
  it("Sidebar menampilkan Paket Admin", () => { expect(getPrimaryNavLabels()).toContain("Paket Admin"); });
  it("Sidebar TIDAK menampilkan modul besar langsung", () => {
    const labels = getPrimaryNavLabels();
    expect(labels).not.toContain("Prota Resmi");
    expect(labels).not.toContain("Promes");
    expect(labels).not.toContain("RPP / Modul Ajar");
    expect(labels).not.toContain("LKPD");
    expect(labels).not.toContain("Remedial");
  });
  it("Menu utama tepat 5 item", () => {
    expect(getPrimaryNavLabels()).toEqual(["Absen", "Jurnal", "Nilai", "Guru Piket", "Paket Admin"]);
  });
  it("Mobile nav maksimal 5 item", () => { expect(getMobileNavLabels().length).toBeLessThanOrEqual(5); });
  it("Mobile nav tidak ada Lainnya", () => { expect(getMobileNavLabels()).not.toContain("Lainnya"); });
});

describe("NAV-DAILY-GATE-01 — Gerbang Paket Admin", () => {
  it("GATE_GROUPS punya 5 kelompok", () => {
    expect(GATE_GROUPS).toHaveLength(5);
    expect(GATE_GROUPS[0].title).toContain("A.");
    expect(GATE_GROUPS[4].title).toContain("E.");
  });
  it("Gerbang punya kartu ke modul tersembunyi", () => {
    const labels = GATE_GROUPS.flatMap((g) => g.cards.map((c) => c.label));
    expect(labels).toContain("Profil Sekolah/Guru");
    expect(labels).toContain("Backup/Restore");
    expect(labels).toContain("Prota");
    expect(labels).toContain("RPP / Modul Ajar");
    expect(labels).toContain("Remedial");
    expect(labels).toContain("Promes");
    expect(labels).toContain("LKPD");
  });
});
