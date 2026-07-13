"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getNotificationsForCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return prisma.notification.findMany({
    where: {
      OR: [{ userId: session.user.id }, { role: session.user.role }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Non authentifié" };

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { success: true as const };
}
