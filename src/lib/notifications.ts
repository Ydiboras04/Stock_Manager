import { prisma } from "@/lib/prisma";
import type { NotificationType, Role, Prisma } from "@prisma/client";

export interface CreateNotificationInput {
  userId?: string;
  role?: Role;
  type: NotificationType;
  message: string;
  relatedEntityId?: string;
}

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export async function createNotification(
  input: CreateNotificationInput,
  client: PrismaClientOrTx = prisma
) {
  await client.notification.create({
    data: {
      userId: input.userId,
      role: input.role,
      type: input.type,
      message: input.message,
      relatedEntityId: input.relatedEntityId,
    },
  });
}
