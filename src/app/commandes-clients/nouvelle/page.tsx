import { listClients } from "@/lib/actions/clients";
import { listProducts } from "@/lib/actions/products";
import { NewOrderForm } from "./NewOrderForm";

export default async function NewCustomerOrderPage() {
  const [clients, products] = await Promise.all([listClients(), listProducts()]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 font-heading text-3xl font-semibold tracking-wide uppercase">Nouvelle commande client</h1>
      <NewOrderForm clients={clients} products={products} />
    </div>
  );
}
