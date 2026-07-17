# Système de facturation — Design

**Contexte** : Suite au feedback utilisateur sur l'application de gestion de stock (Master 2), ajout d'un système de facturation généré automatiquement pour les commandes clients expédiées et les livraisons fournisseur réceptionnées, avec téléchargement PDF. Ce spec ne couvre que la facturation ; les autres retours (dashboard graphique, typographie, translucidité des notifications) font l'objet d'un pass séparé.

## Décisions de cadrage

- Une facture est générée automatiquement pour :
  - chaque `CustomerOrder` passant au statut `SHIPPED` (facture de **vente**, on facture le client) ;
  - chaque `PurchaseOrder` dont la livraison est conforme, passant au statut `DELIVERED` (facture d'**achat**, le fournisseur nous facture).
- Chaque `Product` porte un `unitPriceCents` unique, utilisé à la fois comme prix de vente et prix d'achat. **Simplification assumée** : le modèle ne distingue pas prix d'achat et prix de vente (hors périmètre, cf. section dédiée).
- Les montants sont stockés en **centimes (Int)**, jamais en flottant, pour éviter les erreurs d'arrondi sur les calculs monétaires.
- TVA à taux fixe **20%**, appliquée sur le sous-total HT de chaque facture.
- Chaque ligne de facture **snapshot** le nom/SKU/prix unitaire du produit au moment de l'émission — une facture déjà émise ne doit jamais changer de contenu si le produit est ensuite renommé ou reprix.
- La génération de facture est **atomique** avec la transition de statut qui la déclenche : elle a lieu à l'intérieur de la même transaction Prisma que `markCustomerOrderShipped` / `receiveDelivery` (branche conforme). Si la création de la facture échoue, toute la transaction (y compris le changement de statut) est annulée.
- Les commandes déjà `SHIPPED`/`DELIVERED` avant le déploiement de cette fonctionnalité n'ont pas de facture rétroactive.
- Pas de facture pour les commandes fournisseur rejetées (`REJECTED`) ni pour les commandes client en rupture (`STOCK_INSUFFICIENT`).

## Modèle de données

```
enum InvoiceType { SALE | PURCHASE }

Invoice (
  id            String   @id
  number        String   @unique   // "FA-2026-0001", séquentiel par année
  type          InvoiceType
  customerOrderId String?          // rempli si type = SALE
  purchaseOrderId String?          // rempli si type = PURCHASE
  partyName     String             // nom client ou fournisseur, snapshot
  issuedAt      DateTime @default(now())
  subtotalCents Int                // somme des lineTotalCents (HT)
  tvaCents      Int                // subtotalCents * 0.20, arrondi
  totalCents    Int                // subtotalCents + tvaCents (TTC)

  lines InvoiceLine[]
)

InvoiceLine (
  id             String  @id
  invoiceId      String
  productName    String            // snapshot
  productSku     String            // snapshot
  quantity       Int
  unitPriceCents Int               // snapshot du prix au moment de la facture
  lineTotalCents Int               // quantity * unitPriceCents
)
```

Ajout sur `Product` :

```
unitPriceCents Int @default(0)
```

## Numérotation des factures

Format `FA-{année}-{séquence sur 4 chiffres}`, ex. `FA-2026-0001`, `FA-2026-0002`. La séquence redémarre à 1 chaque année civile (basée sur `issuedAt`). Calculée par comptage des factures existantes pour l'année en cours au moment de la création (dans la même transaction, donc pas de race condition possible grâce à la transaction Prisma).

La logique de formatage (`formatInvoiceNumber(year, sequence)`) est une fonction pure testée unitairement ; le calcul de la séquence suivante interroge la base et n'est pas pure (comme `checkAndTriggerReorder` existant).

## Calcul des montants

Fonction pure `computeInvoiceTotals(lines: { quantity: number; unitPriceCents: number }[])` dans `src/lib/business/invoice.ts` :
- `lineTotalCents` par ligne = `quantity * unitPriceCents`
- `subtotalCents` = somme des `lineTotalCents`
- `tvaCents` = `Math.round(subtotalCents * 0.20)`
- `totalCents` = `subtotalCents + tvaCents`

Testée comme `reorder.ts`/`conformity.ts` existants : cas simples, ligne à zéro, arrondi TVA.

## Workflows applicatifs

### Facture de vente (Processus de Sortie)
- Dans `markCustomerOrderShipped(orderId)` (src/lib/actions/customer-orders.ts), à l'intérieur de la transaction qui passe le statut à `SHIPPED` :
  1. Charger les lignes de la commande avec leurs produits (nom, SKU, `unitPriceCents`).
  2. `computeInvoiceTotals(lines)`.
  3. Calculer le prochain numéro de séquence pour l'année en cours (`tx.invoice.count` filtré par année + type, ou compteur global — voir plan).
  4. Créer `Invoice` (type `SALE`, `partyName` = nom du client) + ses `InvoiceLine`.
- Le retour de l'action reste `{ success, error? }` ; en cas d'échec de la création de facture, l'erreur remonte comme pour tout échec de transaction existant.

### Facture d'achat (Processus d'Entrée)
- Dans `receiveDelivery(purchaseOrderId, quantitésReçues)` (src/lib/actions/delivery.ts), uniquement sur la branche **conforme**, à l'intérieur de la même transaction que la mise à jour du stock :
  1. Charger les lignes de la commande fournisseur avec leurs produits.
  2. `computeInvoiceTotals(lines)`.
  3. Numéro de séquence de l'année en cours.
  4. Créer `Invoice` (type `PURCHASE`, `partyName` = nom du fournisseur) + `InvoiceLine`.
- Aucune facture sur la branche non conforme (`REJECTED`).

### Écran "Factures"
- Nouvelle route `/factures`, accessible en lecture aux deux rôles (comme le Dashboard).
- Table : Numéro, Type (badge Vente/Achat), Tiers (client/fournisseur), Date, Total TTC, bouton "Télécharger".
- Lien ajouté à `NavLinks` pour `GESTIONNAIRE_STOCK` et `RESPONSABLE_ACHATS`.
- Server Action `listInvoices()` dans `src/lib/actions/invoices.ts`.

### Génération et téléchargement du PDF
- Route Handler `GET /api/factures/[id]/pdf` (`src/app/api/factures/[id]/pdf/route.ts`) :
  - Vérifie la session (`getServerSession`), 401 si absente.
  - Charge la `Invoice` + `InvoiceLine` par id, 404 si absente.
  - Rend le PDF via `@react-pdf/renderer` (`renderToBuffer`), gabarit dans `src/lib/pdf/InvoiceDocument.tsx` : en-tête (numéro, type, date), bloc tiers, tableau des lignes, totaux HT/TVA/TTC.
  - Réponse `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="{number}.pdf"`.
  - Police standard (Helvetica intégrée à `@react-pdf/renderer`), pas d'embarquement de police custom.

## Gestion des erreurs & cas limites

- Échec de création de facture (ex. contrainte unique sur `number` en cas de collision improbable) → toute la transaction (statut + stock + facture) est annulée, l'action retourne `{ success: false, error }`.
- Téléchargement d'une facture inexistante ou d'un id invalide → 404.
- Téléchargement sans session → 401 (le middleware protège déjà `/factures` mais pas les routes API ; la vérification est donc faite explicitement dans le Route Handler).
- Produit avec `unitPriceCents` à 0 (non renseigné) → facture générée quand même, ligne à 0 ; c'est un état valide (produit gratuit ou prix non encore configuré), pas une erreur bloquante.

## Modification de l'écran Produits

- `ProductForm` (création) et la table `/catalogue/produits` gagnent un champ/colonne "Prix unitaire" (affiché en euros, saisi/stocké en centimes).
- Seed data : chaque produit existant se voit attribuer un `unitPriceCents` de démonstration.

## Tests

- `src/lib/business/invoice.ts` + `invoice.test.ts` (Vitest) : `computeInvoiceTotals` (plusieurs lignes, ligne à zéro, arrondi TVA), `formatInvoiceNumber`.
- Pas de test automatisé du rendu PDF (hors périmètre académique) ; vérification manuelle du téléchargement.

## Hors périmètre (assumé)

- Pas de distinction prix d'achat / prix de vente (un seul `unitPriceCents` par produit).
- Pas de gestion d'avoirs, d'annulation de facture, ou de facture partielle.
- Pas de génération rétroactive pour les commandes déjà expédiées/livrées avant ce déploiement.
- Pas d'envoi de la facture par email (téléchargement manuel uniquement, cohérent avec l'absence d'email déjà actée dans le spec principal).
- Pas de personnalisation de mise en page PDF au-delà d'un gabarit simple et lisible.
