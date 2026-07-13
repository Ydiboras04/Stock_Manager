import { prisma } from "@/lib/prisma";
import type { NotificationType, Role } from "@prisma/client";

export interface CreateNotificationInput {
  userId?: string;
  role?: Role;
  type: NotificationType;
  message: string;
  relatedEntityId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      role: input.role,
      type: input.type,
      message: input.message,
      relatedEntityId: input.relatedEntityId,
    },
  });
}
