"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";

export function LoginForm() {
  const [demoEmail, setDemoEmail] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDemoLoading(true);
    setDemoError(null);

    const result = await signIn("Demo-Login", {
      email: demoEmail,
      password: demoPassword,
      redirect: false,
      callbackUrl: "/",
    });

    setDemoLoading(false);

    if (result?.error || !result?.ok) {
      setDemoError("Ungültige Demo-Zugangsdaten.");
    } else {
      window.location.href = result.url ?? "/";
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setEmailError(null);

    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);

    if (result?.error) {
      setEmailError("Anmeldung fehlgeschlagen. Bitte versuche es erneut.");
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700">E-Mail gesendet!</p>
          <p className="mt-1 text-sm text-slate-500">
            Prüfe dein Postfach und klicke auf den Link, um dich anzumelden.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Demo-Zugang
          </p>
          <form onSubmit={handleDemoSubmit} className="flex flex-col gap-4">
            <Input
              label="E-Mail"
              type="email"
              placeholder="demo@example.com"
              value={demoEmail}
              onChange={(e) => setDemoEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Passwort"
              type="password"
              placeholder="••••••••"
              value={demoPassword}
              onChange={(e) => setDemoPassword(e.target.value)}
              required
            />
            {demoError && <p className="text-sm text-red-600">{demoError}</p>}
            <Button type="submit" loading={demoLoading} className="w-full">
              Anmelden
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-400">oder</span>
        </div>
      </div>

      <Card>
        <CardContent>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Anmelde-Link per E-Mail
          </p>
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <Input
              label="E-Mail-Adresse"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {emailError && <p className="text-sm text-red-600">{emailError}</p>}
            <Button type="submit" loading={loading} variant="secondary" className="w-full">
              Anmelde-Link anfordern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
