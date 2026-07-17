import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  meta: { color: "#555555" },
  section: { marginBottom: 16 },
  label: { fontSize: 9, color: "#777777", textTransform: "uppercase", marginBottom: 2 },
  table: { marginTop: 12 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#dddddd", paddingVertical: 6 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 2, borderBottomColor: "#171B18", paddingBottom: 6, fontFamily: "Helvetica-Bold" },
  colProduct: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 200, justifyContent: "space-between", marginBottom: 4 },
  grandTotal: { fontFamily: "Helvetica-Bold", fontSize: 13 },
});

function formatEuros(cents: number): string {
  return (cents / 100).toFixed(2) + " €";
}

export interface InvoiceDocumentLine {
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface InvoiceDocumentData {
  number: string;
  type: "SALE" | "PURCHASE";
  partyName: string;
  issuedAt: Date;
  subtotalCents: number;
  tvaCents: number;
  totalCents: number;
  lines: InvoiceDocumentLine[];
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Facture {invoice.number}</Text>
          <Text style={styles.meta}>
            {invoice.type === "SALE" ? "Facture de vente" : "Facture d'achat"} —{" "}
            {invoice.issuedAt.toLocaleDateString("fr-FR")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{invoice.type === "SALE" ? "Client" : "Fournisseur"}</Text>
          <Text>{invoice.partyName}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colProduct}>Produit</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colPrice}>Prix unitaire</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>
          {invoice.lines.map((line, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colProduct}>
                {line.productName} ({line.productSku})
              </Text>
              <Text style={styles.colQty}>{line.quantity}</Text>
              <Text style={styles.colPrice}>{formatEuros(line.unitPriceCents)}</Text>
              <Text style={styles.colTotal}>{formatEuros(line.lineTotalCents)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Sous-total HT</Text>
            <Text>{formatEuros(invoice.subtotalCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>TVA (20%)</Text>
            <Text>{formatEuros(invoice.tvaCents)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.grandTotal}>Total TTC</Text>
            <Text style={styles.grandTotal}>{formatEuros(invoice.totalCents)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
