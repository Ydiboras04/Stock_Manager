"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ProductForChart {
  id: string;
  name: string;
  quantity: number;
  qMin: number;
}

export function StockLevelsChart({ products }: { products: ProductForChart[] }) {
  if (products.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun produit.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={products} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "var(--foreground)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="quantity" name="Quantité" fill="var(--chart-viz-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="qMin" name="Seuil Qmin" fill="var(--chart-viz-1)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
