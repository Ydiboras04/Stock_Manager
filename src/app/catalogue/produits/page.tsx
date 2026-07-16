import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listProducts } from "@/lib/actions/products";
import { listSuppliers } from "@/lib/actions/suppliers";
import { ProductForm } from "./ProductForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage() {
  const [session, products, suppliers] = await Promise.all([
    getServerSession(authOptions),
    listProducts(),
    listSuppliers(),
  ]);
  const canEdit = session?.user.role === "GESTIONNAIRE_STOCK";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-wide uppercase">Produits</h1>
      {canEdit && <ProductForm suppliers={suppliers} />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Seuil Qmin</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-mono">{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.quantity}</TableCell>
              <TableCell>{p.qMin}</TableCell>
              <TableCell>{p.supplier.name}</TableCell>
              <TableCell>
                {p.quantity < p.qMin ? (
                  <Badge variant="warning">Sous le seuil</Badge>
                ) : (
                  <Badge variant="success">OK</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
