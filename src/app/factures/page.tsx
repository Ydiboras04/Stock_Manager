import { listInvoices } from "@/lib/actions/invoices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export default async function FacturesPage() {
  const invoices = await listInvoices();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-wide uppercase">Factures</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Numéro</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Tiers</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Total TTC</TableHead>
            <TableHead>Téléchargement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="font-mono">{invoice.number}</TableCell>
              <TableCell>
                <Badge variant={invoice.type === "SALE" ? "default" : "secondary"}>
                  {invoice.type === "SALE" ? "Vente" : "Achat"}
                </Badge>
              </TableCell>
              <TableCell>{invoice.partyName}</TableCell>
              <TableCell className="font-mono text-sm text-muted-foreground">
                {invoice.issuedAt.toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell className="font-mono">{formatCents(invoice.totalCents)}</TableCell>
              <TableCell>
                <a
                  href={`/api/factures/${invoice.id}/pdf`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Télécharger
                </a>
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="whitespace-normal text-center text-sm text-muted-foreground">
                Aucune facture pour le moment.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
