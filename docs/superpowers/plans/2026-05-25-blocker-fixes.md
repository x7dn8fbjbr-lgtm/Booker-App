# Blocker-Fixes: Middleware & cn() Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Zwei kritische Bugs beheben, die Auth-Schutz deaktivieren und `cn()` funktionslos machen.

**Architecture:** Reine Korrekturen an bestehenden Dateien — kein neuer Code, keine neuen Dateien, keine neuen Abhängigkeiten. Fix 1 ist ein Datei-Rename, Fix 2 ist eine einzelne Codezeile.

**Tech Stack:** Next.js App Router, TypeScript, clsx (bereits installiert)

> **Hinweis zu Tests:** Das Projekt hat kein Testframework installiert. Beide Fixes werden manuell verifiziert. Die Middleware-Verifikation erfordert einen laufenden Dev-Server; `cn()` wird via TypeScript-Compiler-Check und manuelle Überprüfung bestätigt.

---

## Dateien

| Aktion | Pfad |
|--------|------|
| Umbenennen | `src/proxy.ts` → `src/middleware.ts` |
| Modifizieren | `src/lib/utils.ts` (Zeile 5) |

---

### Task 1: Middleware-Datei umbenennen

**Files:**
- Rename: `src/proxy.ts` → `src/middleware.ts`

- [x] **Step 1: Datei mit git mv umbenennen**

`git mv` ersetzt die Shell-`mv` — es verschiebt die Datei und staged die Umbenennung in einem Schritt, sodass git sie als Rename (nicht als Delete + Add) erkennt.

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && \
git mv src/proxy.ts src/middleware.ts
```

- [x] **Step 2: Inhalt verifizieren**

Datei `src/middleware.ts` lesen und sicherstellen, dass sie exakt so aussieht:

```typescript
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
```

- [x] **Step 3: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: Kein Fehler.

- [x] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && \
git commit -m "fix: rename proxy.ts to middleware.ts so Next.js recognizes auth guard"
```

---

### Task 2: `cn()` korrekt mit clsx verdrahten

**Files:**
- Modify: `src/lib/utils.ts`

- [x] **Step 1: Aktuelle Zeile prüfen**

Datei `src/lib/utils.ts` aufrufen. Sie sieht aktuell so aus:

```typescript
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");  // ← fehlerhaft
}
```

- [x] **Step 2: Fix anwenden**

Zeile 5 ersetzen — `return inputs.filter(Boolean).join(" ");` durch `return clsx(inputs);`:

```typescript
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency,
  }).format(amount);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}
```

- [x] **Step 3: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: Kein Fehler.

- [x] **Step 4: Verhalten manuell prüfen**

Starte den Dev-Server:

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Öffne `http://localhost:3000`. Erwartetes Verhalten: Weiterleitung auf `/login` (weil Middleware jetzt aktiv ist und keine Session vorhanden). Das beweist, dass beide Fixes funktionieren — Middleware-Erkennung UND der App-Start ohne Crash.

Stoppe den Server mit `Ctrl+C`.

- [x] **Step 5: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && \
git add src/lib/utils.ts && \
git commit -m "fix: call clsx() in cn() instead of manual filter/join"
```

---

## Fertig

Nach diesen zwei Tasks:
- Auth-Schutz ist aktiv: alle Routen außer `/login` und `/api/auth/**` leiten auf `/login` um
- `cn()` verarbeitet String-, Array- und Object-Syntax korrekt
- Der Codebase ist bereit für Feature-Entwicklung (Phase 2: Artist-Modul)
