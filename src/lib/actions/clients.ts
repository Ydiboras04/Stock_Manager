"use server";

import { prisma } from "@/lib/prisma";

export async function listClients() {
  try {
    return await prisma.client.findMany({ orderBy: { name: "asc" } });
  } catch {
    return [];
  }
}
