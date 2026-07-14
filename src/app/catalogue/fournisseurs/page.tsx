import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listSuppliers } from "@/lib/actions/suppliers";
import { SupplierForm } from "./SupplierForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SuppliersPage() {
  const [session, suppliers] = await Promise.all([getServerSession(authOptions), listSuppliers()]);
  const canEdit = session?.user.role === "GESTIONNAIRE_STOCK";

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Fournisseurs</h1>
      {canEdit && <SupplierForm />}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Téléphone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.email}</TableCell>
              <TableCell>{s.phone}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
