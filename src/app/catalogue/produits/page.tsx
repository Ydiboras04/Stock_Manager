import { listProducts } from "@/lib/actions/products";
import { listSuppliers } from "@/lib/actions/suppliers";
import { ProductForm } from "./ProductForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage() {
  const [products, suppliers] = await Promise.all([listProducts(), listSuppliers()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Produits</h1>
      <ProductForm suppliers={suppliers} />
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
              <TableCell>{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.quantity}</TableCell>
              <TableCell>{p.qMin}</TableCell>
              <TableCell>{p.supplier.name}</TableCell>
              <TableCell>
                {p.quantity < p.qMin ? (
                  <Badge variant="destructive">Sous le seuil</Badge>
                ) : (
                  <Badge variant="secondary">OK</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
