# Venue-Modul (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Venue-Datenbank mit vollständigem CRUD, Ansprechpartner-Verwaltung und CSV-Import (client-seitiges Parsing mit Vorschau).

**Architecture:** Folgt exakt dem Artist-Modul: Server Components für Datenabruf, Server Actions für Mutationen, Client Components für Formulare (`useActionState`). Die Venue-Tabelle und das Venue-Schema sind bereits in der DB. Eine Migration macht `city` nullable für den CSV-Import.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Prisma 6, Zod 4, Tailwind CSS 4, pnpm.

---

## Dateiübersicht

**Neu erstellen:**
- `src/modules/venues/actions/venue.actions.ts`
- `src/modules/venues/actions/contact.actions.ts`
- `src/modules/venues/components/VenueTable.tsx`
- `src/modules/venues/components/VenueForm.tsx`
- `src/modules/venues/components/ContactList.tsx`
- `src/modules/venues/components/ContactForm.tsx`
- `src/modules/venues/components/CsvImport.tsx`
- `src/app/(dashboard)/venues/page.tsx`
- `src/app/(dashboard)/venues/new/page.tsx`
- `src/app/(dashboard)/venues/import/page.tsx`
- `src/app/(dashboard)/venues/[id]/page.tsx`
- `src/app/(dashboard)/venues/[id]/edit/page.tsx`
- `src/app/(dashboard)/venues/[id]/contacts/new/page.tsx`
- `src/app/(dashboard)/venues/[id]/contacts/[contactId]/edit/page.tsx`

**Modifizieren:**
- `prisma/schema.prisma` — `city String` → `city String?`
- `src/modules/venues/actions/venue.actions.ts` — `importVenues` ergänzen (Task 11)

---

## Kontext für Subagenten

Du arbeitest an der Booker App (`/Users/detlefhoefer/Developer/Booker App`), einer Next.js 16 App (App Router, TypeScript strict). Relevante bestehende Muster:

- `"use server"` am Anfang von Action-Dateien
- `useActionState(action, initialState)` aus `"react"` in Form-Komponenten
- `redirect()` immer außerhalb von `try/catch`
- `(formData.get("name") as string | null) ?? ""` für Pflichtfelder
- `(formData.get("email") as string) || undefined` für optionale Felder
- Pages haben `params: Promise<{ id: string }>` (Next.js 16)
- Bestehende UI-Komponenten: `Button`, `Input`, `Select`, `Textarea`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `EmptyState`, `Badge`
- Import-Pfade: `@/components/ui/Button`, `@/components/ui/Input`, etc.
- `cn()` aus `@/lib/utils`
- `db` aus `@/lib/db` (Prisma Client Singleton)
- Kein Test-Framework: Verifikation via `pnpm typecheck` und `pnpm build`

---

## Task 1: Schema-Migration — city nullable

**Files:**
- Modify: `prisma/schema.prisma`

- [x] **Step 1: Ändere `city` von `String` zu `String?` in schema.prisma**

In `prisma/schema.prisma` (ca. Zeile 108):
```prisma
model Venue {
  id          String          @id @default(cuid())
  name        String
  street      String?
  city        String?         // ← war: city String
  zip         String?
  capacity    Int?
  stageSizeM2 Float?
  type        VenueType       @default(SONSTIGE)
  genreTags   String[]
  contacts    ContactPerson[]
  bookings    Booking[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([city])
  @@index([name])
}
```

- [x] **Step 2: Migration lokal ausführen**

```bash
pnpm prisma migrate dev --name make_venue_city_nullable
```

Erwartete Ausgabe: Migration erfolgreich, neue Datei unter `prisma/migrations/XXXX_make_venue_city_nullable/migration.sql`.

- [x] **Step 3: Migration in Supabase ausführen**

Öffne Supabase → SQL Editor → New query und führe aus:

```sql
ALTER TABLE "Venue" ALTER COLUMN "city" DROP NOT NULL;
```

Erwartete Ausgabe: "Success. No rows returned."

- [x] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: make Venue.city nullable for CSV import"
```

---

## Task 2: Venue Server Actions

**Files:**
- Create: `src/modules/venues/actions/venue.actions.ts`

- [x] **Step 1: Datei erstellen**

```typescript
// src/modules/venues/actions/venue.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"
import { VenueType } from "@prisma/client"
import type { Venue, ContactPerson } from "@prisma/client"

// ─── Types ───────────────────────────────────────────────────────────────────

export type VenueFormState = {
  errors?: {
    name?: string[]
    city?: string[]
    street?: string[]
    zip?: string[]
    capacity?: string[]
    stageSizeM2?: string[]
    type?: string[]
    genreTags?: string[]
  }
  message?: string
}

export type ImportRow = {
  name: string
  street?: string
  type: VenueType
}

// ─── Validation ──────────────────────────────────────────────────────────────

const VenueSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  city: z.string().optional(),
  street: z.string().optional(),
  zip: z.string().optional(),
  capacity: z.coerce.number().int().positive("Muss eine positive Zahl sein").optional(),
  stageSizeM2: z.coerce.number().positive("Muss eine positive Zahl sein").optional(),
  type: z.nativeEnum(VenueType).default(VenueType.SONSTIGE),
  genreTags: z.string().optional(),
})

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getVenues(): Promise<
  (Venue & { _count: { contacts: number } })[]
> {
  return db.venue.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { contacts: true } } },
  })
}

export async function getVenueById(
  id: string
): Promise<(Venue & { contacts: ContactPerson[] }) | null> {
  return db.venue.findUnique({
    where: { id },
    include: { contacts: { orderBy: { name: "asc" } } },
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseGenreTags(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(",").map((t) => t.trim()).filter(Boolean)
}

function parseFormData(formData: FormData) {
  return {
    name: (formData.get("name") as string | null) ?? "",
    city: (formData.get("city") as string) || undefined,
    street: (formData.get("street") as string) || undefined,
    zip: (formData.get("zip") as string) || undefined,
    capacity: (formData.get("capacity") as string) || undefined,
    stageSizeM2: (formData.get("stageSizeM2") as string) || undefined,
    type: (formData.get("type") as string) || VenueType.SONSTIGE,
    genreTags: (formData.get("genreTags") as string) || undefined,
  }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createVenue(
  prevState: VenueFormState,
  formData: FormData
): Promise<VenueFormState> {
  const result = VenueSchema.safeParse(parseFormData(formData))

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const genreTags = parseGenreTags(result.data.genreTags)

  let venueId: string
  try {
    const venue = await db.venue.create({
      data: {
        name: result.data.name,
        city: result.data.city ?? null,
        street: result.data.street ?? null,
        zip: result.data.zip ?? null,
        capacity: result.data.capacity ?? null,
        stageSizeM2: result.data.stageSizeM2 ?? null,
        type: result.data.type,
        genreTags,
      },
    })
    venueId = venue.id
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/venues/${venueId}`)
}

export async function updateVenue(
  id: string,
  prevState: VenueFormState,
  formData: FormData
): Promise<VenueFormState> {
  const result = VenueSchema.safeParse(parseFormData(formData))

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const genreTags = parseGenreTags(result.data.genreTags)

  try {
    await db.venue.update({
      where: { id },
      data: {
        name: result.data.name,
        city: result.data.city ?? null,
        street: result.data.street ?? null,
        zip: result.data.zip ?? null,
        capacity: result.data.capacity ?? null,
        stageSizeM2: result.data.stageSizeM2 ?? null,
        type: result.data.type,
        genreTags,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/venues/${id}`)
}

export async function deleteVenue(id: string): Promise<void> {
  await db.venue.delete({ where: { id } })
  redirect("/venues")
}

export async function importVenues(rows: ImportRow[]): Promise<{ count: number }> {
  const validRows = rows.filter((r) => r.name.trim().length > 0)
  await db.venue.createMany({
    data: validRows.map((r) => ({
      name: r.name.trim(),
      street: r.street?.trim() || null,
      city: null,
      type: r.type,
      genreTags: [],
    })),
  })
  return { count: validRows.length }
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add src/modules/venues/actions/venue.actions.ts
git commit -m "feat: add venue server actions (CRUD + import)"
```

---

## Task 3: Contact Server Actions

**Files:**
- Create: `src/modules/venues/actions/contact.actions.ts`

- [x] **Step 1: Datei erstellen**

```typescript
// src/modules/venues/actions/contact.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContactFormState = {
  errors?: {
    name?: string[]
    email?: string[]
    phone?: string[]
    role?: string[]
  }
  message?: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

const ContactSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse").optional(),
  phone: z.string().optional(),
  role: z.string().optional(),
})

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createContact(
  venueId: string,
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const result = ContactSchema.safeParse({
    name: (formData.get("name") as string | null) ?? "",
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    role: (formData.get("role") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.contactPerson.create({
      data: {
        venueId,
        name: result.data.name,
        email: result.data.email ?? null,
        phone: result.data.phone ?? null,
        role: result.data.role ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/venues/${venueId}?tab=ansprechpartner`)
}

export async function updateContact(
  id: string,
  venueId: string,
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const result = ContactSchema.safeParse({
    name: (formData.get("name") as string | null) ?? "",
    email: (formData.get("email") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    role: (formData.get("role") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.contactPerson.update({
      where: { id },
      data: {
        name: result.data.name,
        email: result.data.email ?? null,
        phone: result.data.phone ?? null,
        role: result.data.role ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/venues/${venueId}?tab=ansprechpartner`)
}

export async function deleteContact(id: string, venueId: string): Promise<void> {
  await db.contactPerson.delete({ where: { id } })
  redirect(`/venues/${venueId}?tab=ansprechpartner`)
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add src/modules/venues/actions/contact.actions.ts
git commit -m "feat: add contact person server actions (CRUD)"
```

---

## Task 4: VenueTable Komponente

**Files:**
- Create: `src/modules/venues/components/VenueTable.tsx`

- [x] **Step 1: Datei erstellen**

```typescript
// src/modules/venues/components/VenueTable.tsx
"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/shared/EmptyState"
import type { Venue } from "@prisma/client"

type VenueWithCount = Venue & { _count: { contacts: number } }

const VENUE_TYPE_LABELS: Record<string, string> = {
  CLUB: "Club",
  THEATER: "Theater",
  FESTIVAL: "Festival",
  OPEN_AIR: "Open Air",
  SONSTIGE: "Sonstige",
}

interface VenueTableProps {
  venues: VenueWithCount[]
}

export function VenueTable({ venues }: VenueTableProps) {
  const router = useRouter()

  if (venues.length === 0) {
    return (
      <EmptyState
        title="Noch keine Venues"
        description="Lege deine erste Venue an oder importiere eine CSV-Datei."
        action={
          <Button onClick={() => router.push("/venues/new")}>
            Venue anlegen
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
            <th className="px-4 py-3 text-left font-medium text-slate-600">Stadt</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Typ</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Kapazität</th>
            <th className="px-4 py-3 text-left font-medium text-slate-600">Ansprechpartner</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((venue) => (
            <tr
              key={venue.id}
              className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => router.push(`/venues/${venue.id}`)}
            >
              <td className="px-4 py-3 font-medium text-slate-900">{venue.name}</td>
              <td className="px-4 py-3 text-slate-600">{venue.city ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {VENUE_TYPE_LABELS[venue.type] ?? venue.type}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {venue.capacity ? venue.capacity.toLocaleString("de-DE") : "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">{venue._count.contacts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add src/modules/venues/components/VenueTable.tsx
git commit -m "feat: add VenueTable component"
```

---

## Task 5: VenueForm Komponente

**Files:**
- Create: `src/modules/venues/components/VenueForm.tsx`

- [x] **Step 1: Datei erstellen**

```typescript
// src/modules/venues/components/VenueForm.tsx
"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Card, CardContent } from "@/components/ui/Card"
import type { VenueFormState } from "@/modules/venues/actions/venue.actions"
import type { Venue } from "@prisma/client"

interface VenueFormProps {
  action: (prevState: VenueFormState, formData: FormData) => Promise<VenueFormState>
  defaultValues?: Pick<
    Venue,
    "name" | "city" | "street" | "zip" | "capacity" | "stageSizeM2" | "type" | "genreTags"
  >
  cancelHref: string
}

const initialState: VenueFormState = {}

export function VenueForm({ action, defaultValues, cancelHref }: VenueFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardContent className="pt-5">
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
            placeholder="Club Volta"
          />
          <Input
            label="Stadt"
            name="city"
            defaultValue={defaultValues?.city ?? ""}
            error={state.errors?.city?.[0]}
            placeholder="Köln"
          />
          <Input
            label="Straße"
            name="street"
            defaultValue={defaultValues?.street ?? ""}
            error={state.errors?.street?.[0]}
            placeholder="Musterstraße 1"
          />
          <Input
            label="PLZ"
            name="zip"
            defaultValue={defaultValues?.zip ?? ""}
            error={state.errors?.zip?.[0]}
            placeholder="50667"
          />
          <Input
            label="Kapazität"
            name="capacity"
            type="number"
            min="1"
            defaultValue={defaultValues?.capacity?.toString() ?? ""}
            error={state.errors?.capacity?.[0]}
            placeholder="500"
          />
          <Input
            label="Bühnengröße (m²)"
            name="stageSizeM2"
            type="number"
            min="0"
            step="0.1"
            defaultValue={defaultValues?.stageSizeM2?.toString() ?? ""}
            error={state.errors?.stageSizeM2?.[0]}
            placeholder="50"
          />
          <Select
            label="Typ"
            name="type"
            defaultValue={defaultValues?.type ?? "SONSTIGE"}
            error={state.errors?.type?.[0]}
          >
            <option value="CLUB">Club</option>
            <option value="THEATER">Theater</option>
            <option value="FESTIVAL">Festival</option>
            <option value="OPEN_AIR">Open Air</option>
            <option value="SONSTIGE">Sonstige</option>
          </Select>
          <Input
            label="Genre-Tags (kommagetrennt)"
            name="genreTags"
            defaultValue={defaultValues?.genreTags?.join(", ") ?? ""}
            error={state.errors?.genreTags?.[0]}
            placeholder="Rock, Indie, Jazz"
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

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add src/modules/venues/components/VenueForm.tsx
git commit -m "feat: add VenueForm component"
```

---

## Task 6: Venue-Liste und Anlegen-Seite

**Files:**
- Create: `src/app/(dashboard)/venues/page.tsx`
- Create: `src/app/(dashboard)/venues/new/page.tsx`

- [x] **Step 1: Venue-Liste anlegen**

```typescript
// src/app/(dashboard)/venues/page.tsx
import Link from "next/link"
import { getVenues } from "@/modules/venues/actions/venue.actions"
import { VenueTable } from "@/modules/venues/components/VenueTable"

export const metadata = { title: "Venues – Booker App" }

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Venues</h2>
        <div className="flex gap-2">
          <Link
            href="/venues/import"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            CSV importieren
          </Link>
          <Link
            href="/venues/new"
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Venue anlegen
          </Link>
        </div>
      </div>
      <VenueTable venues={venues} />
    </div>
  )
}
```

- [x] **Step 2: Anlegen-Seite erstellen**

```typescript
// src/app/(dashboard)/venues/new/page.tsx
import { createVenue } from "@/modules/venues/actions/venue.actions"
import { VenueForm } from "@/modules/venues/components/VenueForm"

export const metadata = { title: "Venue anlegen – Booker App" }

export default function NewVenuePage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-slate-900">Venue anlegen</h2>
      <VenueForm action={createVenue} cancelHref="/venues" />
    </div>
  )
}
```

- [x] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/venues/
git commit -m "feat: add venue list and new pages"
```

---

## Task 7: Venue-Detailseite

**Files:**
- Create: `src/app/(dashboard)/venues/[id]/page.tsx`

- [x] **Step 1: Detailseite erstellen**

```typescript
// src/app/(dashboard)/venues/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { getVenueById } from "@/modules/venues/actions/venue.actions"
import { ContactList } from "@/modules/venues/components/ContactList"
import { Card, CardContent } from "@/components/ui/Card"
import { EmptyState } from "@/components/shared/EmptyState"
import { cn } from "@/lib/utils"

const VENUE_TYPE_LABELS: Record<string, string> = {
  CLUB: "Club",
  THEATER: "Theater",
  FESTIVAL: "Festival",
  OPEN_AIR: "Open Air",
  SONSTIGE: "Sonstige",
}

const TABS = [
  { label: "Übersicht", value: "uebersicht" },
  { label: "Ansprechpartner", value: "ansprechpartner" },
  { label: "Bookings", value: "bookings" },
] as const

type Tab = (typeof TABS)[number]["value"]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const venue = await getVenueById(id)
  return { title: venue ? `${venue.name} – Booker App` : "Venue – Booker App" }
}

export default async function VenueDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams

  const venue = await getVenueById(id)
  if (!venue) notFound()

  const activeTab: Tab =
    TABS.some((t) => t.value === tab) ? (tab as Tab) : "uebersicht"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/venues"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Venues
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{venue.name}</h2>
        </div>
        <Link
          href={`/venues/${id}/edit`}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-0">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={`/venues/${id}?tab=${t.value}`}
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

      {activeTab === "uebersicht" && (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col gap-3 py-5">
            <InfoRow label="Stadt" value={venue.city} />
            <InfoRow label="Straße" value={venue.street} />
            <InfoRow label="PLZ" value={venue.zip} />
            <InfoRow label="Typ" value={VENUE_TYPE_LABELS[venue.type] ?? venue.type} />
            <InfoRow
              label="Kapazität"
              value={venue.capacity ? venue.capacity.toLocaleString("de-DE") : null}
            />
            <InfoRow
              label="Bühne (m²)"
              value={venue.stageSizeM2 !== null ? String(venue.stageSizeM2) : null}
            />
            <InfoRow
              label="Genres"
              value={venue.genreTags.length > 0 ? venue.genreTags.join(", ") : null}
            />
          </CardContent>
        </Card>
      )}

      {activeTab === "ansprechpartner" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href={`/venues/${id}/contacts/new`}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Ansprechpartner hinzufügen
            </Link>
          </div>
          <ContactList contacts={venue.contacts} venueId={id} />
        </div>
      )}

      {activeTab === "bookings" && (
        <EmptyState
          title="Noch keine Bookings"
          description="Bookings werden in Phase 3 implementiert."
        />
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex gap-4">
      <span className="w-28 flex-shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      {value ? (
        <span className="text-sm text-slate-900">{value}</span>
      ) : (
        <span className="text-sm text-slate-400">—</span>
      )}
    </div>
  )
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler (ContactList ist noch nicht vorhanden — es kann einen Import-Fehler geben. Erst nach Task 9 wird das grün).

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/venues/[id]/page.tsx"
git commit -m "feat: add venue detail page with tabs"
```

---

## Task 8: Venue-Bearbeiten-Seite

**Files:**
- Create: `src/app/(dashboard)/venues/[id]/edit/page.tsx`

- [x] **Step 1: Bearbeiten-Seite erstellen**

```typescript
// src/app/(dashboard)/venues/[id]/edit/page.tsx
import { notFound } from "next/navigation"
import {
  getVenueById,
  updateVenue,
  deleteVenue,
} from "@/modules/venues/actions/venue.actions"
import { VenueForm } from "@/modules/venues/components/VenueForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Venue bearbeiten – Booker App" }

export default async function EditVenuePage({ params }: Props) {
  const { id } = await params
  const venue = await getVenueById(id)
  if (!venue) notFound()

  const updateVenueWithId = updateVenue.bind(null, id)
  const deleteVenueWithId = deleteVenue.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Venue bearbeiten</h2>
        <p className="mt-0.5 text-sm text-slate-500">{venue.name}</p>
      </div>

      <VenueForm
        action={updateVenueWithId}
        defaultValues={venue}
        cancelHref={`/venues/${id}`}
      />

      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">Venue löschen</h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht die Venue und alle zugehörigen Ansprechpartner dauerhaft.
        </p>
        <form action={deleteVenueWithId}>
          <Button type="submit" variant="danger" size="sm">
            Venue löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/venues/[id]/edit/page.tsx"
git commit -m "feat: add venue edit page with delete"
```

---

## Task 9: ContactList und ContactForm Komponenten

**Files:**
- Create: `src/modules/venues/components/ContactList.tsx`
- Create: `src/modules/venues/components/ContactForm.tsx`

- [x] **Step 1: ContactList erstellen**

```typescript
// src/modules/venues/components/ContactList.tsx
import Link from "next/link"
import { deleteContact } from "@/modules/venues/actions/contact.actions"
import { EmptyState } from "@/components/shared/EmptyState"
import { Button } from "@/components/ui/Button"
import type { ContactPerson } from "@prisma/client"

interface ContactListProps {
  contacts: ContactPerson[]
  venueId: string
}

export function ContactList({ contacts, venueId }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <EmptyState
        title="Noch keine Ansprechpartner"
        description="Füge einen Ansprechpartner für diese Venue hinzu."
      />
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {contacts.map((contact) => {
        const deleteContactAction = deleteContact.bind(null, contact.id, venueId)
        return (
          <div
            key={contact.id}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-slate-900">
                {contact.name}
              </span>
              {(contact.role || contact.email || contact.phone) && (
                <span className="text-xs text-slate-500">
                  {[contact.role, contact.email, contact.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/venues/${venueId}/contacts/${contact.id}/edit`}
                className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
              >
                Bearbeiten
              </Link>
              <form action={deleteContactAction}>
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

- [x] **Step 2: ContactForm erstellen**

```typescript
// src/modules/venues/components/ContactForm.tsx
"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"
import type { ContactFormState } from "@/modules/venues/actions/contact.actions"
import type { ContactPerson } from "@prisma/client"

interface ContactFormProps {
  action: (prevState: ContactFormState, formData: FormData) => Promise<ContactFormState>
  defaultValues?: Pick<ContactPerson, "name" | "email" | "phone" | "role">
  cancelHref: string
}

const initialState: ContactFormState = {}

export function ContactForm({ action, defaultValues, cancelHref }: ContactFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <Card className="max-w-lg">
      <CardContent className="pt-5">
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
            placeholder="Max Mustermann"
          />
          <Input
            label="Rolle"
            name="role"
            defaultValue={defaultValues?.role ?? ""}
            error={state.errors?.role?.[0]}
            placeholder="Booking, Technik, ..."
          />
          <Input
            label="E-Mail"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            error={state.errors?.email?.[0]}
            placeholder="max@venue.de"
          />
          <Input
            label="Telefon"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ""}
            error={state.errors?.phone?.[0]}
            placeholder="+49 123 456789"
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

- [x] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 4: Commit**

```bash
git add src/modules/venues/components/ContactList.tsx src/modules/venues/components/ContactForm.tsx
git commit -m "feat: add ContactList and ContactForm components"
```

---

## Task 10: Ansprechpartner-Seiten

**Files:**
- Create: `src/app/(dashboard)/venues/[id]/contacts/new/page.tsx`
- Create: `src/app/(dashboard)/venues/[id]/contacts/[contactId]/edit/page.tsx`

- [x] **Step 1: Neue Ansprechpartner-Seite erstellen**

```typescript
// src/app/(dashboard)/venues/[id]/contacts/new/page.tsx
import { createContact } from "@/modules/venues/actions/contact.actions"
import { ContactForm } from "@/modules/venues/components/ContactForm"

interface Props {
  params: Promise<{ id: string }>
}

export const metadata = { title: "Ansprechpartner hinzufügen – Booker App" }

export default async function NewContactPage({ params }: Props) {
  const { id } = await params
  const createContactWithId = createContact.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-slate-900">
        Ansprechpartner hinzufügen
      </h2>
      <ContactForm
        action={createContactWithId}
        cancelHref={`/venues/${id}?tab=ansprechpartner`}
      />
    </div>
  )
}
```

- [x] **Step 2: Bearbeiten-Seite für Ansprechpartner erstellen**

```typescript
// src/app/(dashboard)/venues/[id]/contacts/[contactId]/edit/page.tsx
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import {
  updateContact,
  deleteContact,
} from "@/modules/venues/actions/contact.actions"
import { ContactForm } from "@/modules/venues/components/ContactForm"
import { Button } from "@/components/ui/Button"

interface Props {
  params: Promise<{ id: string; contactId: string }>
}

export const metadata = { title: "Ansprechpartner bearbeiten – Booker App" }

export default async function EditContactPage({ params }: Props) {
  const { id, contactId } = await params
  const contact = await db.contactPerson.findUnique({
    where: { id: contactId, venueId: id },
  })
  if (!contact) notFound()

  const updateContactWithId = updateContact.bind(null, contactId, id)
  const deleteContactWithId = deleteContact.bind(null, contactId, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Ansprechpartner bearbeiten
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">{contact.name}</p>
      </div>

      <ContactForm
        action={updateContactWithId}
        defaultValues={contact}
        cancelHref={`/venues/${id}?tab=ansprechpartner`}
      />

      <div className="border border-red-200 rounded-lg p-4 max-w-lg">
        <h3 className="text-sm font-medium text-red-700 mb-1">
          Ansprechpartner löschen
        </h3>
        <p className="text-sm text-red-600 mb-3">
          Löscht diesen Ansprechpartner dauerhaft.
        </p>
        <form action={deleteContactWithId}>
          <Button type="submit" variant="danger" size="sm">
            Ansprechpartner löschen
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [x] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/venues/[id]/contacts/"
git commit -m "feat: add contact person create and edit pages"
```

---

## Task 11: CsvImport Komponente

**Files:**
- Create: `src/modules/venues/components/CsvImport.tsx`

- [x] **Step 1: Datei erstellen**

```typescript
// src/modules/venues/components/CsvImport.tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { VenueType } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { importVenues, type ImportRow } from "@/modules/venues/actions/venue.actions"

type ParsedRow = {
  name: string
  street: string
  type: VenueType
  valid: boolean
}

const CATEGORY_MAP: Record<string, VenueType> = {
  club: VenueType.CLUB,
  theater: VenueType.THEATER,
  festival: VenueType.FESTIVAL,
  "open air": VenueType.OPEN_AIR,
}

const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  CLUB: "Club",
  THEATER: "Theater",
  FESTIVAL: "Festival",
  OPEN_AIR: "Open Air",
  SONSTIGE: "Sonstige",
}

function mapCategory(raw: string): VenueType {
  return CATEGORY_MAP[raw.toLowerCase().trim()] ?? VenueType.SONSTIGE
}

function parseCsv(text: string, delimiter: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase())
  const nameIdx = headers.indexOf("name")
  const kategorieIdx = headers.indexOf("kategorie")
  const adresseIdx = headers.indexOf("adresse")

  if (nameIdx === -1) return []

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter)
    const name = (cells[nameIdx] ?? "").replace(/^"|"$/g, "").trim()
    return {
      name,
      street: (cells[adresseIdx] ?? "").replace(/^"|"$/g, "").trim(),
      type: mapCategory(cells[kategorieIdx] ?? ""),
      valid: name.length > 0,
    }
  })
}

export function CsvImport() {
  const router = useRouter()
  const [delimiter, setDelimiter] = useState<string>(";")
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCsv(text, delimiter)
      if (parsed.length === 0) {
        setParseError(
          "Keine Daten gefunden. Prüfe das Trennzeichen und ob die Spalte 'Name' vorhanden ist."
        )
        setRows(null)
      } else {
        setRows(parsed)
      }
    }
    reader.readAsText(file, "utf-8")
  }

  function handleImport() {
    if (!rows) return
    const validRows: ImportRow[] = rows
      .filter((r) => r.valid)
      .map((r) => ({ name: r.name, street: r.street || undefined, type: r.type }))

    startTransition(async () => {
      await importVenues(validRows)
      router.push("/venues")
      router.refresh()
    })
  }

  const validCount = rows?.filter((r) => r.valid).length ?? 0

  if (!rows) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Trennzeichen</span>
          <div className="flex gap-4">
            {[
              { label: "Semikolon (;)", value: ";" },
              { label: "Komma (,)", value: "," },
              { label: "Tab", value: "\t" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="delimiter"
                  value={opt.value}
                  checked={delimiter === opt.value}
                  onChange={() => setDelimiter(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center">
          <p className="text-sm text-slate-500 mb-4">
            Erwartete Spalten: <code className="text-xs bg-slate-100 px-1 rounded">Name, Bewertung, Anzahl_Bewertungen, Kategorie, Adresse, Preis, Status</code>
          </p>
          <label className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer">
            Datei auswählen
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {parseError && (
          <p className="text-sm text-red-600">{parseError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-medium">{rows.length}</span> Zeilen gelesen ·{" "}
          <span className="font-medium text-indigo-600">{validCount}</span> werden importiert ·{" "}
          <span className="font-medium text-red-500">{rows.length - validCount}</span> übersprungen
        </p>
        <button
          onClick={() => setRows(null)}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Neue Datei wählen
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Straße</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Typ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-slate-100 last:border-0 ${
                  !row.valid ? "bg-red-50" : ""
                }`}
              >
                <td className="px-4 py-2.5 text-slate-900">
                  {row.name || (
                    <span className="text-red-500 italic">kein Name — wird übersprungen</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{row.street || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {VENUE_TYPE_LABELS[row.type]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setRows(null)}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Abbrechen
        </button>
        <Button onClick={handleImport} loading={isPending} disabled={validCount === 0}>
          {validCount} Venues importieren
        </Button>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add src/modules/venues/components/CsvImport.tsx
git commit -m "feat: add CsvImport component with preview"
```

---

## Task 12: CSV-Import-Seite und Abschluss-Build

**Files:**
- Create: `src/app/(dashboard)/venues/import/page.tsx`

- [x] **Step 1: Import-Seite erstellen**

```typescript
// src/app/(dashboard)/venues/import/page.tsx
import { CsvImport } from "@/modules/venues/components/CsvImport"

export const metadata = { title: "Venues importieren – Booker App" }

export default function ImportVenuePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">CSV importieren</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Importiere Venues aus einer CSV-Datei. Die Stadt kann nach dem Import manuell ergänzt werden.
        </p>
      </div>
      <CsvImport />
    </div>
  )
}
```

- [x] **Step 2: Finaler Typecheck**

```bash
pnpm typecheck
```

Erwartete Ausgabe: keine Fehler.

- [x] **Step 3: Build**

```bash
pnpm build
```

Erwartete Ausgabe: Build erfolgreich, keine Fehler.

- [x] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/venues/import/page.tsx"
git commit -m "feat: add CSV import page"
```

- [x] **Step 5: Push**

```bash
git push
```
