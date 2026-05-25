"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      {title ? (
        <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-3">
        {session?.user && (
          <span className="text-sm text-slate-500">{session.user.email}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          Abmelden
        </Button>
      </div>
    </header>
  );
}
