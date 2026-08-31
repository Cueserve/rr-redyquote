"use client";

import Image from "next/image";
import { useTransition } from "react";
import { signIn } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function LoginForm() {
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn(undefined, formData);
      if (result?.message) {
        toast.error(result.message);
      }
    });
  };

  return (
    <Card
      padding="none"
      className="w-full max-w-[380px] overflow-hidden shadow-xl border-border/60 rounded-2xl bg-card/80 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl"
    >
      <div className="flex justify-center bg-gradient-to-b from-muted/50 to-card/50 border-b border-border py-10 relative group">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <img
          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}/storage/v1/object/public/branding/logo.png`}
          onError={(e) => {
            e.currentTarget.src = "/redyref-logo.png";
          }}
          alt="REDYREF Logo"
          className="h-auto w-auto max-h-[73px] max-w-[220px] drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-6 px-8 py-10 sm:px-10"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@redyref.com"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold">
            Password
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
