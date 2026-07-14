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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-md border border-border shadow-sm">
        <div className="border-b border-primary/30 bg-foreground px-6 py-5">
          <p className="font-heading text-[11px] font-semibold tracking-[0.3em] text-primary/70 uppercase">
            Gestion de stock
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-background uppercase">
            Stock<span className="text-primary">{"//"}</span>Mgr
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-card px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs tracking-[0.08em] uppercase text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs tracking-[0.08em] uppercase text-muted-foreground">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full font-heading tracking-widest uppercase" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
