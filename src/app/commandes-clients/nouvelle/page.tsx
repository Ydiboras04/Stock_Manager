import { listClients } from "@/lib/actions/clients";
import { listProducts } from "@/lib/actions/products";
import { NewOrderForm } from "./NewOrderForm";

export default async function NewCustomerOrderPage() {
  const [clients, products] = await Promise.all([listClients(), listProducts()]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Nouvelle commande client</h1>
      <NewOrderForm clients={clients} products={products} />
    </div>
  );
}
