"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
}

export function Header({ title, onMenuToggle }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Menü öffnen"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {title && (
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {session?.user && (
          <span className="hidden text-sm text-slate-500 sm:inline">{session.user.email}</span>
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
