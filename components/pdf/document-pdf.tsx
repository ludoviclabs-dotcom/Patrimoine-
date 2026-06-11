import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

/**
 * Gabarit PDF natif des documents réglementaires (@react-pdf/renderer,
 * client-only — jamais rendu côté serveur). Le rapport long conserve le
 * circuit print CSS durci.
 */

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a2b22" },
  eyebrow: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b7068" },
  title: { fontSize: 16, marginTop: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 9, marginTop: 4, color: "#6b7068" },
  banner: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f6ecd7",
    border: "1 solid #b0823c",
    fontSize: 9,
  },
  section: { marginTop: 10, paddingBottom: 6, borderBottom: "1 solid #e5dccb" },
  label: { fontSize: 8, textTransform: "uppercase", letterSpacing: 1, color: "#6b7068" },
  value: { fontSize: 10, marginTop: 2, lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: "#6b7068",
    borderTop: "1 solid #e5dccb",
    paddingTop: 6,
  },
});

export type PdfSection = { label: string; value: string };

export function DocumentPdf({
  eyebrow,
  title,
  subtitle,
  sections,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  sections: PdfSection[];
  footer: string;
}) {
  return (
    <Document title={title} author="patrimoine-fiscal-demo">
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.banner}>
          <Text>
            Document de travail émis pour revue : simulation indicative, non validée. Toute remise
            client suppose la validation du professionnel compétent.
          </Text>
        </View>
        {sections.map((section) => (
          <View key={section.label} style={styles.section} wrap={false}>
            <Text style={styles.label}>{section.label}</Text>
            <Text style={styles.value}>{section.value}</Text>
          </View>
        ))}
        <Text style={styles.footer} fixed>
          {footer}
        </Text>
      </Page>
    </Document>
  );
}
