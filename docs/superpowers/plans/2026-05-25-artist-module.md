# Artist-Modul (Phase 2 Lean MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Artist-Datenbank mit vollständigem CRUD für Artists und Projekte — Listenansicht, Detailseite mit Tabs, Formulare als eigene Seiten.

**Architecture:** Server Components lesen Daten direkt via Prisma. Client Components rufen Server Actions auf und leiten nach Erfolg via `redirect()` weiter. Tab-Navigation läuft über URL-Parameter `?tab=X`, kein clientseitiger State. Keine Vercel-spezifischen APIs.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma ORM, Zod v4, React 19 `useActionState`

> **Kein Testframework installiert.** Verifikation erfolgt via `pnpm typecheck` nach jeder Datei und manueller Durchklickstrecke am Ende.

---

## Dateiübersicht

| Aktion | Pfad | Verantwortung |
|--------|------|---------------|
| Create | `src/modules/artists/actions/artist.actions.ts` | CRUD-Actions für Artists |
| Create | `src/modules/artists/actions/project.actions.ts` | CRUD-Actions für Projects |
| Create | `src/modules/artists/components/ArtistTable.tsx` | Tabellen-Komponente (Client) |
| Create | `src/modules/artists/components/ArtistForm.tsx` | Create/Edit-Formular (Client) |
| Create | `src/modules/artists/components/ProjectList.tsx` | Projektliste im Tab (Server) |
| Create | `src/modules/artists/components/ProjectForm.tsx` | Projekt-Formular (Client) |
| Create | `src/app/(dashboard)/artists/page.tsx` | Artist-Listseite |
| Create | `src/app/(dashboard)/artists/new/page.tsx` | Artist anlegen |
| Create | `src/app/(dashboard)/artists/[id]/page.tsx` | Artist-Detail mit Tabs |
| Create | `src/app/(dashboard)/artists/[id]/edit/page.tsx` | Artist bearbeiten |
| Create | `src/app/(dashboard)/artists/[id]/projects/new/page.tsx` | Projekt anlegen |
| Create | `src/app/(dashboard)/artists/[id]/projects/[projectId]/edit/page.tsx` | Projekt bearbeiten |

---

## Task 1: Datenbankschema migrieren

**Files:**
- Run: `pnpm prisma migrate dev`

- [ ] **Step 1: Migration ausführen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
pnpm prisma migrate dev --name init
```

Erwartetes Ergebnis:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database ...

Applying migration `20260525000000_init`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20260525000000_init/
       └─ migration.sql

Your database is now in sync with your schema.
```

> Voraussetzung: `DATABASE_URL` in `.env` ist gesetzt und die PostgreSQL-Datenbank läuft.

- [ ] **Step 2: Prisma Studio kurz prüfen (optional)**

```bash
pnpm db:studio
```

Öffnet Browser auf `http://localhost:5555`. Prüfen, ob die Tabellen `Artist`, `Project`, `Note`, `Venue`, `Booking` etc. sichtbar sind. Studio wieder schließen.

- [ ] **Step 3: Verzeichnisstruktur anlegen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
mkdir -p src/modules/artists/actions
mkdir -p src/modules/artists/components
mkdir -p src/app/\(dashboard\)/artists/new
mkdir -p "src/app/(dashboard)/artists/[id]/edit"
mkdir -p "src/app/(dashboard)/artists/[id]/projects/new"
mkdir -p "src/app/(dashboard)/artists/[id]/projects/[projectId]/edit"
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add prisma/migrations/
git commit -m "chore: run initial database migration"
```

---

## Task 2: Artist Actions

**Files:**
- Create: `src/modules/artists/actions/artist.actions.ts`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/modules/artists/actions/artist.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"
import type { Artist, Project } from "@prisma/client"

// ─── Types ───────────────────────────────────────────────────────────────────

export type ArtistFormState = {
  errors?: {
    name?: string[]
    email?: string[]
    phone?: string[]
    website?: string[]
  }
  message?: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

const ArtistSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional(),
  phone: z.string().optional(),
  website: z.string().url("Ungültige URL").optional(),
})

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getArtists(): Promise<
  (Artist & { _count: { projects: number } })[]
> {
  return db.artist.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { projects: true } } },
  })
}

export async function getArtistById(
  id: string
): Promise<(Artist & { projects: Project[] }) | null> {
  return db.artist.findUnique({
    where: { id },
    include: { projects: { orderBy: { name: "asc" } } },
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createArtist(
  prevState: ArtistFormState,
  formData: FormData
): Promise<ArtistFormState> {
  const result = ArtistSchema.safeParse({
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    website: (formData.get("website") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  let artistId: string
  try {
    const artist = await db.artist.create({
      data: {
        name: result.data.name,
        email: result.data.email ?? null,
        phone: result.data.phone ?? null,
        website: result.data.website ?? null,
      },
    })
    artistId = artist.id
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/artists/${artistId}`)
}

export async function updateArtist(
  id: string,
  prevState: ArtistFormState,
  formData: FormData
): Promise<ArtistFormState> {
  const result = ArtistSchema.safeParse({
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    website: (formData.get("website") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.artist.update({
      where: { id },
      data: {
        name: result.data.name,
        email: result.data.email ?? null,
        phone: result.data.phone ?? null,
        website: result.data.website ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/artists/${id}`)
}

export async function deleteArtist(id: string): Promise<void> {
  // Hinweis: Wenn in Phase 4 Bookings existieren, wirft Prisma einen FK-Fehler.
  // Fehlerbehandlung für diesen Fall wird in Phase 4 nachgerüstet.
  await db.artist.delete({ where: { id } })
  redirect("/artists")
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: Kein Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add src/modules/artists/actions/artist.actions.ts
git commit -m "feat: add artist server actions (CRUD)"
```

---

## Task 3: Project Actions

**Files:**
- Create: `src/modules/artists/actions/project.actions.ts`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/modules/artists/actions/project.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProjectFormState = {
  errors?: {
    name?: string[]
    genre?: string[]
    lineup?: string[]
    description?: string[]
  }
  message?: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

const ProjectSchema = z.object({
  name: z.string().min(1, "Projektname ist erforderlich"),
  genre: z.string().optional(),
  lineup: z.string().optional(),
  description: z.string().optional(),
})

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createProject(
  artistId: string,
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const result = ProjectSchema.safeParse({
    name: formData.get("name") as string,
    genre: (formData.get("genre") as string) || undefined,
    lineup: (formData.get("lineup") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.project.create({
      data: {
        artistId,
        name: result.data.name,
        genre: result.data.genre ?? null,
        lineup: result.data.lineup ?? null,
        description: result.data.description ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/artists/${artistId}?tab=projekte`)
}

export async function updateProject(
  id: string,
  artistId: string,
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const result = ProjectSchema.safeParse({
    name: formData.get("name") as string,
    genre: (formData.get("genre") as string) || undefined,
    lineup: (formData.get("lineup") as string) || undefined,
    description: (formData.get("description") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.project.update({
      where: { id },
      data: {
        name: result.data.name,
        genre: result.data.genre ?? null,
        lineup: result.data.lineup ?? null,
        description: result.data.description ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/artists/${artistId}?tab=projekte`)
}

export async function deleteProject(
  id: string,
  artistId: string
): Promise<void> {
  await db.project.delete({ where: { id } })
  redirect(`/artists/${artistId}?tab=projekte`)
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: Kein Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add src/modules/artists/actions/project.actions.ts
git commit -m "feat: add project server actions (CRUD)"
```

---

## Task 4: ArtistTable-Komponente

**Files:**
- Create: `src/modules/artists/components/ArtistTable.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/modules/artists/components/ArtistTable.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/shared/EmptyState"
import type { Artist } from "@prisma/client"

type ArtistWithCount = Artist & { _count: { projects: number } }

interface ArtistTableProps {
  artists: ArtistWithCount[]
}

export function ArtistTable({ artists }: ArtistTableProps) {
  const router = useRouter()

  if (artists.length === 0) {
    return (
      <EmptyState
        title="Noch keine Artists"
        description="Lege deinen ersten Artist an, um loszulegen."
        action={
          <Button onClick={() => router.push("/artists/new")}>
            Artist anlegen
          </Button>
        }
      />
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">E-Mail</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Telefon</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Projekte</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Angelegt</th>
          </tr>
        </thead>
        <tbody>
          {artists.map((artist) => (
            <tr
              key={artist.id}
              className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => router.push(`/artists/${artist.id}`)}
            >
              <td className="px-4 py-3 font-medium text-slate-900">
                {artist.name}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {artist.email ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {artist.phone ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {artist._count.projects}
              </td>
              <td className="px-4 py-3 text-slate-500">
                {new Date(artist.createdAt).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: Kein Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add src/modules/artists/components/ArtistTable.tsx
git commit -m "feat: add ArtistTable component"
```

---

## Task 5: ArtistForm-Komponente

**Files:**
- Create: `src/modules/artists/components/ArtistForm.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/modules/artists/components/ArtistForm.tsx
"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import type { ArtistFormState } from "@/modules/artists/actions/artist.actions"
import type { Artist } from "@prisma/client"

interface ArtistFormProps {
  action: (
    prevState: ArtistFormState,
    formData: FormData
  ) => Promise<ArtistFormState>
  defaultValues?: Pick<Artist, "name" | "email" | "phone" | "website">
  cancelHref: string
}

const initialState: ArtistFormState = {}

export function ArtistForm({
  action,
  defaultValues,
  cancelHref,
}: ArtistFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>
          {defaultValues ? "Artist bearbeiten" : "Artist anlegen"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.message && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {state.message}
            </p>
          )}

          <Input
            label="Name"
            name="name"
            required
            autoFocus
            defaultValue={defaultValues?.name ?? ""}
            error={state.errors?.name?.[0]}
            placeholder="Künstlername oder Bandname"
          />

          <Input
            label="E-Mail"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            error={state.errors?.email?.[0]}
            placeholder="booking@beispiel.de"
          />

          <Input
            label="Telefon"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
            error={state.errors?.phone?.[0]}
            placeholder="+49 123 456789"
          />

          <Input
            label="Website"
            name="website"
            type="url"
            defaultValue={defaultValues?.website ?? ""}
            error={state.errors?.website?.[0]}
            placeholder="https://beispiel.de"
          />

          <div className="flex gap-3 justify-end pt-2">
            <Link
              href={cancelHref}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Abbrechen
            </Link>
            <Button type="submit" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: Kein Fehler.

- [ ] **Step 3: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add src/modules/artists/components/ArtistForm.tsx
git commit -m "feat: add ArtistForm component"
```

---

## Task 6: Artist-Listseite

**Files:**
- Create: `src/app/(dashboard)/artists/page.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/app/(dashboard)/artists/page.tsx
import Link from "next/link"
import { getArtists } from "@/modules/artists/actions/artist.actions"
import { ArtistTable } from "@/modules/artists/components/ArtistTable"
import { Button } from "@/components/ui/Button"

export const metadata = { title: "Artists – Booker App" }

export default async function ArtistsPage() {
  const artists = await getArtists()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Artists</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {artists.length} {artists.length === 1 ? "Artist" : "Artists"} in der Datenbank
          </p>
        </div>
        <Link
          href="/artists/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Artist anlegen
        </Link>
      </div>

      <ArtistTable artists={artists} />
    </div>
  )
}

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Dev-Server starten und Seite prüfen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Öffne `http://localhost:3000/artists`. Erwartetes Verhalten:
- Seite lädt (nach Login-Redirect falls keine Session)
- EmptyState wird angezeigt da noch keine Artists vorhanden

Server mit `Ctrl+C` stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add "src/app/(dashboard)/artists/page.tsx"
git commit -m "feat: add artist list page"
```

---

## Task 7: Artist-Anlegen-Seite

**Files:**
- Create: `src/app/(dashboard)/artists/new/page.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/app/(dashboard)/artists/new/page.tsx
import { createArtist } from "@/modules/artists/actions/artist.actions"
import { ArtistForm } from "@/modules/artists/components/ArtistForm"

export const metadata = { title: "Artist anlegen – Booker App" }

export default function NewArtistPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Artist anlegen</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Neuen Künstler oder neue Band in die Datenbank aufnehmen.
        </p>
      </div>

      <ArtistForm action={createArtist} cancelHref="/artists" />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Dev-Server starten und Formular testen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Öffne `http://localhost:3000/artists/new`. Prüfen:
- Formular mit Feldern Name, E-Mail, Telefon, Website wird angezeigt
- Absenden ohne Name → Validierungsfehler "Name ist erforderlich" erscheint
- Absenden mit Name → Weiterleitung zu `/artists/[id]` (404 solange Detailseite noch nicht existiert, aber Redirect-Verhalten ist korrekt)
- Neuer Artist erscheint auf `/artists`

Server mit `Ctrl+C` stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add "src/app/(dashboard)/artists/new/page.tsx"
git commit -m "feat: add artist create page"
```

---

## Task 8: Artist-Detailseite mit Tabs

**Files:**
- Create: `src/app/(dashboard)/artists/[id]/page.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/app/(dashboard)/artists/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getArtistById } from "@/modules/artists/actions/artist.actions"
import { ProjectList } from "@/modules/artists/components/ProjectList"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

const TABS = [
  { label: "Übersicht", value: "uebersicht" },
  { label: "Projekte", value: "projekte" },
  { label: "Bookings", value: "bookings" },
] as const

type Tab = (typeof TABS)[number]["value"]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const artist = await getArtistById(id)
  return { title: artist ? `${artist.name} – Booker App` : "Artist – Booker App" }
}

export default async function ArtistDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams

  const artist = await getArtistById(id)
  if (!artist) notFound()

  const activeTab: Tab =
    TABS.some((t) => t.value === tab) ? (tab as Tab) : "uebersicht"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/artists"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Artists
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{artist.name}</h2>
        </div>
        <Link
          href={`/artists/${id}/edit`}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/artists/${id}?tab=${t.value}`}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === t.value
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "uebersicht" && (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-3 py-5">
            <InfoRow label="E-Mail" value={artist.email} />
            <InfoRow label="Telefon" value={artist.phone} />
            <InfoRow label="Website" value={artist.website} isLink />
          </CardContent>
        </Card>
      )}

      {activeTab === "projekte" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href={`/artists/${id}/projects/new`}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Projekt anlegen
            </Link>
          </div>
          <ProjectList projects={artist.projects} artistId={id} />
        </div>
      )}

      {activeTab === "bookings" && (
        <EmptyState
          title="Noch keine Bookings"
          description="Bookings werden in Phase 4 implementiert."
        />
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  isLink = false,
}: {
  label: string
  value: string | null | undefined
  isLink?: boolean
}) {
  return (
    <div className="flex gap-4">
      <span className="w-24 flex-shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      {value ? (
        isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:underline truncate"
          >
            {value}
          </a>
        ) : (
          <span className="text-sm text-slate-900">{value}</span>
        )
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Dev-Server starten und Seite prüfen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Einen zuvor angelegten Artist anklicken. Prüfen:
- Übersicht-Tab zeigt Kontaktdaten
- Projekte-Tab zeigt EmptyState + "Projekt anlegen"-Button
- Bookings-Tab zeigt Phase-4-Hinweis
- URL ändert sich bei Tab-Wechsel (`?tab=projekte`)
- Browser-Back funktioniert

Server mit `Ctrl+C` stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add "src/app/(dashboard)/artists/[id]/page.tsx"
git commit -m "feat: add artist detail page with tabs"
```

---

## Task 9: Artist-Bearbeiten-Seite

**Files:**
- Create: `src/app/(dashboard)/artists/[id]/edit/page.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/app/(dashboard)/artists/[id]/edit/page.tsx
import { notFound } from "next/navigation"
import {
  getArtistById,
  updateArtist,
  deleteArtist,
} from "@/modules/artists/actions/artist.actions"
import { ArtistForm } from "@/modules/artists/components/ArtistForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Artist bearbeiten – Booker App" }

export default async function EditArtistPage({ params }: Props) {
  const { id } = await params
  const artist = await getArtistById(id)
  if (!artist) notFound()

  const updateArtistWithId = updateArtist.bind(null, id)
  const deleteArtistWithId = deleteArtist.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Artist bearbeiten
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{artist.name}</p>
      </div>

      <ArtistForm
        action={updateArtistWithId}
        defaultValues={artist}
        cancelHref={`/artists/${id}`}
      />

      {/* Gefahrenzone */}
      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">
          Artist löschen
        </h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht den Artist und alle zugehörigen Projekte dauerhaft.
        </p>
        <form action={deleteArtistWithId}>
          <Button type="submit" variant="danger" size="sm">
            Artist löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Dev-Server starten und Bearbeitung testen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Artist-Detailseite öffnen → "Bearbeiten" klicken. Prüfen:
- Formular ist mit Artist-Daten vorausgefüllt
- Änderung speichern → Weiterleitung zur Detailseite mit aktualisierten Daten
- Löschen-Button → Artist nicht mehr in Liste

Server mit `Ctrl+C` stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add "src/app/(dashboard)/artists/[id]/edit/page.tsx"
git commit -m "feat: add artist edit page with delete"
```

---

## Task 10: ProjectList-Komponente

**Files:**
- Create: `src/modules/artists/components/ProjectList.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/modules/artists/components/ProjectList.tsx
import Link from "next/link"
import { deleteProject } from "@/modules/artists/actions/project.actions"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/Button"
import type { Project } from "@prisma/client"

interface ProjectListProps {
  projects: Project[]
  artistId: string
}

export function ProjectList({ projects, artistId }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Noch keine Projekte"
        description="Lege ein Projekt an, z.B. das Hauptprojekt der Band oder ein Akustik-Set."
      />
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {projects.map((project) => {
        const deleteProjectAction = deleteProject.bind(null, project.id, artistId)

        return (
          <div
            key={project.id}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-900">
                {project.name}
              </span>
              {(project.genre || project.lineup) && (
                <span className="text-xs text-slate-500">
                  {[project.genre, project.lineup].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/artists/${artistId}/projects/${project.id}/edit`}
                className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Bearbeiten
              </Link>
              <form action={deleteProjectAction}>
                <Button type="submit" variant="danger" size="sm">
                  Löschen
                </Button>
              </form>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add src/modules/artists/components/ProjectList.tsx
git commit -m "feat: add ProjectList component"
```

---

## Task 11: ProjectForm-Komponente

**Files:**
- Create: `src/modules/artists/components/ProjectForm.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/modules/artists/components/ProjectForm.tsx
"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Textarea } from "@/components/ui/Textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import type { ProjectFormState } from "@/modules/artists/actions/project.actions"
import type { Project } from "@prisma/client"

interface ProjectFormProps {
  action: (
    prevState: ProjectFormState,
    formData: FormData
  ) => Promise<ProjectFormState>
  defaultValues?: Pick<Project, "name" | "genre" | "lineup" | "description">
  cancelHref: string
}

const initialState: ProjectFormState = {}

export function ProjectForm({
  action,
  defaultValues,
  cancelHref,
}: ProjectFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>
          {defaultValues ? "Projekt bearbeiten" : "Projekt anlegen"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.message && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {state.message}
            </p>
          )}

          <Input
            label="Projektname"
            name="name"
            required
            autoFocus
            defaultValue={defaultValues?.name ?? ""}
            error={state.errors?.name?.[0]}
            placeholder="z.B. Hauptprojekt, Akustik-Set, DJ-Set"
          />

          <Input
            label="Genre"
            name="genre"
            defaultValue={defaultValues?.genre ?? ""}
            error={state.errors?.genre?.[0]}
            placeholder="z.B. Indie Pop, Jazz, Electronic"
          />

          <Input
            label="Besetzung"
            name="lineup"
            defaultValue={defaultValues?.lineup ?? ""}
            error={state.errors?.lineup?.[0]}
            placeholder="z.B. Duo, Quartett, Solo"
          />

          <Textarea
            label="Beschreibung"
            name="description"
            defaultValue={defaultValues?.description ?? ""}
            error={state.errors?.description?.[0]}
            placeholder="Kurzbeschreibung des Projekts…"
          />

          <div className="flex gap-3 justify-end pt-2">
            <Link
              href={cancelHref}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Abbrechen
            </Link>
            <Button type="submit" loading={isPending}>
              Speichern
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add src/modules/artists/components/ProjectForm.tsx
git commit -m "feat: add ProjectForm component"
```

---

## Task 12: Projekt-Anlegen-Seite

**Files:**
- Create: `src/app/(dashboard)/artists/[id]/projects/new/page.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/app/(dashboard)/artists/[id]/projects/new/page.tsx
import { notFound } from "next/navigation"
import { getArtistById } from "@/modules/artists/actions/artist.actions"
import { createProject } from "@/modules/artists/actions/project.actions"
import { ProjectForm } from "@/modules/artists/components/ProjectForm"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Projekt anlegen – Booker App" }

export default async function NewProjectPage({ params }: Props) {
  const { id } = await params
  const artist = await getArtistById(id)
  if (!artist) notFound()

  const createProjectForArtist = createProject.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Projekt anlegen</h2>
        <p className="mt-0.5 text-sm text-slate-500">für {artist.name}</p>
      </div>

      <ProjectForm
        action={createProjectForArtist}
        cancelHref={`/artists/${id}?tab=projekte`}
      />
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Dev-Server starten und Formular testen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Artist-Detailseite → Projekte-Tab → "Projekt anlegen". Prüfen:
- Formular mit Artist-Name als Kontext sichtbar
- Pflichtfeld-Validierung funktioniert
- Nach Speichern: Weiterleitung zu Projekte-Tab, Projekt erscheint in Liste

Server mit `Ctrl+C` stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add "src/app/(dashboard)/artists/[id]/projects/new/page.tsx"
git commit -m "feat: add project create page"
```

---

## Task 13: Projekt-Bearbeiten-Seite

**Files:**
- Create: `src/app/(dashboard)/artists/[id]/projects/[projectId]/edit/page.tsx`

- [ ] **Step 1: Datei erstellen**

```typescript
// src/app/(dashboard)/artists/[id]/projects/[projectId]/edit/page.tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  updateProject,
  deleteProject,
} from "@/modules/artists/actions/project.actions"
import { ProjectForm } from "@/modules/artists/components/ProjectForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string; projectId: string }>
}

export const metadata = { title: "Projekt bearbeiten – Booker App" }

export default async function EditProjectPage({ params }: Props) {
  const { id: artistId, projectId } = await params

  const project = await db.project.findUnique({
    where: { id: projectId, artistId },
  })
  if (!project) notFound()

  const updateProjectWithIds = updateProject.bind(null, projectId, artistId)
  const deleteProjectWithIds = deleteProject.bind(null, projectId, artistId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Projekt bearbeiten
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{project.name}</p>
      </div>

      <ProjectForm
        action={updateProjectWithIds}
        defaultValues={project}
        cancelHref={`/artists/${artistId}?tab=projekte`}
      />

      {/* Gefahrenzone */}
      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">
          Projekt löschen
        </h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht dieses Projekt dauerhaft.
        </p>
        <form action={deleteProjectWithIds}>
          <Button type="submit" variant="danger" size="sm">
            Projekt löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript-Check**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

- [ ] **Step 3: Dev-Server starten und Bearbeitung testen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Projekt → "Bearbeiten" klicken. Prüfen:
- Formular ist vorausgefüllt
- Änderung speichern → Weiterleitung zu Projekte-Tab
- Löschen → Projekt verschwindet aus Liste

Server mit `Ctrl+C` stoppen.

- [ ] **Step 4: Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add "src/app/(dashboard)/artists/[id]/projects/[projectId]/edit/page.tsx"
git commit -m "feat: add project edit page with delete"
```

---

## Task 14: End-to-End-Verifikation + Build

**Files:** keine neuen Dateien

- [ ] **Step 1: Vollständige Durchklickstrecke**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm dev
```

Folgende Schritte manuell durchführen:

1. `http://localhost:3000/artists` öffnen → EmptyState sichtbar
2. "Artist anlegen" → Formular ausfüllen → Speichern → Artist in Liste
3. Artist anklicken → Detailseite öffnet, Übersicht-Tab sichtbar
4. Tabs wechseln (Projekte, Bookings) → URL ändert sich
5. "Bearbeiten" → Daten ändern → Speichern → Änderungen sichtbar
6. Projekte-Tab → "Projekt anlegen" → ausfüllen → Speichern → Projekt in Liste
7. Projekt "Bearbeiten" → Änderung → Speichern
8. Projekt löschen → verschwindet aus Liste
9. Artist löschen → verschwindet aus `/artists`

Server mit `Ctrl+C` stoppen.

- [ ] **Step 2: Production Build**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm build
```

Erwartetes Ergebnis: Build ohne Fehler. Alle Routen in der Route-Übersicht sichtbar.

- [ ] **Step 3: TypeScript-Abschlussprüfung**

```bash
cd "/Users/detlefhoefer/Developer/Booker App" && pnpm typecheck
```

Erwartetes Ergebnis: 0 Fehler.

- [ ] **Step 4: Abschluss-Commit**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
git add -A
git status  # Prüfen ob unerwartete Dateien dabei sind
git commit -m "feat: complete artist module MVP (Phase 2)"
```

---

## Implementiert / Nicht implementiert

**In diesem Plan enthalten:**
- Artist CRUD (anlegen, bearbeiten, löschen, anzeigen)
- Project CRUD (anlegen, bearbeiten, löschen)
- Artist-Liste als Tabelle
- Artist-Detailseite mit 3 Tabs (URL-basiert)
- Formular-Validierung mit Zod + useActionState
- Fehleranzeige inline unter Feldern
- Keine Vercel-spezifischen APIs

**Bewusst nicht enthalten (spätere Phasen):**
- Bewertungen (Sterne)
- Notizen
- Volltextsuche
- CSV-Import
- Booking-Tab-Inhalt (Phase 4)
