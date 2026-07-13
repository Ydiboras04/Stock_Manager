import { getNotificationsForCurrentUser } from "@/lib/actions/notifications";

export default async function NotificationsPage() {
  const notifications = await getNotificationsForCurrentUser();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Notifications</h1>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className={`rounded border p-3 ${n.isRead ? "opacity-60" : "bg-muted"}`}>
            <p>{n.message}</p>
            <p className="text-xs text-muted-foreground">{n.createdAt.toLocaleString("fr-FR")}</p>
          </li>
        ))}
        {notifications.length === 0 && <p className="text-muted-foreground">Aucune notification.</p>}
      </ul>
    </div>
  );
}
