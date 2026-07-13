"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getNotificationsForCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  try {
    return await prisma.notification.findMany({
      where: {
        OR: [{ userId: session.user.id }, { role: session.user.role }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Non authentifié" };

  const { count } = await prisma.notification.updateMany({
    where: {
      id,
      OR: [{ userId: session.user.id }, { role: session.user.role }],
    },
    data: { isRead: true },
  });

  if (count === 0) {
    return { success: false as const, error: "Notification introuvable" };
  }

  return { success: true as const };
}
