# Dashboard Charts, Typography Refinement & Notification Translucency — Design

**Contexte** : Deuxième vague de retours utilisateurs sur l'application de gestion de stock (Master 2), après la mise en place de la facturation. Trois volets indépendants regroupés dans un seul spec/plan car chacun est petit : (1) le tableau de bord passe d'un simple résumé chiffré à une représentation graphique, (2) affinage de la typographie existante (pas de nouvelle police), (3) le panneau de notifications devient translucide.

## 1. Graphiques du tableau de bord

### Décisions de cadrage

- Bibliothèque : **Recharts** — s'intègre naturellement à une stack React/Tailwind/shadcn, fournit les tooltips au survol nativement.
- Trois graphiques, sous la ligne de KPI existante (`/dashboard`), chacun dans une `Card` cohérente avec le reste du design system :
  1. **Chiffre d'affaires** — line chart, deux séries (Ventes / Achats), un point par jour où au moins une facture a été émise, agrégé par somme de `totalCents`.
  2. **Niveaux de stock** — bar chart, une barre par produit (`quantity`), avec une ligne de référence pointillée au niveau de `qMin` par produit — pas une deuxième série colorée.
  3. **Commandes par statut** — bar chart à teinte unique, une barre par statut (commandes clients + commandes fournisseurs confondues, une barre par statut distinct), avec étiquette de valeur directe au-dessus de chaque barre et le nom du statut en abscisse.
- Aucune série n'a plus de deux couleurs simultanées sur un même graphique (le graphique 3 n'en a qu'une). Ce choix est délibéré : plusieurs combinaisons à 4 couleurs dérivées de la palette de marque ont été testées avec le validateur de daltonisme du skill `dataviz` et ont toutes échoué le contrôle d'adjacence CVD (rouge/vert et bleu/violet sont précisément les paires confondues par le daltonisme) — forcer une palette à 4 teintes aurait dégradé l'accessibilité sans bénéfice réel, chaque barre étant déjà identifiée sans ambiguïté par sa position et son étiquette.

### Palette validée

Les couleurs de marque existantes (`--primary` `#2F5D62`, `--warning` `#C97A2B`) sont volontairement désaturées pour l'interface et échouent le contrôle de chroma minimale du validateur lorsqu'utilisées telles quelles dans un graphique (elles se lisent presque grises). Des variantes **réservées aux graphiques**, dans la même famille de teintes, ont été validées :

| Rôle | Light | Dark |
|---|---|---|
| Série 1 (Ventes / Quantité / statut unique) | `#0A6FA8` | `#3F97CE` |
| Série 2 (Achats) | `#C97A2B` | `#C77E33` |

Validé avec `node scripts/validate_palette.js "<hex>,<hex>" --mode light\|dark --surface <surface>` (skill `dataviz`) : bande de luminosité, plancher de chroma, séparation CVD adjacente, plancher de vision normale, contraste — tous `PASS` pour ces deux paires, dans les deux modes.

Nouvelles variables CSS dans `src/app/globals.css` (`:root` et `.dark`), distinctes de `--chart-1..5` existants (qui restent utilisés ailleurs et n'ont pas besoin d'être validés pour un usage non-catégoriel) :

```
--chart-viz-1: #0A6FA8;   /* .dark: #3F97CE */
--chart-viz-2: #C97A2B;   /* .dark: #C77E33 */
```

Exposées via `@theme inline` comme `--color-chart-viz-1` / `--color-chart-viz-2` pour être consommables en classes Tailwind (`text-chart-viz-1`, etc.) ou en valeur JS via `getComputedStyle` dans les composants Recharts (Recharts consomme des couleurs CSS via `stroke`/`fill`, qui peuvent référencer `var(--chart-viz-1)` directement).

### Logique métier testable

`src/lib/business/dashboard-charts.ts` — fonction pure, testée comme `reorder.ts` :

```ts
export interface InvoiceForChart {
  type: "SALE" | "PURCHASE";
  issuedAt: Date;
  totalCents: number;
}

export interface RevenuePoint {
  date: string; // "YYYY-MM-DD"
  salesCents: number;
  purchasesCents: number;
}

export function buildRevenueSeries(invoices: InvoiceForChart[]): RevenuePoint[] {
  const byDate = new Map<string, { salesCents: number; purchasesCents: number }>();
  for (const invoice of invoices) {
    const date = invoice.issuedAt.toISOString().slice(0, 10);
    const entry = byDate.get(date) ?? { salesCents: 0, purchasesCents: 0 };
    if (invoice.type === "SALE") entry.salesCents += invoice.totalCents;
    else entry.purchasesCents += invoice.totalCents;
    byDate.set(date, entry);
  }
  return Array.from(byDate.entries())
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
```

Les deux autres graphiques (niveaux de stock, statuts de commande) n'ont pas de logique d'agrégation non triviale — `products` et les compteurs de statut sont dérivés directement dans le composant serveur, comme le fait déjà `DashboardPage` pour `belowThreshold`/`pendingCustomerOrders`/`pendingPurchaseOrders`.

### Composants

- `src/components/dashboard/RevenueChart.tsx` — client component, `ResponsiveContainer` + `LineChart` (deux `Line`, `stroke="var(--chart-viz-1)"` / `var(--chart-viz-2)"`), légende (2 séries → légende obligatoire), tooltip par défaut de Recharts.
- `src/components/dashboard/StockLevelsChart.tsx` — client component, `BarChart` (`Bar fill="var(--chart-viz-1)"`), une `ReferenceLine` par produit au niveau de son `qMin` (trait pointillé, couleur `var(--muted-foreground)`).
- `src/components/dashboard/OrderStatusChart.tsx` — client component, `BarChart` à une seule `Bar` (`fill="var(--chart-viz-1)"`), `LabelList` pour la valeur directe au-dessus de chaque barre.
- `src/app/dashboard/page.tsx` — modifié pour récupérer `listInvoices()` en plus des appels existants, calculer `buildRevenueSeries`, et rendre les trois `Card` de graphiques sous la grille de KPI existante.

## 2. Affinage typographique

Pas de nouvelle police — `Oswald` (headings), `Geist Sans` (corps), `Geist Mono` (données) restent. Deux changements ciblés dans `src/app/globals.css` :

- `.font-heading { line-height: 1.15; letter-spacing: 0.01em; }` dans `@layer base` — Oswald a un interlignage par défaut trop lâche aux grandes tailles (titres de page, montants du tableau de bord), ce resserrement améliore la lisibilité sans changer la taille.
- Audit des titres de page existants : toutes les pages listées dans la table de rôles du spec principal (`/dashboard`, `/catalogue/produits`, `/catalogue/fournisseurs`, `/commandes-clients`, `/commandes-clients/nouvelle`, `/commandes-fournisseurs`, `/preparation-colis`, `/reception-livraison`, `/notifications`, `/factures`) doivent utiliser exactement la même classe de titre : `font-heading text-3xl font-semibold tracking-wide uppercase`. Celles qui en dévient (à vérifier au moment de l'implémentation, pas de liste figée ici puisque l'état exact peut avoir dérivé) sont alignées.

## 3. Translucidité des notifications

`src/components/notifications/NotificationBell.tsx` — le `DropdownMenuContent` (actuellement `className="w-80"`) devient `className="w-80 bg-popover/85 backdrop-blur-md"`. Le anneau de bordure existant (`ring-1 ring-foreground/10`, hérité du composant `DropdownMenuContent` partagé) est conservé — pas de modification du composant partagé `src/components/ui/dropdown-menu.tsx`, seule cette instance d'usage change, pour ne pas rendre tous les autres menus déroulants de l'app translucides (portée limitée à la cloche de notifications, comme demandé).

Le contraste texte/fond reste garanti : `bg-popover/85` avec le flou de fond laisse le fond suffisamment opaque pour que le texte (`text-popover-foreground`) conserve un contraste correct, contrairement à une transparence plus faible qui aurait nécessité une vérification de contraste au cas par cas.

## Tests

- `src/lib/business/dashboard-charts.test.ts` (Vitest) : `buildRevenueSeries` — plusieurs factures le même jour (agrégation), types mixtes (Ventes vs Achats sur des jours différents et le même jour), liste vide, tri chronologique.
- Pas de test automatisé du rendu des graphiques Recharts (hors périmètre académique, cohérent avec l'absence de test PDF déjà actée) — vérification manuelle via le serveur de dev.

## Hors périmètre (assumé)

- Pas de filtre de plage de dates sur le graphique de chiffre d'affaires (affiche tout l'historique disponible).
- Pas d'export des graphiques (image, CSV).
- Pas de mode clair/sombre testé au-delà de la validation de palette déjà faite pour les deux modes (l'app supporte déjà les deux via les tokens CSS existants).
- Palette catégorielle à 4 couleurs pour le graphique de statuts explicitement écartée (voir section 1) — teinte unique + étiquettes directes à la place.
