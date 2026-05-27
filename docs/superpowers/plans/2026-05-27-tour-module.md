# Tour-Modul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Tour-Modul implementieren — Bookings zu benannten Touren gruppieren, chronologische Timeline, iCal-Export.

**Architecture:** Server Actions in `src/modules/tours/actions/tour.actions.ts`, Client Components in `src/modules/tours/components/`. Prisma-Schema bekommt die fehlende Artist-Relation auf `Tour`. Alle Seiten als RSC mit inline Server Actions für Formulare.

**Tech Stack:** Next.js App Router, Prisma, date-fns, Tailwind CSS, Zod

---

## Dateiübersicht

| Datei | Aktion |
|---|---|
| `prisma/schema.prisma` | Modify — `Tour` bekommt `artist Artist @relation(...)`, `Artist` bekommt `tours Tour[]` |
| `prisma/migrations/20260527000000_add_tour_artist_fk/migration.sql` | Create — FK + Index |
| `src/modules/tours/actions/tour.actions.ts` | Create — alle Server Actions |
| `src/modules/tours/components/TourCard.tsx` | Create — Karte für Listenansicht |
| `src/modules/tours/components/TourForm.tsx` | Create — Create/Edit-Formular |
| `src/modules/tours/components/TourTimeline.tsx` | Create — chronologische Booking-Timeline |
| `src/app/(dashboard)/tours/page.tsx` | Create — Tourenliste |
| `src/app/(dashboard)/tours/new/page.tsx` | Create — Neue Tour |
| `src/app/(dashboard)/tours/[id]/page.tsx` | Create — Tour-Detail |
| `src/app/(dashboard)/tours/[id]/edit/page.tsx` | Create — Tour bearbeiten |
| `src/app/(dashboard)/tours/[id]/ical/route.ts` | Create — iCal-Export |

---

### Task 1: Schema-Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260527000000_add_tour_artist_fk/migration.sql`

- [x] **Step 1: Artist-Relation in Tour-Model ergänzen und Artist-Model updaten**

In `prisma/schema.prisma` das `Artist`-Model um `tours Tour[]` erweitern:

```prisma
model Artist {
  id        String    @id @default(cuid())
  name      String
  email     String?
  phone     String?
  website   String?
  rating    Int?
  notes     Note[]
  projects  Project[]
  bookings  Booking[]
  tours     Tour[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([name])
}
```

Das `Tour`-Model um `artist`-Relation und Index erweitern:

```prisma
model Tour {
  id        String    @id @default(cuid())
  name      String
  artistId  String
  artist    Artist    @relation(fields: [artistId], references: [id])
  startDate DateTime
  endDate   DateTime
  bookings  Booking[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([artistId])
}
```

- [x] **Step 2: Migrationsdatei anlegen**

Verzeichnis und Datei anlegen:

```bash
mkdir -p "prisma/migrations/20260527000000_add_tour_artist_fk"
```

Inhalt `prisma/migrations/20260527000000_add_tour_artist_fk/migration.sql`:

```sql
-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_artistId_fkey"
  FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tour_artistId_idx" ON "Tour"("artistId");
```

- [x] **Step 3: Prisma Client generieren**

```bash
pnpm prisma generate
```

Expected: `✔ Generated Prisma Client` ohne Fehler.

- [x] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: keine Fehler.

- [x] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260527000000_add_tour_artist_fk/migration.sql
git commit -m "feat: add artist relation to Tour model"
```

---

### Task 2: tour.actions.ts

**Files:**
- Create: `src/modules/tours/actions/tour.actions.ts`

- [x] **Step 1: Datei anlegen**

```typescript
// src/modules/tours/actions/tour.actions.ts
"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import type { Tour, Artist, Booking, Venue, Project } from "@prisma/client"

// ─── Types ───────────────────────────────────────────────────────────────────

export type TourFormState = {
  errors?: {
    name?: string[]
    artistId?: string[]
    startDate?: string[]
    endDate?: string[]
  }
  message?: string
}

export type TourWithRelations = Tour & {
  artist: Artist
  bookings: (Booking & { venue: Venue; project: Project | null })[]
}

// ─── Validation ──────────────────────────────────────────────────────────────

const TourSchema = z
  .object({
    name: z.string().min(1, "Name ist erforderlich"),
    artistId: z.string().min(1, "Artist ist erforderlich"),
    startDate: z.string().min(1, "Startdatum ist erforderlich"),
    endDate: z.string().min(1, "Enddatum ist erforderlich"),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Enddatum muss nach Startdatum liegen",
    path: ["endDate"],
  })

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTours(): Promise<TourWithRelations[]> {
  return db.tour.findMany({
    include: {
      artist: true,
      bookings: { include: { venue: true, project: true }, orderBy: { date: "asc" } },
    },
    orderBy: { startDate: "asc" },
  })
}

export async function getTourById(id: string): Promise<TourWithRelations | null> {
  try {
    return await db.tour.findUnique({
      where: { id },
      include: {
        artist: true,
        bookings: {
          include: { venue: true, project: true },
          orderBy: { date: "asc" },
        },
      },
    })
  } catch (error) {
    console.error("[getTourById]", error)
    throw error
  }
}

export async function getAvailableBookingsForTour(
  artistId: string
): Promise<(Booking & { venue: Venue })[]> {
  return db.booking.findMany({
    where: { artistId, tourId: null },
    include: { venue: true },
    orderBy: { date: "asc" },
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createTour(
  prevState: TourFormState,
  formData: FormData
): Promise<TourFormState> {
  const result = TourSchema.safeParse({
    name: (formData.get("name") as string) ?? "",
    artistId: (formData.get("artistId") as string) ?? "",
    startDate: (formData.get("startDate") as string) ?? "",
    endDate: (formData.get("endDate") as string) ?? "",
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  let tourId: string
  try {
    const tour = await db.tour.create({
      data: {
        name: result.data.name,
        artistId: result.data.artistId,
        startDate: new Date(result.data.startDate),
        endDate: new Date(result.data.endDate),
      },
    })
    tourId = tour.id
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/tours/${tourId}`)
}

export async function updateTour(
  id: string,
  prevState: TourFormState,
  formData: FormData
): Promise<TourFormState> {
  const result = TourSchema.safeParse({
    name: (formData.get("name") as string) ?? "",
    artistId: (formData.get("artistId") as string) ?? "",
    startDate: (formData.get("startDate") as string) ?? "",
    endDate: (formData.get("endDate") as string) ?? "",
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  try {
    await db.tour.update({
      where: { id },
      data: {
        name: result.data.name,
        artistId: result.data.artistId,
        startDate: new Date(result.data.startDate),
        endDate: new Date(result.data.endDate),
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/tours/${id}`)
}

export async function deleteTour(id: string): Promise<void> {
  await db.tour.delete({ where: { id } })
  redirect("/tours")
}

export async function addBookingToTour(
  tourId: string,
  bookingId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.booking.update({ where: { id: bookingId }, data: { tourId } })
    revalidatePath(`/tours/${tourId}`)
    return { success: true }
  } catch (error) {
    console.error("[addBookingToTour]", error)
    return { success: false, message: "Booking konnte nicht hinzugefügt werden." }
  }
}

export async function removeBookingFromTour(
  tourId: string,
  bookingId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.booking.update({ where: { id: bookingId }, data: { tourId: null } })
    revalidatePath(`/tours/${tourId}`)
    return { success: true }
  } catch (error) {
    console.error("[removeBookingFromTour]", error)
    return { success: false, message: "Booking konnte nicht entfernt werden." }
  }
}
```

- [x] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: keine Fehler.

- [x] **Step 3: Commit**

```bash
git add src/modules/tours/actions/tour.actions.ts
git commit -m "feat: add tour server actions"
```

---

### Task 3: TourCard.tsx

**Files:**
- Create: `src/modules/tours/components/TourCard.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/modules/tours/components/TourCard.tsx
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import type { TourWithRelations } from "../actions/tour.actions"

interface Props {
  tour: TourWithRelations
}

export function TourCard({ tour }: Props) {
  const confirmed = tour.bookings.filter((b) => b.status === "BESTAETIGT").length

  return (
    <Link
      href={`/tours/${tour.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{tour.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{tour.artist.name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          {tour.bookings.length} Dates
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span>
          {format(new Date(tour.startDate), "d. MMM yyyy", { locale: de })}
          {" – "}
          {format(new Date(tour.endDate), "d. MMM yyyy", { locale: de })}
        </span>
        {confirmed > 0 && (
          <span className="text-green-600 font-medium">{confirmed} bestätigt</span>
        )}
      </div>
    </Link>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/modules/tours/components/TourCard.tsx
git commit -m "feat: add TourCard component"
```

---

### Task 4: TourForm.tsx

**Files:**
- Create: `src/modules/tours/components/TourForm.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/modules/tours/components/TourForm.tsx
"use client"

import { useActionState } from "react"
import type { TourFormState } from "../actions/tour.actions"
import type { Artist } from "@prisma/client"

interface Props {
  action: (prevState: TourFormState, formData: FormData) => Promise<TourFormState>
  artists: Artist[]
  defaultValues?: {
    name?: string
    artistId?: string
    startDate?: string
    endDate?: string
  }
  deleteAction?: () => Promise<void>
}

const inputCls =
  "h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

export function TourForm({ action, artists, defaultValues, deleteAction }: Props) {
  const [state, formAction, isPending] = useActionState(action, {})

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <form action={formAction} className="flex flex-col gap-6">
        {state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Name *
          </label>
          <input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            className={inputCls}
          />
          {state.errors?.name && (
            <p className="text-xs text-red-600">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="artistId" className="text-sm font-medium text-slate-700">
            Artist *
          </label>
          <select
            id="artistId"
            name="artistId"
            defaultValue={defaultValues?.artistId ?? ""}
            className={inputCls}
          >
            <option value="">Artist wählen…</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {state.errors?.artistId && (
            <p className="text-xs text-red-600">{state.errors.artistId[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-sm font-medium text-slate-700">
              Startdatum *
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              defaultValue={defaultValues?.startDate}
              className={inputCls}
            />
            {state.errors?.startDate && (
              <p className="text-xs text-red-600">{state.errors.startDate[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-sm font-medium text-slate-700">
              Enddatum *
            </label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              defaultValue={defaultValues?.endDate}
              className={inputCls}
            />
            {state.errors?.endDate && (
              <p className="text-xs text-red-600">{state.errors.endDate[0]}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="self-start h-9 px-4 rounded-md bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Speichern…" : "Speichern"}
        </button>
      </form>

      {deleteAction && (
        <div className="mt-4 rounded-md border border-red-200 p-4">
          <h3 className="text-sm font-medium text-red-700 mb-3">Gefahrenzone</h3>
          <form action={deleteAction}>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-red-600 text-sm text-white font-medium hover:bg-red-700 transition-colors"
            >
              Tour löschen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/modules/tours/components/TourForm.tsx
git commit -m "feat: add TourForm component"
```

---

### Task 5: TourTimeline.tsx

**Files:**
- Create: `src/modules/tours/components/TourTimeline.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/modules/tours/components/TourTimeline.tsx
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { BookingStatus } from "@prisma/client"
import type { Booking, Venue, Project } from "@prisma/client"

type BookingInTour = Booking & { venue: Venue; project: Project | null }

const STATUS_COLORS: Record<BookingStatus, string> = {
  ERSTKONTAKT: "border-slate-200 bg-slate-50 text-slate-700",
  IN_VERHANDLUNG: "border-amber-200 bg-amber-50 text-amber-700",
  BESTAETIGT: "border-green-200 bg-green-50 text-green-700",
  ABGESAGT: "border-red-200 bg-red-50 text-red-600 opacity-60",
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  ERSTKONTAKT: "Erstkontakt",
  IN_VERHANDLUNG: "In Verhandlung",
  BESTAETIGT: "Bestätigt",
  ABGESAGT: "Abgesagt",
}

interface Props {
  bookings: BookingInTour[]
  onRemoveForm: (booking: BookingInTour) => React.ReactNode
}

export function TourTimeline({ bookings, onRemoveForm }: Props) {
  if (bookings.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Noch keine Bookings in dieser Tour.
      </p>
    )
  }

  const byMonth = new Map<string, BookingInTour[]>()
  for (const booking of bookings) {
    const key = format(new Date(booking.date), "yyyy-MM")
    const list = byMonth.get(key) ?? []
    list.push(booking)
    byMonth.set(key, list)
  }

  return (
    <div className="flex flex-col gap-8">
      {Array.from(byMonth.entries()).map(([monthKey, monthBookings]) => (
        <div key={monthKey}>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {format(new Date(`${monthKey}-01`), "MMMM yyyy", { locale: de })}
          </h4>
          <div className="flex flex-col gap-2">
            {monthBookings.map((booking) => (
              <div
                key={booking.id}
                className={cn(
                  "flex items-center gap-4 rounded-md border p-3",
                  STATUS_COLORS[booking.status]
                )}
              >
                <div className="w-20 shrink-0 text-sm font-medium">
                  {format(new Date(booking.date), "EEE d. MMM", { locale: de })}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="text-sm font-medium hover:underline truncate block"
                  >
                    {booking.venue.name}
                    {booking.venue.city ? ` · ${booking.venue.city}` : ""}
                  </Link>
                  {booking.project && (
                    <p className="text-xs opacity-70">{booking.project.name}</p>
                  )}
                </div>
                <span className="text-xs font-medium shrink-0">
                  {STATUS_LABELS[booking.status]}
                </span>
                {onRemoveForm(booking)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/modules/tours/components/TourTimeline.tsx
git commit -m "feat: add TourTimeline component"
```

---

### Task 6: /tours Listenseite

**Files:**
- Create: `src/app/(dashboard)/tours/page.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/app/(dashboard)/tours/page.tsx
import Link from "next/link"
import { getTours } from "@/modules/tours/actions/tour.actions"
import { TourCard } from "@/modules/tours/components/TourCard"

export const metadata = { title: "Touren – Booker App" }

export default async function ToursPage() {
  const tours = await getTours()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Touren</h2>
        <Link
          href="/tours/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Tour anlegen
        </Link>
      </div>

      {tours.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <p className="text-sm">Noch keine Touren angelegt.</p>
          <Link href="/tours/new" className="mt-2 text-sm text-indigo-600 hover:underline">
            Erste Tour anlegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/app/\(dashboard\)/tours/page.tsx
git commit -m "feat: add /tours list page"
```

---

### Task 7: /tours/new Seite

**Files:**
- Create: `src/app/(dashboard)/tours/new/page.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/app/(dashboard)/tours/new/page.tsx
import Link from "next/link"
import { db } from "@/lib/db"
import { createTour } from "@/modules/tours/actions/tour.actions"
import { TourForm } from "@/modules/tours/components/TourForm"

export const metadata = { title: "Neue Tour – Booker App" }

export default async function NewTourPage() {
  const artists = await db.artist.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/tours" className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Touren
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Neue Tour</h2>
      </div>

      <TourForm action={createTour} artists={artists} />
    </div>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/app/\(dashboard\)/tours/new/page.tsx
git commit -m "feat: add /tours/new page"
```

---

### Task 8: /tours/[id] Detailseite

**Files:**
- Create: `src/app/(dashboard)/tours/[id]/page.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/app/(dashboard)/tours/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import {
  getTourById,
  getAvailableBookingsForTour,
  addBookingToTour,
  removeBookingFromTour,
} from "@/modules/tours/actions/tour.actions"
import { TourTimeline } from "@/modules/tours/components/TourTimeline"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const tour = await getTourById(id)
  return { title: tour ? `${tour.name} – Booker App` : "Tour – Booker App" }
}

export default async function TourDetailPage({ params }: Props) {
  const { id } = await params
  const tour = await getTourById(id)
  if (!tour) notFound()

  const availableBookings = await getAvailableBookingsForTour(tour.artistId)

  async function removeAction(formData: FormData) {
    "use server"
    const bookingId = formData.get("bookingId") as string
    await removeBookingFromTour(id, bookingId)
  }

  async function addAction(formData: FormData) {
    "use server"
    const bookingId = formData.get("bookingId") as string
    if (!bookingId) return
    await addBookingToTour(id, bookingId)
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/tours" className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
            ← Touren
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{tour.name}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {tour.artist.name} ·{" "}
            {format(new Date(tour.startDate), "d. MMM yyyy", { locale: de })}
            {" – "}
            {format(new Date(tour.endDate), "d. MMM yyyy", { locale: de })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/tours/${id}/ical`}
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            iCal exportieren
          </a>
          <Link
            href={`/tours/${id}/edit`}
            className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Bearbeiten
          </Link>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="text-base font-semibold text-slate-900 mb-4">
          Dates ({tour.bookings.length})
        </h3>
        <TourTimeline
          bookings={tour.bookings}
          onRemoveForm={(booking) => (
            <form action={removeAction}>
              <input type="hidden" name="bookingId" value={booking.id} />
              <button
                type="submit"
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                Entfernen
              </button>
            </form>
          )}
        />
      </div>

      {/* Booking hinzufügen */}
      {availableBookings.length > 0 && (
        <div className="rounded-md border border-slate-200 p-4 max-w-lg">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Booking hinzufügen</h3>
          <form action={addAction} className="flex gap-3">
            <select
              name="bookingId"
              className="flex-1 h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Booking wählen…</option>
              {availableBookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {format(new Date(b.date), "d. MMM yyyy", { locale: de })} – {b.venue.name}
                  {b.venue.city ? ` (${b.venue.city})` : ""}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              Hinzufügen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/app/\(dashboard\)/tours/\[id\]/page.tsx
git commit -m "feat: add /tours/[id] detail page"
```

---

### Task 9: /tours/[id]/edit Seite

**Files:**
- Create: `src/app/(dashboard)/tours/[id]/edit/page.tsx`

- [x] **Step 1: Datei anlegen**

```tsx
// src/app/(dashboard)/tours/[id]/edit/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import {
  getTourById,
  updateTour,
  deleteTour,
} from "@/modules/tours/actions/tour.actions"
import { TourForm } from "@/modules/tours/components/TourForm"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const tour = await getTourById(id)
  return { title: tour ? `${tour.name} bearbeiten – Booker App` : "Tour bearbeiten – Booker App" }
}

export default async function EditTourPage({ params }: Props) {
  const { id } = await params
  const [tour, artists] = await Promise.all([
    getTourById(id),
    db.artist.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!tour) notFound()

  const boundUpdate = updateTour.bind(null, id)
  const boundDelete = deleteTour.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/tours/${id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Tour
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Tour bearbeiten</h2>
      </div>

      <TourForm
        action={boundUpdate}
        artists={artists}
        defaultValues={{
          name: tour.name,
          artistId: tour.artistId,
          startDate: format(new Date(tour.startDate), "yyyy-MM-dd"),
          endDate: format(new Date(tour.endDate), "yyyy-MM-dd"),
        }}
        deleteAction={boundDelete}
      />
    </div>
  )
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/app/\(dashboard\)/tours/\[id\]/edit/page.tsx
git commit -m "feat: add /tours/[id]/edit page"
```

---

### Task 10: iCal-Export Route

**Files:**
- Create: `src/app/(dashboard)/tours/[id]/ical/route.ts`

- [x] **Step 1: Datei anlegen**

```typescript
// src/app/(dashboard)/tours/[id]/ical/route.ts
import { NextResponse } from "next/server"
import { format } from "date-fns"
import { getTourById } from "@/modules/tours/actions/tour.actions"

function toICalDate(date: Date): string {
  return format(date, "yyyyMMdd")
}

function escapeICalText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tour = await getTourById(id)
  if (!tour) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const events = tour.bookings.map((booking) => {
    const dateStr = toICalDate(new Date(booking.date))
    const summary = escapeICalText(`${tour.artist.name} @ ${booking.venue.name}`)
    const description = escapeICalText(booking.status)
    return [
      "BEGIN:VEVENT",
      `UID:${booking.id}@booker-app`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    ].join("\r\n")
  })

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booker App//Tour Export//DE",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeICalText(tour.name)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n")

  const filename = `${tour.name.replace(/[^a-z0-9]/gi, "_")}.ics`

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
```

- [x] **Step 2: Typecheck + Commit**

```bash
pnpm typecheck
git add src/app/\(dashboard\)/tours/\[id\]/ical/route.ts
git commit -m "feat: add iCal export route for tours"
```

---

### Task 11: Build-Verifikation + Supabase-Migration

**Files:** keine neuen Dateien

- [x] **Step 1: Build prüfen**

```bash
pnpm build
```

Expected: ✓ Compiled successfully, keine Fehler.

- [x] **Step 2: Supabase SQL anwenden**

Im Supabase SQL-Editor ausführen:

```sql
-- Tour.artistId FK + Index (Migration 20260527000000)
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_artistId_fkey"
  FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Tour_artistId_idx" ON "Tour"("artistId");
```

- [x] **Step 3: Push und Vercel-Deploy**

```bash
git push
```

- [x] **Step 4: Manuelle Verifikation auf Vercel**

1. `/tours` → leere Liste mit "Tour anlegen"-Button
2. Neue Tour anlegen → Artist wählen, Datum, Name → Redirect zur Detailseite
3. Booking zur Tour hinzufügen → Timeline zeigt Booking
4. iCal-Export → `.ics`-Datei wird heruntergeladen
5. Tour bearbeiten + löschen funktioniert
