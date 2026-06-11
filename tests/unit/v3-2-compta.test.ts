import { describe, expect, it } from "vitest";
import { dossierWorkspaceTabs } from "../../lib/cabinet-refonte/v2-6";
import { demoFecContent, parseFec, trialBalanceFromFec } from "../../lib/compta/fec";
import { buildSciSnapshot } from "../../lib/compta/sci-accounting";
import { evidenceSources } from "../../lib/evidence/sources";
import { demoSciTrialBalance, FixturePennylaneClient } from "../../lib/integrations/pennylane";
import { ruleVersions } from "../../lib/rules/rule-versions";
import { computeIs } from "../../lib/tax/engines/is";

describe("V3.2 — brique compta SCI", () => {
  it("classe la balance Pennylane fixture vers les lignes 2072", () => {
    const snapshot = buildSciSnapshot(demoSciTrialBalance);
    expect(snapshot.rentalIncome).toBe(30_000);
    expect(snapshot.deductibleCharges).toBe(12_500);
    expect(snapshot.loanInterest).toBe(4_500);
    expect(snapshot.depreciation).toBe(6_250);
    expect(snapshot.partnerCurrentAccounts).toBe(25_000);
    expect(snapshot.rentalResultAtIr).toBe(17_500);
    expect(snapshot.form2072Lines.find((line) => line.code === "R4")?.amount).toBe(17_500);
  });

  it("produit un résultat 2065 cohérent avec le moteur is.ts", () => {
    const snapshot = buildSciSnapshot(demoSciTrialBalance);
    expect(snapshot.accountingResult).toBe(11_250);
    const expectedIs = computeIs({ profit: 11_250, turnover: 30_000 });
    expect(snapshot.form2065.isAmount).toBe(expectedIs.totalIs);
    expect(snapshot.form2065.isAmount).toBe(1_688);
  });

  it("lève les flags TVA/CRL/CFE à qualifier", () => {
    const snapshot = buildSciSnapshot(demoSciTrialBalance);
    expect(snapshot.flags.vatOnRents).toBe(false);
    expect(snapshot.flags.crlDue).toBe(true);
    expect(snapshot.flags.cfeDue).toBe(false);
    expect(snapshot.reviewRequired).toBe(true);

    const bigRental = buildSciSnapshot([
      { account: "706000", label: "Loyers", debit: 0, credit: 150_000 },
    ]);
    expect(bigRental.flags.cfeDue).toBe(true);
  });

  it("parse le FEC fixture et reconstruit la même classification", () => {
    const entries = parseFec(demoFecContent);
    expect(entries.length).toBe(9);
    const snapshot = buildSciSnapshot(trialBalanceFromFec(entries), {
      source: "fec-import-simule",
    });
    expect(snapshot.rentalIncome).toBe(30_000);
    expect(snapshot.rentalResultAtIr).toBe(17_500);
    expect(snapshot.accountingResult).toBe(11_250);
    expect(snapshot.source).toBe("fec-import-simule");
  });

  it("tolère le séparateur pipe et rejette un contenu sans en-tête FEC", () => {
    const piped = demoFecContent.replaceAll("\t", "|");
    expect(parseFec(piped).length).toBe(9);
    expect(parseFec("pas un fec\njuste du texte")).toEqual([]);
  });

  it("expose un client Pennylane fixture sans variable d'environnement", async () => {
    const client = new FixturePennylaneClient();
    const balance = await client.fetchTrialBalance();
    const journals = await client.fetchJournalSummary();
    expect(balance.length).toBeGreaterThan(5);
    expect(journals.some((journal) => journal.journal.includes("OD"))).toBe(true);
  });

  it("déclare règle, sources et onglet dossier", () => {
    expect(ruleVersions.some((rule) => rule.id === "rule-compta-sci-2026-v1")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-impots-liasse-2072-2026")).toBe(true);
    expect(evidenceSources.some((source) => source.id === "src-impots-liasse-2065-2026")).toBe(true);
    expect(
      evidenceSources.some(
        (source) => source.id === "src-pennylane-api-v2-2026" && source.reliability === "professional",
      ),
    ).toBe(true);
    expect(dossierWorkspaceTabs.some((tab) => tab.id === "tab-compta-sci")).toBe(true);
  });
});
