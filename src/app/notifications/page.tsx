import { getNotificationsForCurrentUser } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const notifications = await getNotificationsForCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-heading text-3xl font-semibold tracking-wide uppercase">Notifications</h1>
      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`flex items-start gap-3 bg-card p-3.5 ${n.isRead ? "opacity-55" : ""}`}
          >
            <span
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-primary"}`}
              aria-hidden
            />
            <div className="min-w-0 space-y-1">
              <p className={n.isRead ? "font-normal" : "font-medium"}>{n.message}</p>
              <p className="font-mono text-xs tracking-tight text-muted-foreground">
                {n.createdAt.toLocaleString("fr-FR")}
              </p>
            </div>
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="bg-card p-4 text-sm text-muted-foreground">Aucune notification.</li>
        )}
      </ul>
    </div>
  );
}
