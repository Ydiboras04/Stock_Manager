# Application de Gestion de Stock — Design

**Contexte** : Projet académique Master 2 Informatique. Application de gestion de stock suivant un diagramme BPMN à 4 lanes (Fournisseur, Gestionnaire de stock, Responsable Achats, Système) et 3 processus (Entrée, Sortie, Réapprovisionnement).

## Lecture du BPMN (référence)

**Processus d'Entrée** : Fournisseur expédie → réception livraison (Gestionnaire de stock) → vérif conformité →
- Non conforme : rapport de non-conformité + livraison rejetée (fin)
- Conforme : validation comptable (Responsable Achats) → mise à jour stock (Système) → livraison acceptée (fin)

**Processus de Sortie** : réception commande client (Système) → vérif disponibilité → gateway stock suffisant :
- Oui : réservation stock (Achats) → préparation colis (Gestionnaire) + mise à jour niveau stock (Système) → commande expédiée (fin)
- Non : réapprovisionnement/notification rupture (Système) → déclenche le processus de réappro

**Processus de Réapprovisionnement** : déclenché par seuil Qmin atteint OU rupture notifiée → génération demande d'achat (Système) → validation commande (Achats) → émission commande fournisseur (Système) → fin, qui boucle vers "Commande reçue" côté Fournisseur.

## Décisions de cadrage

- **Fournisseur** et **Client** sont simulés (pas de compte utilisateur) : le Gestionnaire de stock ou le Responsable Achats saisissent les événements en leur nom (ex: "livraison reçue", "nouvelle commande client").
- Deux rôles utilisateurs réels : `GESTIONNAIRE_STOCK`, `RESPONSABLE_ACHATS`. Pas de rôle Admin séparé — le Gestionnaire de stock gère aussi le catalogue (articles, fournisseurs, seuils Qmin).
- Stack : Next.js (App Router, TypeScript) + Server Actions pour les mutations, Prisma + SQLite, NextAuth.js (credentials, bcrypt), Tailwind CSS + shadcn/ui.
- Vérification du seuil Qmin : événementielle (déclenchée après toute écriture qui diminue `Product.quantity`), pas de cron.
- Notifications : in-app uniquement (table `Notification`, pas d'email).
- Commandes multi-articles (lignes de commande), modélisation relationnelle standard.

## Modèle de données

```
User        (id, name, email, passwordHash, role: GESTIONNAIRE_STOCK | RESPONSABLE_ACHATS)
Supplier    (id, name, email, phone)
Product     (id, sku, name, quantity, qMin, supplierId -> Supplier)
Client      (id, name, email)   // simulé, pas de compte

PurchaseOrder (id, supplierId, status: PENDING_VALIDATION|VALIDATED|SENT|DELIVERED|REJECTED, createdAt, validatedById, nonConformityReport?)
PurchaseOrderLine (id, purchaseOrderId, productId, quantity)

CustomerOrder (id, clientId, status: PENDING|STOCK_INSUFFICIENT|RESERVED|PREPARED|SHIPPED, createdAt)
CustomerOrderLine (id, customerOrderId, productId, quantity)

Notification (id, userId?, role?, type, message, isRead, createdAt, relatedEntityId)

StockMovement (id, productId, quantity, type: IN|OUT, reason: DELIVERY|CUSTOMER_ORDER|ADJUSTMENT, createdAt, relatedOrderId)
```

`StockMovement` n'est pas dans le BPMN mais fournit une traçabilité standard en gestion de stock ; utilisé pour un historique produit, pas d'écran dédié obligatoire.

## Workflows applicatifs (mapping BPMN → code)

### Processus d'Entrée
- Écran "Réceptionner une livraison" (Gestionnaire de stock) : sélectionne une `PurchaseOrder` au statut `SENT`, saisit les quantités reçues par ligne.
- Action `verifierConformite(purchaseOrderId, lignesRecues)` :
  - Conforme (checkbox de confirmation + quantités correctes) → statut `DELIVERED`, crée un `StockMovement` IN par ligne, incrémente `Product.quantity`, notifie Responsable Achats (validation comptable informative).
  - Non conforme → statut `REJECTED`, `nonConformityReport` rempli (texte libre), notifie Responsable Achats.

### Processus de Sortie
- Création `CustomerOrder` (multi-lignes, par Gestionnaire de stock ou Responsable Achats) déclenche automatiquement `verifierDisponibilite(customerOrderId)` :
  - Stock suffisant sur toutes les lignes → statut `RESERVED`, décrémente `Product.quantity` (réservation = décrément immédiat, pas de distinction stock réservé/physique), crée `StockMovement` OUT, puis déclenche la vérification Qmin (voir Réapprovisionnement) sur les produits concernés.
    - Écran "Préparation du colis" (Gestionnaire de stock) : liste des `CustomerOrder` `RESERVED` → bouton "Marquer préparée/expédiée" → statut `SHIPPED`.
  - Stock insuffisant sur au moins une ligne → statut `STOCK_INSUFFICIENT`, notifie Gestionnaire de stock + Responsable Achats, déclenche la vérification Qmin pour les produits en cause.

### Processus de Réapprovisionnement
- Vérification Qmin événementielle : après toute écriture diminuant `Product.quantity`, si `quantity < qMin` et qu'aucune `PurchaseOrder` ouverte (`PENDING_VALIDATION`/`VALIDATED`/`SENT`) n'existe déjà pour ce produit → création automatique d'une `PurchaseOrder` (`PENDING_VALIDATION`) groupée par fournisseur avec une ligne pour ce produit. Quantité recommandée = `qMin * 2 - quantity`.
- Écran "Valider les commandes fournisseur" (Responsable Achats) : liste des `PurchaseOrder` `PENDING_VALIDATION` → Valider (`VALIDATED`) ou Rejeter.
- Action `emettreCommande(purchaseOrderId)` → statut `SENT`, notifie Gestionnaire de stock ("commande fournisseur en attente de livraison"). Cette commande `SENT` est celle réceptionnée ensuite dans le Processus d'Entrée, bouclant le cycle.

## Rôles, permissions & écrans

| Écran | Gestionnaire de stock | Responsable Achats |
|---|---|---|
| Dashboard (alertes/notifications, KPIs stock) | ✅ | ✅ |
| Catalogue produits (CRUD article, fournisseur, seuil Qmin) | ✅ (seul à créer/éditer) | lecture seule |
| Réceptionner une livraison (Entrée) | ✅ | — |
| Commandes clients (créer / voir / préparer colis) | ✅ (préparer colis), création par les deux rôles | ✅ (voir) |
| Commandes fournisseurs (valider, historique) | lecture seule | ✅ (valider/rejeter) |
| Notifications | ✅ (les siennes) | ✅ (les siennes) |

Auth via NextAuth.js (credentials email/mot de passe, hash bcrypt), redirection post-login vers `/dashboard`. Middleware Next.js protège les routes par rôle (ex: `/achats/*` réservé à `RESPONSABLE_ACHATS`).

## Gestion des erreurs & cas limites
- Server Actions retournent `{ success, error? }`, jamais d'exception non gérée côté client ; erreurs affichées via toast (shadcn `sonner`).
- Décrément de stock dans une transaction Prisma (`prisma.$transaction`) avec relecture de la quantité pour éviter un stock négatif en cas de concurrence.
- Pas de doublon de `PurchaseOrder` pour un même produit tant qu'une commande ouverte existe déjà.

## Tests
- Tests unitaires (Vitest) sur la logique métier pure, extraite des Server Actions pour être testable sans dépendre du framework : calcul de conformité, calcul de quantité à réapprovisionner, transitions de statut.
- Pas de suite E2E obligatoire dans le cadre académique.

## Hors périmètre (assumé)
- Pas de vrai compte Fournisseur/Client.
- Pas de gestion de paiement/facturation.
- Pas d'envoi d'email réel (notifications in-app uniquement).
- Pas de tâche planifiée (cron) : tout est déclenché par événement applicatif.
