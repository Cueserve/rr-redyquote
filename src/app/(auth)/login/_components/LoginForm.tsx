"use client";

import { useActionState } from "react";
import { signIn } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const initialState = {
  message: "",
};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <Card className="w-full max-w-96">
      <form action={formAction} className="flex flex-col gap-5 p-6">
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

        <p aria-live="polite" className="text-sm font-medium text-destructive">
          {state?.message}
        </p>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}
