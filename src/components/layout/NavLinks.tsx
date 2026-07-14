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
];

export function NavLinks() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user.role;

  return (
    <nav className="flex gap-4">
      {LINKS.filter((link) => !role || link.roles.includes(role)).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? "font-semibold underline" : "text-muted-foreground"}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
