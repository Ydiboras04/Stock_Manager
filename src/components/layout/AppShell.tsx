import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NavLinks } from "./NavLinks";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b p-4">
        <NavLinks />
        <NotificationBell />
      </header>
      <main>{children}</main>
    </div>
  );
}
