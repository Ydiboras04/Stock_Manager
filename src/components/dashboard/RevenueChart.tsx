"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { RevenuePoint } from "@/lib/business/dashboard-charts";

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>;
  }

  const formatted = data.map((point) => ({
    date: point.date,
    Ventes: point.salesCents / 100,
    Achats: point.purchasesCents / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}€`} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "var(--foreground)" }}
          formatter={(value) => {
            const numericValue = typeof value === "number" ? value : Number(value ?? 0);
            return `${numericValue.toFixed(2)} €`;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="Ventes" stroke="var(--chart-viz-1)" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Achats" stroke="var(--chart-viz-2)" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
