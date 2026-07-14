import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NavLinks } from "./NavLinks";
import { LogoutButton } from "./LogoutButton";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-6 border-b border-primary/20 bg-foreground px-5 py-3 text-background">
        <div className="flex items-center gap-6">
          <span className="font-heading text-sm font-semibold tracking-[0.25em] text-background uppercase">
            Stock<span className="text-primary/70">{"//"}</span>Mgr
          </span>
          <NavLinks />
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
