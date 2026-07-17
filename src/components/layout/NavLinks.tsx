"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const LINKS = [
  { href: "/dashboard", label: "Tableau de bord", roles: ["GESTIONNAIRE_STOCK", "RESPONSABLE_ACHATS"] },
  { href: "/catalogue/produits", label: "Produits", roles: ["GESTIONNAIRE_STOCK"] },
  { href: "/catalogue/fournisseurs", label: "Fournisseurs", roles: ["GESTIONNAIRE_STOCK"] },
  { href: "/commandes-clients", label: "Commandes clients", roles: ["GESTIONNAIRE_STOCK", "RESPONSABLE_ACHATS"] },
  { href: "/preparation-colis", label: "Préparation colis", roles: ["GESTIONNAIRE_STOCK"] },
  { href: "/reception-livraison", label: "Réception livraison", roles: ["GESTIONNAIRE_STOCK"] },
  { href: "/commandes-fournisseurs", label: "Commandes fournisseurs", roles: ["RESPONSABLE_ACHATS"] },
  { href: "/factures", label: "Factures", roles: ["GESTIONNAIRE_STOCK", "RESPONSABLE_ACHATS"] },
];

export function NavLinks() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user.role;

  return (
    <nav className="flex gap-5">
      {LINKS.filter((link) => !role || link.roles.includes(role)).map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`border-b-2 pb-0.5 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors ${
              active
                ? "border-primary text-background"
                : "border-transparent text-background/55 hover:text-background/85"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
