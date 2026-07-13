import Link from "next/link";
import { listCustomerOrders } from "@/lib/actions/customer-orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  STOCK_INSUFFICIENT: "Stock insuffisant",
  RESERVED: "Réservée",
  SHIPPED: "Expédiée",
};

export default async function CustomerOrdersPage() {
  const orders = await listCustomerOrders();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Commandes clients</h1>
        <Button render={<Link href="/commandes-clients/nouvelle" />}>Nouvelle commande</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Lignes</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.client.name}</TableCell>
              <TableCell>
                {o.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
              </TableCell>
              <TableCell>
                <Badge variant={o.status === "STOCK_INSUFFICIENT" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
