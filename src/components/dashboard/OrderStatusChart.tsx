"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, ResponsiveContainer } from "recharts";

export interface StatusCount {
  status: string;
  count: number;
}

export function OrderStatusChart({ data }: { data: StatusCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune commande.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
          labelStyle={{ color: "var(--foreground)" }}
        />
        <Bar dataKey="count" fill="var(--chart-viz-1)" radius={[4, 4, 0, 0]}>
          <LabelList dataKey="count" position="top" fill="var(--foreground)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
