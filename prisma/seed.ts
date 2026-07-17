import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "gestionnaire@stock.local" },
    update: {},
    create: {
      name: "Gestionnaire de Stock",
      email: "gestionnaire@stock.local",
      passwordHash,
      role: "GESTIONNAIRE_STOCK",
    },
  });

  await prisma.user.upsert({
    where: { email: "achats@stock.local" },
    update: {},
    create: {
      name: "Responsable Achats",
      email: "achats@stock.local",
      passwordHash,
      role: "RESPONSABLE_ACHATS",
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: "Fournisseur Général SA",
      email: "contact@fournisseur-general.example",
      phone: "+33 1 23 45 67 89",
    },
  });

  await prisma.product.createMany({
    data: [
      { sku: "SKU-001", name: "Clavier mécanique", quantity: 25, qMin: 10, unitPriceCents: 4500, supplierId: supplier.id },
      { sku: "SKU-002", name: "Souris optique", quantity: 8, qMin: 15, unitPriceCents: 1990, supplierId: supplier.id },
      { sku: "SKU-003", name: "Écran 24 pouces", quantity: 12, qMin: 5, unitPriceCents: 15900, supplierId: supplier.id },
    ],
  });

  await prisma.client.create({
    data: { name: "Entreprise Cliente Alpha", email: "achats@client-alpha.example" },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
