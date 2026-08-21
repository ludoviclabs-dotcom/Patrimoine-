import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReportSnapshot } from "./snapshot";

/**
 * Server-rendered report template.
 *
 * It receives the immutable snapshot and nothing else — no database handle, no
 * request, no live UI state. Rendering is therefore a pure function of the
 * snapshot, which is what makes the PDF hash reproducible.
 */

const palette = {
  ink: "#1a2b22",
  muted: "#6b7068",
  rule: "#e5dccb",
  warn: "#b0823c",
  warnSurface: "#f6ecd7",
  ok: "#2f6b4f",
};

const styles = StyleSheet.create({
  page: { padding: 36, paddingBottom: 64, fontSize: 9, fontFamily: "Helvetica", color: palette.ink },
  watermark: {
    position: "absolute",
    top: 320,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 34,
    fontFamily: "Helvetica-Bold",
    color: palette.warn,
    opacity: 0.18,
  },
  eyebrow: { fontSize: 7.5, letterSpacing: 1.5, textTransform: "uppercase", color: palette.muted },
  coverTitle: { fontSize: 22, marginTop: 6, fontFamily: "Helvetica-Bold" },
  coverSubtitle: { fontSize: 10, marginTop: 4, color: palette.muted },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `1 solid ${palette.rule}`,
  },
  banner: {
    marginTop: 14,
    padding: 8,
    backgroundColor: palette.warnSurface,
    border: `1 solid ${palette.warn}`,
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  validatedBanner: {
    marginTop: 14,
    padding: 8,
    backgroundColor: "#eef5f0",
    border: `1 solid ${palette.ok}`,
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  row: { flexDirection: "row", borderBottom: `0.5 solid ${palette.rule}`, paddingVertical: 3 },
  headerRow: { flexDirection: "row", borderBottom: `1 solid ${palette.ink}`, paddingBottom: 3 },
  cell: { paddingRight: 6 },
  headerCell: { paddingRight: 6, fontFamily: "Helvetica-Bold", fontSize: 7.5, textTransform: "uppercase" },
  definitionRow: { flexDirection: "row", paddingVertical: 2 },
  definitionLabel: { width: 150, color: palette.muted },
  definitionValue: { flex: 1 },
  bullet: { marginBottom: 3, lineHeight: 1.4 },
  mono: { fontFamily: "Courier", fontSize: 7.5 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 6.5,
    color: palette.muted,
    borderTop: `1 solid ${palette.rule}`,
    paddingTop: 5,
    lineHeight: 1.4,
  },
});

const statusLabels: Readonly<Record<string, string>> = {
  draft: "BROUILLON",
  changes_requested: "À REVOIR",
  validated: "VALIDÉ",
};

const severityLabels: Readonly<Record<string, string>> = {
  blocking: "BLOQUANT",
  review: "À REVOIR",
  info: "INFO",
};

function Definition({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.definitionRow}>
      <Text style={styles.definitionLabel}>{label}</Text>
      <Text style={styles.definitionValue}>{value}</Text>
    </View>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: readonly { header: string; width: number }[];
  rows: readonly (readonly string[])[];
}) {
  return (
    <View>
      <View style={styles.headerRow}>
        {columns.map((column) => (
          <Text key={column.header} style={[styles.headerCell, { width: `${column.width}%` }]}>
            {column.header}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={styles.row}>
          <Text style={styles.cell}>Aucun élément.</Text>
        </View>
      ) : null}
      {rows.map((row, rowIndex) => (
        <View key={`${rowIndex}-${row[0]}`} style={styles.row} wrap={false}>
          {row.map((value, cellIndex) => (
            <Text
              key={`${cellIndex}-${value}`}
              style={[styles.cell, { width: `${columns[cellIndex]?.width ?? 20}%` }]}
            >
              {value}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Watermark({ label }: { label: string | null }) {
  if (!label) {
    return null;
  }

  return (
    <Text style={styles.watermark} fixed>
      {label}
    </Text>
  );
}

export function ReportSnapshotPdf({ snapshot }: { snapshot: ReportSnapshot }) {
  const { business, validation, generation } = snapshot;
  const { dossier } = business;
  const watermark = generation.watermark;
  const blocking = business.reviewFlags.filter((flag) => flag.severity === "blocking");

  const footer = [
    `${dossier.reference} — version ${generation.versionNumber} — ${statusLabels[validation.status] ?? validation.status}`,
    `généré le ${generation.generatedAt}`,
    `générateur ${generation.generatorVersion}`,
  ].join(" | ");

  return (
    <Document
      title={`${dossier.reference} — rapport patrimonial v${generation.versionNumber}`}
      author="Patrimoine Fiscal"
      subject={`Rapport ${statusLabels[validation.status] ?? validation.status}`}
      creator={generation.generatorVersion}
      producer={generation.generatorVersion}
      creationDate={new Date(generation.generatedAt)}
      modificationDate={new Date(generation.generatedAt)}
    >
      <Page size="A4" style={styles.page}>
        <Watermark label={watermark} />

        <Text style={styles.eyebrow}>Rapport patrimonial et fiscal</Text>
        <Text style={styles.coverTitle}>{dossier.title}</Text>
        <Text style={styles.coverSubtitle}>
          {dossier.reference} — exercice {dossier.fiscalYear} — version {generation.versionNumber}
        </Text>

        {validation.status === "validated" ? (
          <View style={styles.validatedBanner}>
            <Text>
              Rapport validé par un professionnel habilité le {validation.validatedAt ?? "—"}. Les
              conclusions ci-dessous engagent la revue professionnelle référencée en fin de document.
            </Text>
          </View>
        ) : (
          <View style={styles.banner}>
            <Text>
              {watermark} — simulation indicative non validée. Ce document ne peut pas être remis à un
              client ni utilisé comme conseil : il attend la validation du professionnel compétent.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>1. Identification et gel juridique</Text>
        <Definition label="Dossier" value={`${dossier.reference} — ${dossier.title}`} />
        <Definition label="Statut du dossier" value={dossier.status} />
        <Definition label="Exercice fiscal" value={String(dossier.fiscalYear)} />
        <Definition label="Date de gel juridique" value={business.legalFreezeDate} />
        <Definition label="Simulations retenues" value={business.simulationRunIds.join(", ") || "—"} />
        <Definition label="Version du rapport" value={String(generation.versionNumber)} />
        <Definition label="Généré le" value={generation.generatedAt} />
        <Definition label="Générateur" value={generation.generatorVersion} />

        <Text style={styles.sectionTitle}>2. Hypothèses et données d&apos;entrée</Text>
        <Table
          columns={[
            { header: "Simulation", width: 28 },
            { header: "Moteur", width: 22 },
            { header: "Version", width: 12 },
            { header: "Données d'entrée", width: 38 },
          ]}
          rows={business.runs.map((run) => [
            run.scenario,
            run.engineKey,
            run.engineVersion,
            Object.keys(run.inputSnapshot).sort().join(", ") || "—",
          ])}
        />

        <Text style={styles.sectionTitle}>3. Résultats</Text>
        <Table
          columns={[
            { header: "Simulation", width: 26 },
            { header: "Statut", width: 16 },
            { header: "Étape finale", width: 34 },
            { header: "Résultat", width: 24 },
          ]}
          rows={business.comparisons.map((comparison) => [
            comparison.scenario,
            comparison.status,
            comparison.finalStepLabel ?? "aucune étape",
            comparison.finalStepOutputValue ?? "—",
          ])}
        />

        <Text style={styles.sectionTitle}>4. Comparaison des scénarios</Text>
        {business.comparisons.length < 2 ? (
          <Text style={styles.bullet}>
            Un seul scénario est rattaché à ce rapport : aucune comparaison n&apos;est produite.
          </Text>
        ) : (
          <Table
            columns={[
              { header: "Scénario", width: 30 },
              { header: "Moteur", width: 24 },
              { header: "Résultat", width: 46 },
            ]}
            rows={business.comparisons.map((comparison) => [
              comparison.scenario,
              comparison.engineKey,
              comparison.finalStepOutputValue ?? "—",
            ])}
          />
        )}

        <Text style={styles.footer} fixed>
          {footer}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Watermark label={watermark} />

        <Text style={styles.sectionTitle}>5. Points de vigilance et revue</Text>
        <Text style={styles.bullet}>
          {blocking.length === 0
            ? "Aucun point bloquant relevé sur les faits enregistrés."
            : `${blocking.length} point(s) bloquant(s) relevé(s) : la remise finale reste interdite tant qu'ils ne sont pas levés.`}
        </Text>
        <Table
          columns={[
            { header: "Gravité", width: 14 },
            { header: "Code", width: 28 },
            { header: "Détail", width: 58 },
          ]}
          rows={business.reviewFlags.map((flag) => [
            severityLabels[flag.severity] ?? flag.severity,
            flag.code,
            flag.detail,
          ])}
        />

        <Text style={styles.sectionTitle}>6. Explication des calculs</Text>
        <Table
          columns={[
            { header: "Étape", width: 24 },
            { header: "Entrée", width: 16 },
            { header: "Formule", width: 24 },
            { header: "Sortie", width: 16 },
            { header: "Règle", width: 20 },
          ]}
          rows={business.calculationSteps.map((step) => [
            `${step.stepOrder}. ${step.label}`,
            step.inputValue,
            step.formula,
            step.outputValue,
            step.ruleVersionId,
          ])}
        />

        <Text style={styles.footer} fixed>
          {footer}
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Watermark label={watermark} />

        <Text style={styles.sectionTitle}>7. Versions de règles et sources officielles</Text>
        <Table
          columns={[
            { header: "Règle", width: 24 },
            { header: "Version", width: 12 },
            { header: "Effet", width: 16 },
            { header: "Statut", width: 12 },
            { header: "Source", width: 36 },
          ]}
          rows={business.ruleVersions.map((ruleVersion) => [
            ruleVersion.ruleSet,
            ruleVersion.version,
            ruleVersion.effectiveFrom,
            ruleVersion.status,
            ruleVersion.sourceReference,
          ])}
        />
        <Table
          columns={[
            { header: "Source", width: 22 },
            { header: "Autorité", width: 16 },
            { header: "Vérifiée le", width: 18 },
            { header: "Référence", width: 44 },
          ]}
          rows={business.evidenceSources.map((source) => [
            source.id,
            source.authority,
            source.checkedAt,
            source.url,
          ])}
        />

        <Text style={styles.sectionTitle}>8. Index des pièces justificatives</Text>
        <Table
          columns={[
            { header: "Pièce", width: 26 },
            { header: "Version", width: 10 },
            { header: "Type", width: 18 },
            { header: "Empreinte SHA-256", width: 46 },
          ]}
          rows={business.documentReferences.map((reference) => [
            reference.documentId,
            String(reference.versionNumber),
            reference.mimeType,
            reference.sha256,
          ])}
        />

        <Text style={styles.sectionTitle}>9. Limites de couverture</Text>
        {business.coverageLimitIds.length === 0 ? (
          <Text style={styles.bullet}>Aucune limite de couverture déclarée sur ces simulations.</Text>
        ) : (
          business.coverageLimitIds.map((limit) => (
            <Text key={limit} style={styles.bullet}>
              • {limit}
            </Text>
          ))
        )}
        {business.limitations.map((limitation) => (
          <Text key={limitation} style={styles.bullet}>
            • {limitation}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>10. Bloc de validation professionnelle</Text>
        <Definition label="Statut du rapport" value={statusLabels[validation.status] ?? validation.status} />
        <Definition label="Décision" value={validation.decision} />
        <Definition
          label="Validation requise"
          value={business.professionalValidation.required ? "oui" : "non"}
        />
        <Definition label="Revue professionnelle" value={business.professionalValidation.decision} />
        <Definition label="Revue signée le" value={business.professionalValidation.reviewedAt ?? "—"} />
        <Definition label="Validateur" value={validation.validatedByIdentityId ?? "—"} />
        <Definition label="Validé le" value={validation.validatedAt ?? "—"} />
        <Definition label="Commentaire" value={validation.comment ?? "—"} />
        <Definition label="Identifiant de version" value={generation.reportVersionId} />

        <Text style={styles.sectionTitle}>11. Empreintes d&apos;intégrité</Text>
        <Text style={styles.mono}>snapshot: {snapshot.schemaVersion}</Text>
        <Text style={styles.mono}>report: {generation.reportId}</Text>
        <Text style={styles.mono}>version: {generation.reportVersionId}</Text>
        <Text style={styles.bullet}>
          Les empreintes SHA-256 du snapshot et du binaire PDF sont enregistrées dans le journal
          d&apos;audit du cabinet et permettent de vérifier qu&apos;un exemplaire remis n&apos;a pas
          été modifié.
        </Text>

        <Text style={styles.footer} fixed>
          {footer}
        </Text>
      </Page>
    </Document>
  );
}
