"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listProducts() {
  return prisma.product.findMany({
    include: { supplier: true },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(formData: FormData) {
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const qMin = Number(formData.get("qMin") ?? 0);
  const supplierId = String(formData.get("supplierId") ?? "");

  if (!sku || !name || !supplierId || Number.isNaN(quantity) || Number.isNaN(qMin)) {
    return { success: false as const, error: "Tous les champs sont requis" };
  }

  try {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return { success: false as const, error: "Ce SKU existe déjà" };
    }

    await prisma.product.create({ data: { sku, name, quantity, qMin, supplierId } });
    revalidatePath("/catalogue/produits");
    return { success: true as const };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: false as const, error: "Ce SKU existe déjà" };
    }
    return { success: false as const, error: "Erreur lors de la création du produit" };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const qMin = Number(formData.get("qMin") ?? 0);

  if (!name || Number.isNaN(qMin)) {
    return { success: false as const, error: "Champs invalides" };
  }

  try {
    await prisma.product.update({ where: { id }, data: { name, qMin } });
    revalidatePath("/catalogue/produits");
    return { success: true as const };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return { success: false as const, error: "Produit introuvable" };
    }
    return { success: false as const, error: "Erreur lors de la mise à jour du produit" };
  }
}
