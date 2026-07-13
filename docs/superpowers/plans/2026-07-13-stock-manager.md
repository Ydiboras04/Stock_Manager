# Application de Gestion de Stock (BPMN) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js (TypeScript, App Router) stock management application implementing the three BPMN processes (Entrée, Sortie, Réapprovisionnement) described in `docs/superpowers/specs/2026-07-13-stock-manager-design.md`.

**Architecture:** Single Next.js app. Server Actions handle all mutations (no separate REST API). Prisma + SQLite for persistence. NextAuth.js (credentials provider) for authentication with two roles (`GESTIONNAIRE_STOCK`, `RESPONSABLE_ACHATS`). Tailwind CSS + shadcn/ui for the interface. Pure business-logic functions (conformity check, reorder quantity, stock sufficiency) are extracted into `src/lib/business/` so they are unit-testable with Vitest without touching the database.

**Tech Stack:** Next.js 14 (App Router, TS), Prisma, SQLite, NextAuth.js v4, bcryptjs, Tailwind CSS, shadcn/ui, Vitest.

## Global Constraints

- All mutation logic lives in Server Actions under `src/lib/actions/`, never in client components directly.
- Every Server Action returns `{ success: true, data? } | { success: false, error: string }` — never throws to the client.
- Stock decrements/increments always go through `src/lib/prisma.ts`'s `prisma.$transaction`.
- No cron/timer: the Qmin check runs synchronously after every stock decrement.
- No real Fournisseur/Client accounts — these are plain data records, not `User` rows.
- Package manager: npm.

---

### Task 1: Project scaffolding

**Files:**
- Create: whole Next.js project structure at repo root (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `components.json`, `src/lib/utils.ts`, `src/components/ui/*`)

**Interfaces:**
- Produces: a running Next.js dev server, Tailwind configured, shadcn/ui initialized with `button`, `input`, `label`, `table`, `dialog`, `form`, `select`, `badge`, `card`, `sonner`, `dropdown-menu` components available under `src/components/ui/`.

- [ ] **Step 1: Scaffold Next.js app in repo root**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```
When prompted about the non-empty directory (it contains `.git` and `docs/`), confirm to proceed.

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev -- --port 3000 &` then `curl -sSf http://localhost:3000 | head -c 200`
Expected: HTML output starting with `<!DOCTYPE html>`. Stop the dev server afterward (`kill %1` or Ctrl+C).

- [ ] **Step 3: Initialize shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label table dialog form select badge card sonner dropdown-menu
```
Expected: `src/components/ui/` populated with the added components, `components.json` created.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and shadcn/ui"
```

---

### Task 2: Database schema, migration, seed data

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/prisma.ts`
- Modify: `package.json` (add `prisma.seed` config and `db:seed` script)
- Create: `.env` (DATABASE_URL)

**Interfaces:**
- Produces: Prisma Client singleton exported as `prisma` from `src/lib/prisma.ts`, importable as `import { prisma } from "@/lib/prisma"`.
- Produces: seeded users `gestionnaire@stock.local` / `achats@stock.local` (password `password123`), one supplier, three products, one client.

- [ ] **Step 1: Install Prisma**

Run:
```bash
npm install prisma --save-dev
npm install @prisma/client bcryptjs
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 2: Write schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

enum Role {
  GESTIONNAIRE_STOCK
  RESPONSABLE_ACHATS
}

enum PurchaseOrderStatus {
  PENDING_VALIDATION
  VALIDATED
  SENT
  DELIVERED
  REJECTED
}

enum CustomerOrderStatus {
  PENDING
  STOCK_INSUFFICIENT
  RESERVED
  SHIPPED
}

enum StockMovementType {
  IN
  OUT
}

enum StockMovementReason {
  DELIVERY
  CUSTOMER_ORDER
  ADJUSTMENT
}

enum NotificationType {
  NON_CONFORMITY
  ACCOUNTING_VALIDATION
  STOCK_INSUFFICIENT
  PURCHASE_ORDER_TO_VALIDATE
  PURCHASE_ORDER_SENT
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  role         Role
  createdAt    DateTime @default(now())

  validatedPurchaseOrders PurchaseOrder[] @relation("ValidatedBy")
  notifications           Notification[]
}

model Supplier {
  id             String          @id @default(cuid())
  name           String
  email          String
  phone          String
  products       Product[]
  purchaseOrders PurchaseOrder[]
}

model Product {
  id         String   @id @default(cuid())
  sku        String   @unique
  name       String
  quantity   Int      @default(0)
  qMin       Int
  supplierId String
  supplier   Supplier @relation(fields: [supplierId], references: [id])

  purchaseOrderLines PurchaseOrderLine[]
  customerOrderLines CustomerOrderLine[]
  stockMovements     StockMovement[]
}

model Client {
  id             String          @id @default(cuid())
  name           String
  email          String
  customerOrders CustomerOrder[]
}

model PurchaseOrder {
  id                  String              @id @default(cuid())
  supplierId          String
  supplier            Supplier            @relation(fields: [supplierId], references: [id])
  status              PurchaseOrderStatus @default(PENDING_VALIDATION)
  createdAt           DateTime            @default(now())
  validatedById       String?
  validatedBy         User?               @relation("ValidatedBy", fields: [validatedById], references: [id])
  nonConformityReport String?

  lines PurchaseOrderLine[]
}

model PurchaseOrderLine {
  id              String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id])
  productId       String
  product         Product       @relation(fields: [productId], references: [id])
  quantity        Int
}

model CustomerOrder {
  id        String              @id @default(cuid())
  clientId  String
  client    Client              @relation(fields: [clientId], references: [id])
  status    CustomerOrderStatus @default(PENDING)
  createdAt DateTime            @default(now())

  lines CustomerOrderLine[]
}

model CustomerOrderLine {
  id              String        @id @default(cuid())
  customerOrderId String
  customerOrder   CustomerOrder @relation(fields: [customerOrderId], references: [id])
  productId       String
  product         Product       @relation(fields: [productId], references: [id])
  quantity        Int
}

model Notification {
  id              String           @id @default(cuid())
  userId          String?
  user            User?            @relation(fields: [userId], references: [id])
  role            Role?
  type            NotificationType
  message         String
  isRead          Boolean          @default(false)
  createdAt       DateTime         @default(now())
  relatedEntityId String?
}

model StockMovement {
  id             String              @id @default(cuid())
  productId      String
  product        Product             @relation(fields: [productId], references: [id])
  quantity       Int
  type           StockMovementType
  reason         StockMovementReason
  createdAt      DateTime            @default(now())
  relatedOrderId String?
}
```

- [ ] **Step 3: Configure DATABASE_URL**

Create `.env`:
```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 4: Create Prisma client singleton**

Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Run initial migration**

Run: `npx prisma migrate dev --name init`
Expected: `prisma/migrations/<timestamp>_init/migration.sql` created, `dev.db` created, output ends with "Your database is now in sync with your schema."

- [ ] **Step 6: Write seed script**

Create `prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "gestionnaire@stock.local" },
    update: {},
    create: {
      name: "Gestionnaire de Stock",
      email: "gestionnaire@stock.local",
      passwordHash,
      role: "GESTIONNAIRE_STOCK",
    },
  });

  await prisma.user.upsert({
    where: { email: "achats@stock.local" },
    update: {},
    create: {
      name: "Responsable Achats",
      email: "achats@stock.local",
      passwordHash,
      role: "RESPONSABLE_ACHATS",
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: "Fournisseur Général SA",
      email: "contact@fournisseur-general.example",
      phone: "+33 1 23 45 67 89",
    },
  });

  await prisma.product.createMany({
    data: [
      { sku: "SKU-001", name: "Clavier mécanique", quantity: 25, qMin: 10, supplierId: supplier.id },
      { sku: "SKU-002", name: "Souris optique", quantity: 8, qMin: 15, supplierId: supplier.id },
      { sku: "SKU-003", name: "Écran 24 pouces", quantity: 12, qMin: 5, supplierId: supplier.id },
    ],
  });

  await prisma.client.create({
    data: { name: "Entreprise Cliente Alpha", email: "achats@client-alpha.example" },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 7: Wire seed command**

In `package.json`, add:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 8: Run seed and verify**

Run: `npx prisma db seed`
Expected: no errors. Verify with `npx prisma studio --browser none &` then `curl -sSf http://localhost:5555` returns HTML (then stop it), OR run:
```bash
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.count().then(c=>{console.log('users:',c);process.exit(0)})"
```
Expected: `users: 2`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, migration, and seed data"
```

---

### Task 3: Business logic (pure functions) with unit tests

**Files:**
- Create: `src/lib/business/conformity.ts`
- Create: `src/lib/business/reorder.ts`
- Create: `src/lib/business/availability.ts`
- Test: `src/lib/business/conformity.test.ts`
- Test: `src/lib/business/reorder.test.ts`
- Test: `src/lib/business/availability.test.ts`
- Modify: `package.json` (add `test` script)
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `isDeliveryConform(lines: ReceivedLine[]): boolean`
- Produces: `isBelowThreshold(quantity: number, qMin: number): boolean` and `computeReorderQuantity(quantity: number, qMin: number): number`
- Produces: `isStockSufficient(lines: OrderLineRequest[]): boolean` and `getInsufficientProductIds(lines: OrderLineRequest[]): string[]`
- These are consumed by Server Actions in Tasks 7, 8, 9.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
```

Add to `package.json` scripts:
```json
"test": "vitest run"
```

- [ ] **Step 3: Write failing test for conformity**

Create `src/lib/business/conformity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isDeliveryConform } from "./conformity";

describe("isDeliveryConform", () => {
  it("returns true when all received quantities match ordered quantities", () => {
    const result = isDeliveryConform([
      { productId: "p1", orderedQuantity: 10, receivedQuantity: 10 },
      { productId: "p2", orderedQuantity: 5, receivedQuantity: 5 },
    ]);
    expect(result).toBe(true);
  });

  it("returns false when any received quantity differs from ordered quantity", () => {
    const result = isDeliveryConform([
      { productId: "p1", orderedQuantity: 10, receivedQuantity: 10 },
      { productId: "p2", orderedQuantity: 5, receivedQuantity: 3 },
    ]);
    expect(result).toBe(false);
  });

  it("returns true for an empty list", () => {
    expect(isDeliveryConform([])).toBe(true);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/business/conformity.test.ts`
Expected: FAIL — `Cannot find module './conformity'`

- [ ] **Step 5: Implement conformity.ts**

Create `src/lib/business/conformity.ts`:
```ts
export interface ReceivedLine {
  productId: string;
  orderedQuantity: number;
  receivedQuantity: number;
}

export function isDeliveryConform(lines: ReceivedLine[]): boolean {
  return lines.every((line) => line.receivedQuantity === line.orderedQuantity);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/lib/business/conformity.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Write failing tests for reorder logic**

Create `src/lib/business/reorder.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isBelowThreshold, computeReorderQuantity } from "./reorder";

describe("isBelowThreshold", () => {
  it("returns true when quantity is strictly below qMin", () => {
    expect(isBelowThreshold(4, 10)).toBe(true);
  });

  it("returns false when quantity equals or exceeds qMin", () => {
    expect(isBelowThreshold(10, 10)).toBe(false);
    expect(isBelowThreshold(15, 10)).toBe(false);
  });
});

describe("computeReorderQuantity", () => {
  it("computes qMin * 2 - quantity when positive", () => {
    expect(computeReorderQuantity(4, 10)).toBe(16);
  });

  it("falls back to qMin when the formula would be zero or negative", () => {
    expect(computeReorderQuantity(20, 10)).toBe(10);
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `npx vitest run src/lib/business/reorder.test.ts`
Expected: FAIL — `Cannot find module './reorder'`

- [ ] **Step 9: Implement reorder.ts**

Create `src/lib/business/reorder.ts`:
```ts
export function isBelowThreshold(quantity: number, qMin: number): boolean {
  return quantity < qMin;
}

export function computeReorderQuantity(quantity: number, qMin: number): number {
  const target = qMin * 2 - quantity;
  return target > 0 ? target : qMin;
}
```

- [ ] **Step 10: Run test to verify it passes**

Run: `npx vitest run src/lib/business/reorder.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 11: Write failing tests for availability logic**

Create `src/lib/business/availability.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isStockSufficient, getInsufficientProductIds } from "./availability";

describe("isStockSufficient", () => {
  it("returns true when available quantity covers requested quantity for every line", () => {
    const result = isStockSufficient([
      { productId: "p1", requestedQuantity: 5, availableQuantity: 10 },
      { productId: "p2", requestedQuantity: 2, availableQuantity: 2 },
    ]);
    expect(result).toBe(true);
  });

  it("returns false when at least one line lacks stock", () => {
    const result = isStockSufficient([
      { productId: "p1", requestedQuantity: 5, availableQuantity: 10 },
      { productId: "p2", requestedQuantity: 3, availableQuantity: 2 },
    ]);
    expect(result).toBe(false);
  });
});

describe("getInsufficientProductIds", () => {
  it("returns the ids of lines lacking stock only", () => {
    const result = getInsufficientProductIds([
      { productId: "p1", requestedQuantity: 5, availableQuantity: 10 },
      { productId: "p2", requestedQuantity: 3, availableQuantity: 2 },
    ]);
    expect(result).toEqual(["p2"]);
  });
});
```

- [ ] **Step 12: Run test to verify it fails**

Run: `npx vitest run src/lib/business/availability.test.ts`
Expected: FAIL — `Cannot find module './availability'`

- [ ] **Step 13: Implement availability.ts**

Create `src/lib/business/availability.ts`:
```ts
export interface OrderLineRequest {
  productId: string;
  requestedQuantity: number;
  availableQuantity: number;
}

export function isStockSufficient(lines: OrderLineRequest[]): boolean {
  return lines.every((line) => line.availableQuantity >= line.requestedQuantity);
}

export function getInsufficientProductIds(lines: OrderLineRequest[]): string[] {
  return lines
    .filter((line) => line.availableQuantity < line.requestedQuantity)
    .map((line) => line.productId);
}
```

- [ ] **Step 14: Run full test suite**

Run: `npm test`
Expected: PASS, 10 tests total across 3 files.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: add business-logic pure functions with unit tests"
```

---

### Task 4: Authentication (NextAuth credentials + role-based middleware)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/types/next-auth.d.ts`
- Modify: `src/app/layout.tsx` (wrap with SessionProvider via a client component)
- Create: `src/components/SessionProviderWrapper.tsx`

**Interfaces:**
- Consumes: `prisma` from `src/lib/prisma.ts` (Task 2), `Role` enum from Prisma Client.
- Produces: `authOptions` exported from `src/lib/auth.ts`; `getServerSession(authOptions)` usable in Server Components/Actions to read `{ user: { id, name, email, role } }`.

- [ ] **Step 1: Install NextAuth**

Run: `npm install next-auth@4`

- [ ] **Step 2: Declare session types**

Create `src/types/next-auth.d.ts`:
```ts
import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: Role;
    };
  }

  interface User {
    id: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
```

- [ ] **Step 3: Write auth options**

Create `src/lib/auth.ts`:
```ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
```

- [ ] **Step 4: Create the NextAuth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
```

- [ ] **Step 5: Add NEXTAUTH secrets to .env**

Append to `.env`:
```
NEXTAUTH_SECRET="dev-only-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 6: Create role-based middleware**

Create `src/middleware.ts`:
```ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/achats") && role !== "RESPONSABLE_ACHATS") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/catalogue") && role !== "GESTIONNAIRE_STOCK") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/reception-livraison") && role !== "GESTIONNAIRE_STOCK") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/catalogue/:path*",
    "/commandes-clients/:path*",
    "/commandes-fournisseurs/:path*",
    "/preparation-colis/:path*",
    "/reception-livraison/:path*",
    "/notifications/:path*",
    "/achats/:path*",
  ],
};
```

- [ ] **Step 7: Create session provider wrapper (client component)**

Create `src/components/SessionProviderWrapper.tsx`:
```tsx
"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

- [ ] **Step 8: Wrap the root layout**

Modify `src/app/layout.tsx` to wrap `{children}` with `<SessionProviderWrapper>` (import it and use it as the outermost element inside `<body>`), and add the shadcn `Toaster` from `sonner`:
```tsx
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { Toaster } from "@/components/ui/sonner";
// ...keep existing imports (fonts, globals.css)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <SessionProviderWrapper>
          {children}
          <Toaster />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Create login Server Action + page**

Create `src/app/login/actions.ts`:
```ts
"use server";

import { signIn } from "next-auth/react";
```
Note: `signIn` from `next-auth/react` only works client-side, so the login page calls it directly from a client component instead of a Server Action. Delete this file's content and instead skip straight to the page below (no server action needed for login).

Create `src/app/login/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.error) {
      toast.error("Email ou mot de passe incorrect");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg border p-6">
        <h1 className="text-xl font-semibold">Connexion</h1>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </Button>
      </form>
    </div>
  );
}
```

Delete `src/app/login/actions.ts` (it was a dead end explained above — login must happen client-side with `next-auth/react`'s `signIn`).

- [ ] **Step 10: Manual verification**

Run: `npm run dev`
Visit `http://localhost:3000/login`, log in with `gestionnaire@stock.local` / `password123`.
Expected: redirected to `/dashboard` (page not yet created — a 404 is fine for now, confirms redirect happened). Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth credentials authentication with role-based middleware"
```

---

### Task 5: Notification system

**Files:**
- Create: `src/lib/notifications.ts`
- Create: `src/lib/actions/notifications.ts`
- Create: `src/components/notifications/NotificationBell.tsx`
- Create: `src/app/notifications/page.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2), `NotificationType`/`Role` enums from Prisma Client, `getServerSession(authOptions)` (Task 4).
- Produces: `createNotification(input: { userId?: string; role?: Role; type: NotificationType; message: string; relatedEntityId?: string }): Promise<void>` — consumed by Server Actions in Tasks 8, 9, 10.
- Produces: `getNotificationsForCurrentUser(): Promise<Notification[]>` and `markNotificationRead(id: string): Promise<{ success: boolean }>` Server Actions.

- [ ] **Step 1: Implement the notification helper**

Create `src/lib/notifications.ts`:
```ts
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
```

- [ ] **Step 2: Implement Server Actions to list/mark notifications**

Create `src/lib/actions/notifications.ts`:
```ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getNotificationsForCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  return prisma.notification.findMany({
    where: {
      OR: [{ userId: session.user.id }, { role: session.user.role }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function markNotificationRead(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { success: false as const, error: "Non authentifié" };

  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  return { success: true as const };
}
```

- [ ] **Step 3: Build the notification bell component**

Create `src/components/notifications/NotificationBell.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { getNotificationsForCurrentUser, markNotificationRead } from "@/lib/actions/notifications";

interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    getNotificationsForCurrentUser().then((data) => setNotifications(data));
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function handleOpenNotification(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 && (
          <DropdownMenuItem disabled>Aucune notification</DropdownMenuItem>
        )}
        {notifications.map((n) => (
          <DropdownMenuItem
            key={n.id}
            onClick={() => handleOpenNotification(n.id)}
            className={n.isRead ? "opacity-60" : "font-medium"}
          >
            {n.message}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Install lucide-react for icons**

Run: `npm install lucide-react`

- [ ] **Step 5: Create the full notifications page**

Create `src/app/notifications/page.tsx`:
```tsx
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
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add in-app notification system"
```

---

### Task 6: Catalog management (Suppliers and Products)

**Files:**
- Create: `src/lib/actions/suppliers.ts`
- Create: `src/lib/actions/products.ts`
- Create: `src/app/catalogue/fournisseurs/page.tsx`
- Create: `src/app/catalogue/fournisseurs/SupplierForm.tsx`
- Create: `src/app/catalogue/produits/page.tsx`
- Create: `src/app/catalogue/produits/ProductForm.tsx`

**Interfaces:**
- Consumes: `prisma` (Task 2).
- Produces: `createSupplier`, `listSuppliers`, `createProduct`, `updateProduct`, `listProducts` Server Actions — `listProducts()` is consumed by Tasks 7 and 9 to read current stock levels.

- [ ] **Step 1: Supplier Server Actions**

Create `src/lib/actions/suppliers.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listSuppliers() {
  return prisma.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createSupplier(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name || !email) {
    return { success: false as const, error: "Nom et email sont requis" };
  }

  await prisma.supplier.create({ data: { name, email, phone } });
  revalidatePath("/catalogue/fournisseurs");
  return { success: true as const };
}
```

- [ ] **Step 2: Product Server Actions**

Create `src/lib/actions/products.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function listProducts() {
  return prisma.product.findMany({
    include: { supplier: true },
    orderBy: { name: "asc" },
  });
}

export async function createProduct(formData: FormData) {
  const sku = String(formData.get("sku") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const quantity = Number(formData.get("quantity") ?? 0);
  const qMin = Number(formData.get("qMin") ?? 0);
  const supplierId = String(formData.get("supplierId") ?? "");

  if (!sku || !name || !supplierId || Number.isNaN(quantity) || Number.isNaN(qMin)) {
    return { success: false as const, error: "Tous les champs sont requis" };
  }

  const existing = await prisma.product.findUnique({ where: { sku } });
  if (existing) {
    return { success: false as const, error: "Ce SKU existe déjà" };
  }

  await prisma.product.create({ data: { sku, name, quantity, qMin, supplierId } });
  revalidatePath("/catalogue/produits");
  return { success: true as const };
}

export async function updateProduct(id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const qMin = Number(formData.get("qMin") ?? 0);

  if (!name || Number.isNaN(qMin)) {
    return { success: false as const, error: "Champs invalides" };
  }

  await prisma.product.update({ where: { id }, data: { name, qMin } });
  revalidatePath("/catalogue/produits");
  return { success: true as const };
}
```

- [ ] **Step 3: Supplier form (client component) + list page**

Create `src/app/catalogue/fournisseurs/SupplierForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createSupplier } from "@/lib/actions/suppliers";

export function SupplierForm() {
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    const result = await createSupplier(formData);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Fournisseur créé");
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-3 gap-3">
      <div>
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" name="phone" />
      </div>
      <Button type="submit" disabled={pending} className="col-span-3 w-fit">
        Ajouter le fournisseur
      </Button>
    </form>
  );
}
```

Create `src/app/catalogue/fournisseurs/page.tsx`:
```tsx
import { listSuppliers } from "@/lib/actions/suppliers";
import { SupplierForm } from "./SupplierForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Fournisseurs</h1>
      <SupplierForm />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Téléphone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell>{s.email}</TableCell>
              <TableCell>{s.phone}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 4: Product form (client component) + list page**

Create `src/app/catalogue/produits/ProductForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createProduct } from "@/lib/actions/products";

interface SupplierOption {
  id: string;
  name: string;
}

export function ProductForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const [pending, setPending] = useState(false);
  const [supplierId, setSupplierId] = useState("");

  async function handleSubmit(formData: FormData) {
    formData.set("supplierId", supplierId);
    setPending(true);
    const result = await createProduct(formData);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Produit créé");
  }

  return (
    <form action={handleSubmit} className="grid grid-cols-5 gap-3">
      <div>
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" name="sku" required />
      </div>
      <div>
        <Label htmlFor="name">Nom</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="quantity">Quantité initiale</Label>
        <Input id="quantity" name="quantity" type="number" min={0} defaultValue={0} required />
      </div>
      <div>
        <Label htmlFor="qMin">Seuil Qmin</Label>
        <Input id="qMin" name="qMin" type="number" min={0} required />
      </div>
      <div>
        <Label>Fournisseur</Label>
        <Select onValueChange={setSupplierId} required>
          <SelectTrigger>
            <SelectValue placeholder="Choisir" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending} className="col-span-5 w-fit">
        Ajouter le produit
      </Button>
    </form>
  );
}
```

Create `src/app/catalogue/produits/page.tsx`:
```tsx
import { listProducts } from "@/lib/actions/products";
import { listSuppliers } from "@/lib/actions/suppliers";
import { ProductForm } from "./ProductForm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ProductsPage() {
  const [products, suppliers] = await Promise.all([listProducts(), listSuppliers()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Produits</h1>
      <ProductForm suppliers={suppliers} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Seuil Qmin</TableHead>
            <TableHead>Fournisseur</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.sku}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.quantity}</TableCell>
              <TableCell>{p.qMin}</TableCell>
              <TableCell>{p.supplier.name}</TableCell>
              <TableCell>
                {p.quantity < p.qMin ? (
                  <Badge variant="destructive">Sous le seuil</Badge>
                ) : (
                  <Badge variant="secondary">OK</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in as `gestionnaire@stock.local`, visit `/catalogue/fournisseurs` then `/catalogue/produits`, create a supplier and a product.
Expected: new rows appear in the tables without a page reload issue (form uses Server Action + `revalidatePath`). Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add supplier and product catalog management"
```

---

### Task 7: Réapprovisionnement automatique (Qmin trigger) — shared helper

**Files:**
- Create: `src/lib/actions/purchase-orders.ts`

**Interfaces:**
- Consumes: `isBelowThreshold`, `computeReorderQuantity` from `src/lib/business/reorder.ts` (Task 3); `createNotification` (Task 5); `prisma`.
- Produces: `checkAndTriggerReorder(tx: PrismaTransactionClient, productId: string): Promise<void>` — called from within stock-decrementing transactions in Task 8 (customer orders). Also produces `listPendingPurchaseOrders`, `validatePurchaseOrder`, `rejectPurchaseOrder`, `emitPurchaseOrder` used in Task 10, and `listOpenPurchaseOrdersForProduct` used by `checkAndTriggerReorder` itself.

- [ ] **Step 1: Write the module**

Create `src/lib/actions/purchase-orders.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isBelowThreshold, computeReorderQuantity } from "@/lib/business/reorder";
import { createNotification } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

const OPEN_STATUSES = ["PENDING_VALIDATION", "VALIDATED", "SENT"] as const;

export async function checkAndTriggerReorder(tx: TransactionClient, productId: string) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });

  if (!isBelowThreshold(product.quantity, product.qMin)) return;

  const existingOpenOrder = await tx.purchaseOrderLine.findFirst({
    where: {
      productId,
      purchaseOrder: { status: { in: [...OPEN_STATUSES] } },
    },
  });
  if (existingOpenOrder) return;

  const reorderQuantity = computeReorderQuantity(product.quantity, product.qMin);

  const purchaseOrder = await tx.purchaseOrder.create({
    data: {
      supplierId: product.supplierId,
      status: "PENDING_VALIDATION",
      lines: { create: [{ productId: product.id, quantity: reorderQuantity }] },
    },
  });

  await createNotification({
    role: "RESPONSABLE_ACHATS",
    type: "PURCHASE_ORDER_TO_VALIDATE",
    message: `Commande fournisseur à valider pour ${product.name} (quantité: ${reorderQuantity})`,
    relatedEntityId: purchaseOrder.id,
  });
}

export async function listPendingPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    where: { status: "PENDING_VALIDATION" },
    include: { supplier: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    include: { supplier: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function validatePurchaseOrder(id: string, validatedById: string) {
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "VALIDATED", validatedById },
  });
  revalidatePath("/commandes-fournisseurs");
  return { success: true as const };
}

export async function rejectPurchaseOrder(id: string, validatedById: string) {
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "REJECTED", validatedById },
  });
  revalidatePath("/commandes-fournisseurs");
  return { success: true as const };
}

export async function emitPurchaseOrder(id: string) {
  const order = await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "SENT" },
    include: { supplier: true },
  });

  await createNotification({
    role: "GESTIONNAIRE_STOCK",
    type: "PURCHASE_ORDER_SENT",
    message: `Commande envoyée à ${order.supplier.name}, en attente de livraison`,
    relatedEntityId: order.id,
  });

  revalidatePath("/commandes-fournisseurs");
  revalidatePath("/reception-livraison");
  return { success: true as const };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add purchase order actions and automatic Qmin reorder trigger"
```

---

### Task 8: Processus de Sortie (customer orders, availability, réservation, préparation colis)

**Files:**
- Create: `src/lib/actions/customer-orders.ts`
- Create: `src/app/commandes-clients/page.tsx`
- Create: `src/app/commandes-clients/nouvelle/page.tsx`
- Create: `src/app/commandes-clients/nouvelle/NewOrderForm.tsx`
- Create: `src/app/preparation-colis/page.tsx`
- Create: `src/lib/actions/clients.ts`

**Interfaces:**
- Consumes: `isStockSufficient`, `getInsufficientProductIds` from `src/lib/business/availability.ts` (Task 3); `checkAndTriggerReorder` from `src/lib/actions/purchase-orders.ts` (Task 7); `createNotification` (Task 5); `listProducts` (Task 6).
- Produces: `createCustomerOrder(clientId, lines): Promise<{success, error?}>`, `markCustomerOrderShipped(id): Promise<{success}>`, `listCustomerOrders()`, `listReservedCustomerOrders()`.

- [ ] **Step 1: Client list Server Action**

Create `src/lib/actions/clients.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";

export async function listClients() {
  return prisma.client.findMany({ orderBy: { name: "asc" } });
}
```

- [ ] **Step 2: Customer order Server Actions (core Processus de Sortie logic)**

Create `src/lib/actions/customer-orders.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isStockSufficient, getInsufficientProductIds, type OrderLineRequest } from "@/lib/business/availability";
import { checkAndTriggerReorder } from "@/lib/actions/purchase-orders";
import { createNotification } from "@/lib/notifications";

export interface OrderLineInput {
  productId: string;
  quantity: number;
}

export async function createCustomerOrder(clientId: string, lines: OrderLineInput[]) {
  if (!clientId || lines.length === 0) {
    return { success: false as const, error: "Client et au moins une ligne sont requis" };
  }

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
  });

  const availabilityInput: OrderLineRequest[] = lines.map((line) => {
    const product = products.find((p) => p.id === line.productId)!;
    return { productId: line.productId, requestedQuantity: line.quantity, availableQuantity: product.quantity };
  });

  const sufficient = isStockSufficient(availabilityInput);

  const order = await prisma.customerOrder.create({
    data: {
      clientId,
      status: sufficient ? "RESERVED" : "STOCK_INSUFFICIENT",
      lines: { create: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })) },
    },
  });

  if (!sufficient) {
    const insufficientIds = getInsufficientProductIds(availabilityInput);
    await createNotification({
      role: "GESTIONNAIRE_STOCK",
      type: "STOCK_INSUFFICIENT",
      message: `Stock insuffisant pour la commande #${order.id.slice(-6)}`,
      relatedEntityId: order.id,
    });
    await createNotification({
      role: "RESPONSABLE_ACHATS",
      type: "STOCK_INSUFFICIENT",
      message: `Stock insuffisant pour la commande #${order.id.slice(-6)}`,
      relatedEntityId: order.id,
    });

    for (const productId of insufficientIds) {
      await prisma.$transaction((tx) => checkAndTriggerReorder(tx, productId));
    }

    revalidatePath("/commandes-clients");
    return { success: true as const, data: order };
  }

  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { quantity: { decrement: line.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          quantity: line.quantity,
          type: "OUT",
          reason: "CUSTOMER_ORDER",
          relatedOrderId: order.id,
        },
      });
      await checkAndTriggerReorder(tx, line.productId);
    }
  });

  revalidatePath("/commandes-clients");
  revalidatePath("/catalogue/produits");
  revalidatePath("/preparation-colis");
  return { success: true as const, data: order };
}

export async function listCustomerOrders() {
  return prisma.customerOrder.findMany({
    include: { client: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listReservedCustomerOrders() {
  return prisma.customerOrder.findMany({
    where: { status: "RESERVED" },
    include: { client: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function markCustomerOrderShipped(id: string) {
  await prisma.customerOrder.update({ where: { id }, data: { status: "SHIPPED" } });
  revalidatePath("/preparation-colis");
  revalidatePath("/commandes-clients");
  return { success: true as const };
}
```

- [ ] **Step 3: New order form (client component)**

Create `src/app/commandes-clients/nouvelle/NewOrderForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createCustomerOrder, type OrderLineInput } from "@/lib/actions/customer-orders";

interface Option {
  id: string;
  name: string;
}

export function NewOrderForm({ clients, products }: { clients: Option[]; products: Option[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [lines, setLines] = useState<OrderLineInput[]>([{ productId: "", quantity: 1 }]);
  const [pending, setPending] = useState(false);

  function updateLine(index: number, patch: Partial<OrderLineInput>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  async function handleSubmit() {
    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (!clientId || validLines.length === 0) {
      toast.error("Client et au moins une ligne valide sont requis");
      return;
    }
    setPending(true);
    const result = await createCustomerOrder(clientId, validLines);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Commande créée");
    router.push("/commandes-clients");
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Client</Label>
        <Select onValueChange={setClientId}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lines.map((line, index) => (
        <div key={index} className="flex gap-3">
          <Select onValueChange={(value) => updateLine(index, { productId: value })}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Choisir un produit" />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            value={line.quantity}
            onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
            className="w-24"
          />
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addLine}>
        Ajouter une ligne
      </Button>

      <Button type="button" onClick={handleSubmit} disabled={pending} className="block">
        Créer la commande
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: New order page + orders list page**

Create `src/app/commandes-clients/nouvelle/page.tsx`:
```tsx
import { listClients } from "@/lib/actions/clients";
import { listProducts } from "@/lib/actions/products";
import { NewOrderForm } from "./NewOrderForm";

export default async function NewCustomerOrderPage() {
  const [clients, products] = await Promise.all([listClients(), listProducts()]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Nouvelle commande client</h1>
      <NewOrderForm clients={clients} products={products} />
    </div>
  );
}
```

Create `src/app/commandes-clients/page.tsx`:
```tsx
import Link from "next/link";
import { listCustomerOrders } from "@/lib/actions/customer-orders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  STOCK_INSUFFICIENT: "Stock insuffisant",
  RESERVED: "Réservée",
  SHIPPED: "Expédiée",
};

export default async function CustomerOrdersPage() {
  const orders = await listCustomerOrders();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Commandes clients</h1>
        <Button asChild>
          <Link href="/commandes-clients/nouvelle">Nouvelle commande</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Lignes</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.client.name}</TableCell>
              <TableCell>
                {o.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
              </TableCell>
              <TableCell>
                <Badge variant={o.status === "STOCK_INSUFFICIENT" ? "destructive" : "secondary"}>
                  {STATUS_LABEL[o.status]}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 5: Préparation colis page**

Create `src/app/preparation-colis/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { listReservedCustomerOrders, markCustomerOrderShipped } from "@/lib/actions/customer-orders";

interface ReservedOrder {
  id: string;
  client: { name: string };
  lines: { quantity: number; product: { name: string } }[];
}

export default function PreparationColisPage() {
  const [orders, setOrders] = useState<ReservedOrder[]>([]);

  useEffect(() => {
    listReservedCustomerOrders().then(setOrders);
  }, []);

  async function handleShip(id: string) {
    const result = await markCustomerOrderShipped(id);
    if (result.success) {
      toast.success("Colis marqué comme expédié");
      setOrders((prev) => prev.filter((o) => o.id !== id));
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Préparation du colis</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aucune commande à préparer.</p>}
      {orders.map((o) => (
        <div key={o.id} className="flex items-center justify-between rounded border p-4">
          <div>
            <p className="font-medium">{o.client.name}</p>
            <p className="text-sm text-muted-foreground">
              {o.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
            </p>
          </div>
          <Button onClick={() => handleShip(o.id)}>Marquer préparée / expédiée</Button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, log in, go to `/commandes-clients/nouvelle`, create an order requesting more of "Souris optique" (seeded quantity 8, qMin 15) than available.
Expected: order created with status "Stock insuffisant", and — because 8 < 15 already — a `PurchaseOrder` should already exist from the seed-level check; verify no duplicate is created by checking `/commandes-fournisseurs` once Task 10 is built. For now just confirm the order list shows the correct status badge. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: implement customer order creation, availability check, and colis preparation"
```

---

### Task 9: Processus d'Entrée (réception livraison, conformité)

**Files:**
- Create: `src/lib/actions/delivery.ts`
- Create: `src/app/reception-livraison/page.tsx`
- Create: `src/app/reception-livraison/ReceiveDeliveryForm.tsx`

**Interfaces:**
- Consumes: `isDeliveryConform` from `src/lib/business/conformity.ts` (Task 3); `createNotification` (Task 5); `prisma`.
- Produces: `listSentPurchaseOrders()`, `receiveDelivery(purchaseOrderId, receivedLines, isConform, nonConformityReport?)`.

- [ ] **Step 1: Delivery Server Actions**

Create `src/lib/actions/delivery.ts`:
```ts
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { isDeliveryConform, type ReceivedLine } from "@/lib/business/conformity";
import { createNotification } from "@/lib/notifications";

export async function listSentPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    where: { status: "SENT" },
    include: { supplier: true, lines: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function receiveDelivery(purchaseOrderId: string, receivedQuantities: Record<string, number>) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: { lines: true },
  });
  if (!order) return { success: false as const, error: "Commande introuvable" };

  const receivedLines: ReceivedLine[] = order.lines.map((line) => ({
    productId: line.productId,
    orderedQuantity: line.quantity,
    receivedQuantity: receivedQuantities[line.id] ?? 0,
  }));

  const conform = isDeliveryConform(receivedLines);

  if (!conform) {
    const report = order.lines
      .map((line) => `${line.productId}: attendu ${line.quantity}, reçu ${receivedQuantities[line.id] ?? 0}`)
      .join("; ");

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: "REJECTED", nonConformityReport: report },
    });

    await createNotification({
      role: "RESPONSABLE_ACHATS",
      type: "NON_CONFORMITY",
      message: `Livraison non conforme pour la commande #${purchaseOrderId.slice(-6)}`,
      relatedEntityId: purchaseOrderId,
    });

    revalidatePath("/reception-livraison");
    return { success: true as const, conform: false };
  }

  await prisma.$transaction(async (tx) => {
    for (const line of order.lines) {
      await tx.product.update({
        where: { id: line.productId },
        data: { quantity: { increment: line.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          quantity: line.quantity,
          type: "IN",
          reason: "DELIVERY",
          relatedOrderId: purchaseOrderId,
        },
      });
    }
    await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: "DELIVERED" } });
  });

  await createNotification({
    role: "RESPONSABLE_ACHATS",
    type: "ACCOUNTING_VALIDATION",
    message: `Livraison conforme reçue pour la commande #${purchaseOrderId.slice(-6)}, validation comptable à effectuer`,
    relatedEntityId: purchaseOrderId,
  });

  revalidatePath("/reception-livraison");
  revalidatePath("/catalogue/produits");
  return { success: true as const, conform: true };
}
```

- [ ] **Step 2: Reception form (client component)**

Create `src/app/reception-livraison/ReceiveDeliveryForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { receiveDelivery } from "@/lib/actions/delivery";

interface Line {
  id: string;
  quantity: number;
  product: { name: string };
}

interface Order {
  id: string;
  supplier: { name: string };
  lines: Line[];
}

export function ReceiveDeliveryForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(order.lines.map((l) => [l.id, l.quantity]))
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    const result = await receiveDelivery(order.id, quantities);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast[result.conform ? "success" : "error"](
      result.conform ? "Livraison conforme, stock mis à jour" : "Livraison non conforme, rapport généré"
    );
    onDone();
  }

  return (
    <div className="space-y-3 rounded border p-4">
      <p className="font-medium">{order.supplier.name}</p>
      {order.lines.map((line) => (
        <div key={line.id} className="flex items-center gap-3">
          <span className="w-48">{line.product.name} (commandé: {line.quantity})</span>
          <Input
            type="number"
            min={0}
            value={quantities[line.id]}
            onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: Number(e.target.value) }))}
            className="w-24"
          />
        </div>
      ))}
      <Button onClick={handleSubmit} disabled={pending}>
        Valider la réception
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Reception page (client component orchestrating the list)**

Create `src/app/reception-livraison/page.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { listSentPurchaseOrders } from "@/lib/actions/delivery";
import { ReceiveDeliveryForm } from "./ReceiveDeliveryForm";

interface Order {
  id: string;
  supplier: { name: string };
  lines: { id: string; quantity: number; product: { name: string } }[];
}

export default function ReceptionLivraisonPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function refresh() {
    const data = await listSentPurchaseOrders();
    setOrders(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Réception de livraison</h1>
      {orders.length === 0 && <p className="text-muted-foreground">Aucune livraison en attente.</p>}
      {orders.map((order) => (
        <ReceiveDeliveryForm key={order.id} order={order} onDone={refresh} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement delivery reception and conformity check (Processus d'Entree)"
```

---

### Task 10: Validation des commandes fournisseurs (Responsable Achats)

**Files:**
- Create: `src/app/commandes-fournisseurs/page.tsx`
- Create: `src/app/commandes-fournisseurs/PurchaseOrdersList.tsx`

**Interfaces:**
- Consumes: `listPendingPurchaseOrders`, `validatePurchaseOrder`, `rejectPurchaseOrder`, `emitPurchaseOrder`, `listPurchaseOrders` from `src/lib/actions/purchase-orders.ts` (Task 7); `getServerSession` (Task 4).

- [ ] **Step 1: Purchase orders list component (client component)**

Create `src/app/commandes-fournisseurs/PurchaseOrdersList.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validatePurchaseOrder, rejectPurchaseOrder, emitPurchaseOrder } from "@/lib/actions/purchase-orders";

interface Line {
  quantity: number;
  product: { name: string };
}

interface Order {
  id: string;
  status: string;
  supplier: { name: string };
  lines: Line[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_VALIDATION: "À valider",
  VALIDATED: "Validée",
  SENT: "Envoyée",
  DELIVERED: "Livrée",
  REJECTED: "Rejetée",
};

export function PurchaseOrdersList({ orders, currentUserId }: { orders: Order[]; currentUserId: string }) {
  const [localOrders, setLocalOrders] = useState(orders);

  function updateStatus(id: string, status: string) {
    setLocalOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function handleValidate(id: string) {
    const result = await validatePurchaseOrder(id, currentUserId);
    if (result.success) {
      toast.success("Commande validée");
      updateStatus(id, "VALIDATED");
    }
  }

  async function handleReject(id: string) {
    const result = await rejectPurchaseOrder(id, currentUserId);
    if (result.success) {
      toast.success("Commande rejetée");
      updateStatus(id, "REJECTED");
    }
  }

  async function handleEmit(id: string) {
    const result = await emitPurchaseOrder(id);
    if (result.success) {
      toast.success("Commande émise au fournisseur");
      updateStatus(id, "SENT");
    }
  }

  return (
    <div className="space-y-3">
      {localOrders.map((order) => (
        <div key={order.id} className="flex items-center justify-between rounded border p-4">
          <div>
            <p className="font-medium">{order.supplier.name}</p>
            <p className="text-sm text-muted-foreground">
              {order.lines.map((l) => `${l.product.name} x${l.quantity}`).join(", ")}
            </p>
            <Badge variant="secondary" className="mt-1">
              {STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <div className="space-x-2">
            {order.status === "PENDING_VALIDATION" && (
              <>
                <Button onClick={() => handleValidate(order.id)}>Valider</Button>
                <Button variant="destructive" onClick={() => handleReject(order.id)}>
                  Rejeter
                </Button>
              </>
            )}
            {order.status === "VALIDATED" && <Button onClick={() => handleEmit(order.id)}>Émettre au fournisseur</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Page (server component fetching session + orders)**

Create `src/app/commandes-fournisseurs/page.tsx`:
```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { PurchaseOrdersList } from "./PurchaseOrdersList";

export default async function PurchaseOrdersPage() {
  const session = await getServerSession(authOptions);
  const orders = await listPurchaseOrders();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Commandes fournisseurs</h1>
      <PurchaseOrdersList orders={orders} currentUserId={session!.user.id} />
    </div>
  );
}
```

- [ ] **Step 3: Manual end-to-end verification of the full loop**

Run: `npm run dev`.
1. Log in as `gestionnaire@stock.local`, go to `/catalogue/produits`: note "Souris optique" is below Qmin (8 < 15), so a `PurchaseOrder` should already exist (created by the seed-triggering logic the first time any stock-decrementing action ran — if none ran yet, manually create a customer order for 1 unit of another product to trigger a re-check, or directly verify via `/commandes-fournisseurs`).
2. Log out, log in as `achats@stock.local`, go to `/commandes-fournisseurs`, validate the pending order, then emit it.
3. Log out, log in as `gestionnaire@stock.local`, go to `/reception-livraison`, the emitted order should appear; confirm reception with matching quantities.
Expected: order status becomes `DELIVERED`, `Product.quantity` increases in `/catalogue/produits`.
Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add purchase order validation and emission screen"
```

---

### Task 11: Dashboard and navigation shell

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/NavLinks.tsx`
- Modify: `src/app/layout.tsx` (wrap authenticated pages with `AppShell`)
- Modify: `src/app/page.tsx` (redirect `/` to `/dashboard` or `/login`)

**Interfaces:**
- Consumes: `listProducts` (Task 6), `listCustomerOrders` (Task 8), `listPurchaseOrders` (Task 7), `getServerSession` (Task 4), `NotificationBell` (Task 5).

- [ ] **Step 1: Root page redirect**

Replace contents of `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  redirect(session ? "/dashboard" : "/login");
}
```

- [ ] **Step 2: Navigation links component**

Create `src/components/layout/NavLinks.tsx`:
```tsx
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
```

- [ ] **Step 3: App shell layout component**

Create `src/components/layout/AppShell.tsx`:
```tsx
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
```

- [ ] **Step 4: Wire AppShell into layout (conditionally, skip on /login)**

Modify `src/app/layout.tsx` body to use a small client wrapper that hides the shell on `/login`. Create `src/components/layout/ConditionalShell.tsx`:
```tsx
"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";
import type { ReactNode } from "react";

export function ConditionalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/login") return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
```

Update `src/app/layout.tsx` so `<SessionProviderWrapper>` wraps `<ConditionalShell>{children}</ConditionalShell>` instead of `{children}` directly.

- [ ] **Step 5: Dashboard page**

Create `src/app/dashboard/page.tsx`:
```tsx
import { listProducts } from "@/lib/actions/products";
import { listCustomerOrders } from "@/lib/actions/customer-orders";
import { listPurchaseOrders } from "@/lib/actions/purchase-orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const [products, customerOrders, purchaseOrders] = await Promise.all([
    listProducts(),
    listCustomerOrders(),
    listPurchaseOrders(),
  ]);

  const belowThreshold = products.filter((p) => p.quantity < p.qMin);
  const pendingCustomerOrders = customerOrders.filter((o) => o.status === "STOCK_INSUFFICIENT");
  const pendingPurchaseOrders = purchaseOrders.filter((o) => o.status === "PENDING_VALIDATION");

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Tableau de bord</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Produits sous le seuil</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{belowThreshold.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commandes clients en rupture</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pendingCustomerOrders.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Commandes fournisseur à valider</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{pendingPurchaseOrders.length}</CardContent>
        </Card>
      </div>

      {belowThreshold.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-medium">Alertes stock</h2>
          <ul className="list-inside list-disc">
            {belowThreshold.map((p) => (
              <li key={p.id}>
                {p.name}: {p.quantity} / seuil {p.qMin}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Full manual verification**

Run: `npm run dev`. Log in with each seeded user and confirm: navigation shows only role-appropriate links, dashboard renders KPIs, notification bell shows unread count after triggering a stock-insufficient customer order.
Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add dashboard, navigation shell, and role-based nav links"
```

---

### Task 12: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run full unit test suite**

Run: `npm test`
Expected: all tests pass (10 tests from Task 3).

- [ ] **Step 2: Run lint and build**

Run:
```bash
npm run lint
npm run build
```
Expected: lint reports no errors; build completes successfully with no type errors.

- [ ] **Step 3: Reset and reseed the database for a clean demo state**

Run:
```bash
rm -f prisma/dev.db
npx prisma migrate dev --name init --skip-seed
npx prisma db seed
```
Expected: fresh `dev.db` with seed data only.

- [ ] **Step 4: Full manual walkthrough of the BPMN loop**

Run: `npm run dev` and walk through, in order:
1. Login as Gestionnaire de stock → create a customer order for "Souris optique" (qty 3, below current stock of 8) → confirm order is `RESERVED`, stock drops to 5, still above Qmin 15? (Note: seeded qty 8 < qMin 15, so a purchase order should already trigger regardless.)
2. Go to `/commandes-fournisseurs` while logged in as Gestionnaire — confirm read-only view isn't accessible (role-protected route); login as Responsable Achats instead, validate and emit the pending purchase order for "Souris optique".
3. Login as Gestionnaire de stock, go to `/reception-livraison`, receive the delivery with matching quantities → confirm stock increments and order status becomes `DELIVERED`.
4. Go to `/preparation-colis`, mark the earlier reserved customer order as shipped.
5. Check `/notifications` for both roles — confirm relevant notifications appeared at each step.

Expected: no errors in the browser console or server logs at any step.

- [ ] **Step 5: Commit final state if any fixes were made during verification**

```bash
git add -A
git commit -m "chore: final verification pass and fixes"
```
(Skip this commit if no changes were needed.)

---
