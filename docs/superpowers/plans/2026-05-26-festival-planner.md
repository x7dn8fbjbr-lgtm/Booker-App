# Festival-Planer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visueller Bühnenplaner für Events mit mehreren Stages, DnD-Zuweisung von Artists, automatischer Booking-Erstellung und Konflikt-Erkennung.

**Architecture:** Server Components für Datenabruf, Server Actions für Mutationen, Client Components für FestivalPlanner (DnD) und EventForm. @dnd-kit/core ist bereits installiert — `useDraggable` für Sidebar-Artists, `useDroppable` pro Grid-Zelle.

**Tech Stack:** Next.js 16 App Router, TypeScript Strict, Prisma 6, @dnd-kit/core, Tailwind CSS, Zod v4, date-fns

---

## Dateiübersicht

| Datei | Aktion |
|---|---|
| `prisma/schema.prisma` | Modify: Event, Stage, Slot, Booking, Venue |
| `src/modules/events/actions/event.actions.ts` | Create |
| `src/modules/events/actions/slot.actions.ts` | Create |
| `src/modules/events/components/EventForm.tsx` | Create |
| `src/modules/events/components/ArtistSidebar.tsx` | Create |
| `src/modules/events/components/SlotCard.tsx` | Create |
| `src/modules/events/components/StageGrid.tsx` | Create |
| `src/modules/events/components/FestivalPlanner.tsx` | Create |
| `src/app/(dashboard)/events/page.tsx` | Create |
| `src/app/(dashboard)/events/new/page.tsx` | Create |
| `src/app/(dashboard)/events/[id]/page.tsx` | Create |
| `src/app/(dashboard)/events/[id]/edit/page.tsx` | Create |

**Sidebar-Navigation:** Bereits vorhanden (`src/components/layout/Sidebar.tsx` hat "Events"-Link). Keine Änderung nötig.

---

### Task 1: Schema-Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Schema aktualisieren**

Ersetze die Modelle `Event`, `Stage`, `Slot` und ergänze Rückrelationen in `Booking` und `Venue`:

```prisma
// In schema.prisma — Abschnitt "Tours & Events" ersetzen:

model Tour {
  id        String    @id @default(cuid())
  name      String
  artistId  String
  startDate DateTime
  endDate   DateTime
  bookings  Booking[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Event {
  id           String   @id @default(cuid())
  name         String
  date         DateTime
  venueId      String
  venue        Venue    @relation(fields: [venueId], references: [id])
  gridInterval Int      @default(30)
  startTime    String   @default("14:00")
  endTime      String   @default("22:00")
  stages       Stage[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([venueId])
  @@index([date])
}

model Stage {
  id      String @id @default(cuid())
  eventId String
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name    String
  color   String @default("#6366f1")
  order   Int    @default(0)
  slots   Slot[]

  @@index([eventId])
}

model Slot {
  id        String   @id @default(cuid())
  stageId   String
  stage     Stage    @relation(fields: [stageId], references: [id], onDelete: Cascade)
  startTime DateTime
  endTime   DateTime
  bookingId String?
  booking   Booking? @relation(fields: [bookingId], references: [id])

  @@index([stageId])
  @@index([bookingId])
}
```

In `model Booking` die Rückrelation ergänzen — füge nach `documents Document[]` ein:
```prisma
  slots         Slot[]
```

In `model Venue` die Rückrelation ergänzen — füge nach `bookings Booking[]` ein:
```prisma
  events        Event[]
```

- [ ] **Step 2: Migration ausführen**

```bash
cd "/Users/detlefhoefer/Developer/Booker App"
pnpm prisma migrate dev --name add_festival_planner
```

Expected: Migration erfolgreich, Prisma Client neu generiert.

- [ ] **Step 3: Supabase-SQL ausführen**

Im Supabase-Dashboard (SQL-Editor) ausführen:

```sql
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "gridInterval" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "startTime" TEXT NOT NULL DEFAULT '14:00';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "endTime" TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE "Stage" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Slot" ADD COLUMN IF NOT EXISTS "bookingId" TEXT REFERENCES "Booking"("id");
ALTER TABLE "Slot" DROP COLUMN IF EXISTS "artistId";
ALTER TABLE "Slot" DROP COLUMN IF EXISTS "projectId";
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: Keine Fehler.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add festival planner schema (Event, Stage, Slot with Booking relation)"
```

---

### Task 2: event.actions.ts

**Files:**
- Create: `src/modules/events/actions/event.actions.ts`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/actions/event.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"
import type { Event, Venue, Stage, Booking, Artist, Project, Slot } from "@prisma/client"

// ─── Types ───────────────────────────────────────────────────────────────────

export type SlotWithBooking = Slot & {
  booking: (Booking & { artist: Artist; project: Project | null }) | null
}

export type StageWithSlots = Stage & { slots: SlotWithBooking[] }

export type EventWithRelations = Event & {
  venue: Venue
  stages: StageWithSlots[]
}

export type EventFormState = {
  errors?: {
    name?: string[]
    venueId?: string[]
    date?: string[]
    gridInterval?: string[]
    endTime?: string[]
    stages?: string[]
  }
  message?: string
}

// ─── Validation ──────────────────────────────────────────────────────────────

const EventSchema = z
  .object({
    name: z.string().min(1, "Name ist erforderlich"),
    venueId: z.string().min(1, "Venue ist erforderlich"),
    date: z.string().min(1, "Datum ist erforderlich"),
    gridInterval: z.coerce
      .number()
      .refine((v) => [15, 30, 60].includes(v), { message: "Intervall muss 15, 30 oder 60 sein" }),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "Endzeit muss nach Startzeit liegen",
    path: ["endTime"],
  })

const StageInputSchema = z
  .array(
    z.object({
      name: z.string().min(1),
      color: z.string().default("#6366f1"),
      order: z.coerce.number().default(0),
    })
  )
  .min(1, "Mindestens eine Bühne erforderlich")

const SLOT_INCLUDE = {
  booking: { include: { artist: true, project: true } },
} as const

const EVENT_INCLUDE = {
  venue: true,
  stages: {
    include: { slots: { include: SLOT_INCLUDE } },
    orderBy: { order: "asc" as const },
  },
} as const

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getEvents(): Promise<EventWithRelations[]> {
  return db.event.findMany({
    include: EVENT_INCLUDE,
    orderBy: { date: "asc" },
  })
}

export async function getEventById(id: string): Promise<EventWithRelations | null> {
  return db.event.findUnique({ where: { id }, include: EVENT_INCLUDE })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createEvent(
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const result = EventSchema.safeParse({
    name: formData.get("name"),
    venueId: formData.get("venueId"),
    date: formData.get("date"),
    gridInterval: formData.get("gridInterval"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  let parsedStages: z.infer<typeof StageInputSchema>
  try {
    parsedStages = StageInputSchema.parse(JSON.parse(formData.get("stagesJson") as string))
  } catch {
    return { errors: { stages: ["Ungültige Bühnendaten"] } }
  }

  let eventId: string
  try {
    const event = await db.event.create({
      data: {
        name: result.data.name,
        venueId: result.data.venueId,
        date: new Date(result.data.date),
        gridInterval: result.data.gridInterval,
        startTime: result.data.startTime,
        endTime: result.data.endTime,
        stages: {
          create: parsedStages.map((s) => ({ name: s.name, color: s.color, order: s.order })),
        },
      },
    })
    eventId = event.id
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/events/${eventId}`)
}

export async function updateEvent(
  id: string,
  prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const result = EventSchema.safeParse({
    name: formData.get("name"),
    venueId: formData.get("venueId"),
    date: formData.get("date"),
    gridInterval: formData.get("gridInterval"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  })
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  try {
    await db.event.update({
      where: { id },
      data: {
        name: result.data.name,
        venueId: result.data.venueId,
        date: new Date(result.data.date),
        gridInterval: result.data.gridInterval,
        startTime: result.data.startTime,
        endTime: result.data.endTime,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/events/${id}`)
}

export async function deleteEvent(id: string): Promise<void> {
  await db.event.delete({ where: { id } })
  redirect("/events")
}

export async function createStage(
  eventId: string,
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string }> {
  const name = (formData.get("name") as string)?.trim()
  if (!name) return { error: "Name ist erforderlich" }
  const color = (formData.get("color") as string) || "#6366f1"
  const order = parseInt((formData.get("order") as string) || "0", 10)
  try {
    await db.stage.create({ data: { eventId, name, color, order } })
  } catch {
    return { error: "Speichern fehlgeschlagen" }
  }
  redirect(`/events/${eventId}/edit`)
}

export async function deleteStage(stageId: string, eventId: string): Promise<void> {
  await db.stage.delete({ where: { id: stageId } })
  redirect(`/events/${eventId}/edit`)
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: Keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/actions/event.actions.ts
git commit -m "feat: add event server actions (CRUD + stage management)"
```

---

### Task 3: slot.actions.ts

**Files:**
- Create: `src/modules/events/actions/slot.actions.ts`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/actions/slot.actions.ts
"use server"

import { db } from "@/lib/db"
import { BookingStatus } from "@prisma/client"
import type { SlotWithBooking } from "./event.actions"

export async function createSlot(params: {
  eventId: string
  stageId: string
  artistId: string
  startTimeISO: string
  endTimeISO: string
}): Promise<{ success: boolean; slot?: SlotWithBooking; message?: string }> {
  const { eventId, stageId, artistId, startTimeISO, endTimeISO } = params

  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { venueId: true, date: true },
    })
    if (!event) return { success: false, message: "Event nicht gefunden" }

    const eventDate = new Date(event.date)
    const dayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    let booking = await db.booking.findFirst({
      where: {
        artistId,
        venueId: event.venueId,
        date: { gte: dayStart, lt: dayEnd },
      },
    })

    if (!booking) {
      booking = await db.booking.create({
        data: {
          artistId,
          venueId: event.venueId,
          date: event.date,
          status: BookingStatus.ERSTKONTAKT,
        },
      })
    }

    const slot = await db.slot.create({
      data: {
        stageId,
        startTime: new Date(startTimeISO),
        endTime: new Date(endTimeISO),
        bookingId: booking.id,
      },
      include: {
        booking: { include: { artist: true, project: true } },
      },
    })

    return { success: true, slot }
  } catch {
    return { success: false, message: "Slot konnte nicht gespeichert werden." }
  }
}

export async function updateSlotTimes(
  slotId: string,
  startTimeISO: string,
  endTimeISO: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.slot.update({
      where: { id: slotId },
      data: { startTime: new Date(startTimeISO), endTime: new Date(endTimeISO) },
    })
    return { success: true }
  } catch {
    return { success: false, message: "Zeitänderung fehlgeschlagen." }
  }
}

export async function deleteSlot(
  slotId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.slot.delete({ where: { id: slotId } })
    return { success: true }
  } catch {
    return { success: false, message: "Löschen fehlgeschlagen." }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: Keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/actions/slot.actions.ts
git commit -m "feat: add slot server actions (create, update times, delete)"
```

---

### Task 4: EventForm.tsx

**Files:**
- Create: `src/modules/events/components/EventForm.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/components/EventForm.tsx
"use client"

import { useActionState, useState } from "react"
import type { EventFormState } from "../actions/event.actions"
import type { Venue } from "@prisma/client"

interface StageInput {
  name: string
  color: string
  order: number
}

interface Props {
  action: (prevState: EventFormState, formData: FormData) => Promise<EventFormState>
  venues: Venue[]
  defaultValues?: {
    name?: string
    venueId?: string
    date?: string
    gridInterval?: number
    startTime?: string
    endTime?: string
  }
  showStages?: boolean
  deleteAction?: () => Promise<void>
}

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 Minuten" },
  { value: 30, label: "30 Minuten" },
  { value: 60, label: "60 Minuten" },
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`)

export function EventForm({ action, venues, defaultValues, showStages = true, deleteAction }: Props) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [stages, setStages] = useState<StageInput[]>(
    showStages ? [{ name: "", color: "#6366f1", order: 0 }] : []
  )

  function addStage() {
    setStages((prev) => [...prev, { name: "", color: "#6366f1", order: prev.length }])
  }

  function removeStage(i: number) {
    setStages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateStage(i: number, field: keyof StageInput, value: string | number) {
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  const inputCls =
    "h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <form action={formAction} className="flex flex-col gap-6">
        {showStages && (
          <input type="hidden" name="stagesJson" value={JSON.stringify(stages)} />
        )}

        {state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Name *</label>
          <input name="name" defaultValue={defaultValues?.name} className={inputCls} />
          {state.errors?.name && (
            <p className="text-xs text-red-600">{state.errors.name[0]}</p>
          )}
        </div>

        {/* Venue */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Venue *</label>
          <select name="venueId" defaultValue={defaultValues?.venueId ?? ""} className={inputCls}>
            <option value="">Venue wählen…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.city ? ` (${v.city})` : ""}
              </option>
            ))}
          </select>
          {state.errors?.venueId && (
            <p className="text-xs text-red-600">{state.errors.venueId[0]}</p>
          )}
        </div>

        {/* Datum */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Datum *</label>
          <input
            type="date"
            name="date"
            defaultValue={defaultValues?.date}
            className={inputCls}
          />
          {state.errors?.date && (
            <p className="text-xs text-red-600">{state.errors.date[0]}</p>
          )}
        </div>

        {/* Raster-Einstellungen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Raster</label>
            <select
              name="gridInterval"
              defaultValue={defaultValues?.gridInterval ?? 30}
              className={inputCls}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Startzeit</label>
            <select
              name="startTime"
              defaultValue={defaultValues?.startTime ?? "14:00"}
              className={inputCls}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Endzeit</label>
            <select
              name="endTime"
              defaultValue={defaultValues?.endTime ?? "22:00"}
              className={inputCls}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {state.errors?.endTime && (
              <p className="text-xs text-red-600">{state.errors.endTime[0]}</p>
            )}
          </div>
        </div>

        {/* Stages */}
        {showStages && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Bühnen *</label>
              <button
                type="button"
                onClick={addStage}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                + Bühne hinzufügen
              </button>
            </div>
            {state.errors?.stages && (
              <p className="text-xs text-red-600">{state.errors.stages[0]}</p>
            )}
            {stages.map((stage, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md border border-slate-200 p-3"
              >
                <input
                  placeholder="Name der Bühne"
                  value={stage.name}
                  onChange={(e) => updateStage(i, "name", e.target.value)}
                  className="flex-1 h-8 rounded border border-slate-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => updateStage(i, "color", e.target.value)}
                  className="h-8 w-10 rounded border border-slate-300 cursor-pointer"
                  title="Farbe"
                />
                <input
                  type="number"
                  placeholder="0"
                  value={stage.order}
                  onChange={(e) => updateStage(i, "order", parseInt(e.target.value, 10) || 0)}
                  className="w-16 h-8 rounded border border-slate-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  title="Reihenfolge"
                />
                {stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    className="text-red-500 hover:text-red-700 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

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
              Event löschen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: Keine Fehler.

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/components/EventForm.tsx
git commit -m "feat: add EventForm component with dynamic stage management"
```

---

### Task 5: ArtistSidebar.tsx

**Files:**
- Create: `src/modules/events/components/ArtistSidebar.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/components/ArtistSidebar.tsx
"use client"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { Artist } from "@prisma/client"

interface Props {
  artists: Artist[]
  assignedArtistIds: Set<string>
}

export function ArtistSidebar({ artists, assignedArtistIds }: Props) {
  const [search, setSearch] = useState("")

  const filtered = artists.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3 w-52 shrink-0 print:hidden">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Artists</p>
      <input
        type="text"
        placeholder="Suchen…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[calc(100vh-240px)]">
        {filtered.map((artist) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            disabled={assignedArtistIds.has(artist.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Keine Artists gefunden</p>
        )}
      </div>
    </div>
  )
}

function ArtistCard({ artist, disabled }: { artist: Artist; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `artist::${artist.id}`,
    data: { artistId: artist.id },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...(disabled ? {} : listeners)}
      className={cn(
        "rounded-md border p-2 text-sm select-none transition-colors",
        disabled
          ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
          : "border-slate-200 bg-white text-slate-900 shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300"
      )}
    >
      <p className="font-medium truncate">{artist.name}</p>
      {disabled && <p className="text-xs text-slate-400 mt-0.5">Bereits geplant</p>}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/components/ArtistSidebar.tsx
git commit -m "feat: add ArtistSidebar with draggable artist cards"
```

---

### Task 6: SlotCard.tsx

**Files:**
- Create: `src/modules/events/components/SlotCard.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/components/SlotCard.tsx
"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { updateSlotTimes, deleteSlot } from "../actions/slot.actions"
import type { SlotWithBooking } from "../actions/event.actions"

interface Props {
  slot: SlotWithBooking
  stageColor: string
  timeSlots: string[]
  isConflict: boolean
  eventDate: Date
  onDelete: (slotId: string) => void
  onUpdate: (slotId: string, startISO: string, endISO: string) => void
}

function buildISO(timeStr: string, eventDate: Date): string {
  const [h, m] = timeStr.split(":").map(Number)
  const d = new Date(eventDate)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function SlotCard({ slot, stageColor, timeSlots, isConflict, eventDate, onDelete, onUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [startTime, setStartTime] = useState(format(new Date(slot.startTime), "HH:mm"))
  const [endTime, setEndTime] = useState(format(new Date(slot.endTime), "HH:mm"))
  const [, startTransition] = useTransition()

  const artistName = slot.booking?.artist.name ?? "Unbekannt"

  function handleSave() {
    const startISO = buildISO(startTime, new Date(eventDate))
    const endISO = buildISO(endTime, new Date(eventDate))
    onUpdate(slot.id, startISO, endISO)
    startTransition(async () => {
      await updateSlotTimes(slot.id, startISO, endISO)
    })
    setOpen(false)
  }

  function handleDelete() {
    onDelete(slot.id)
    startTransition(async () => {
      await deleteSlot(slot.id)
    })
  }

  return (
    <div className="relative h-full">
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          "h-full min-h-[36px] rounded p-1.5 cursor-pointer text-xs text-white overflow-hidden select-none",
          isConflict && "ring-2 ring-red-500"
        )}
        style={{ backgroundColor: stageColor }}
      >
        <p className="font-medium truncate leading-tight">{artistName}</p>
        <p className="opacity-80 text-[10px]">
          {format(new Date(slot.startTime), "HH:mm")}–{format(new Date(slot.endTime), "HH:mm")}
        </p>
        {isConflict && (
          <span className="absolute top-0.5 right-1 text-xs" title="Zeitkonflikt">⚠</span>
        )}
      </div>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Popover */}
          <div className="absolute top-full left-0 z-20 w-52 rounded-md border border-slate-200 bg-white shadow-lg p-3 flex flex-col gap-2.5 mt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Von</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-7 rounded border border-slate-300 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Bis</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-7 rounded border border-slate-300 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 h-7 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                Speichern
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-7 rounded border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
              >
                Entfernen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/components/SlotCard.tsx
git commit -m "feat: add SlotCard with inline time-edit popover"
```

---

### Task 7: StageGrid.tsx

**Files:**
- Create: `src/modules/events/components/StageGrid.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/components/StageGrid.tsx
"use client"

import { useDroppable } from "@dnd-kit/core"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { SlotCard } from "./SlotCard"
import type { EventWithRelations, SlotWithBooking } from "../actions/event.actions"

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateTimeSlots(startTime: string, endTime: string, intervalMin: number): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  let current = startH * 60 + startM
  const end = endH * 60 + endM
  while (current < end) {
    slots.push(
      `${Math.floor(current / 60).toString().padStart(2, "0")}:${(current % 60).toString().padStart(2, "0")}`
    )
    current += intervalMin
  }
  return slots
}

export function findConflictIds(slots: SlotWithBooking[]): Set<string> {
  const conflictIds = new Set<string>()
  const byArtist = new Map<string, SlotWithBooking[]>()

  for (const slot of slots) {
    const artistId = slot.booking?.artistId
    if (!artistId) continue
    const list = byArtist.get(artistId) ?? []
    list.push(slot)
    byArtist.set(artistId, list)
  }

  for (const list of byArtist.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        if (
          new Date(a.startTime) < new Date(b.endTime) &&
          new Date(b.startTime) < new Date(a.endTime)
        ) {
          conflictIds.add(a.id)
          conflictIds.add(b.id)
        }
      }
    }
  }

  return conflictIds
}

function getSpanCount(slot: SlotWithBooking, intervalMin: number): number {
  const ms = new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()
  return Math.max(1, Math.round(ms / (intervalMin * 60 * 1000)))
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  event: EventWithRelations
  slots: SlotWithBooking[]
  onDeleteSlot: (slotId: string) => void
  onUpdateSlot: (slotId: string, startISO: string, endISO: string) => void
}

export function StageGrid({ event, slots, onDeleteSlot, onUpdateSlot }: Props) {
  const timeSlots = generateTimeSlots(event.startTime, event.endTime, event.gridInterval)
  const conflictIds = findConflictIds(slots)

  // Build set of cells covered by multi-row slots (should be skipped when rendering)
  const coveredCells = new Set<string>()
  for (const slot of slots) {
    const startStr = format(new Date(slot.startTime), "HH:mm")
    const startIdx = timeSlots.indexOf(startStr)
    const span = getSpanCount(slot, event.gridInterval)
    for (let i = 1; i < span; i++) {
      if (startIdx + i < timeSlots.length) {
        coveredCells.add(`${slot.stageId}::${timeSlots[startIdx + i]}`)
      }
    }
  }

  // Map of cellId → slot for fast lookup
  const slotByCell = new Map<string, SlotWithBooking>()
  for (const slot of slots) {
    const startStr = format(new Date(slot.startTime), "HH:mm")
    slotByCell.set(`${slot.stageId}::${startStr}`, slot)
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table
        className="border-collapse"
        style={{ minWidth: `${event.stages.length * 160 + 64}px` }}
      >
        <thead>
          <tr>
            <th className="w-16 p-2" />
            {event.stages.map((stage) => (
              <th
                key={stage.id}
                className="px-3 py-2 text-sm font-semibold text-white text-center"
                style={{ backgroundColor: stage.color, minWidth: "160px" }}
              >
                {stage.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot) => (
            <tr key={timeSlot}>
              <td className="w-16 pr-2 text-right text-xs text-slate-400 whitespace-nowrap align-top pt-1.5 border-t border-slate-100">
                {timeSlot}
              </td>
              {event.stages.map((stage) => {
                const cellId = `${stage.id}::${timeSlot}`
                if (coveredCells.has(cellId)) return null

                const slot = slotByCell.get(cellId)
                const span = slot ? getSpanCount(slot, event.gridInterval) : 1

                return (
                  <GridCell
                    key={cellId}
                    cellId={cellId}
                    slot={slot}
                    stageColor={stage.color}
                    rowSpan={span}
                    timeSlots={timeSlots}
                    isConflict={slot ? conflictIds.has(slot.id) : false}
                    eventDate={new Date(event.date)}
                    onDeleteSlot={onDeleteSlot}
                    onUpdateSlot={onUpdateSlot}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Grid Cell ────────────────────────────────────────────────────────────────

interface CellProps {
  cellId: string
  slot?: SlotWithBooking
  stageColor: string
  rowSpan: number
  timeSlots: string[]
  isConflict: boolean
  eventDate: Date
  onDeleteSlot: (slotId: string) => void
  onUpdateSlot: (slotId: string, startISO: string, endISO: string) => void
}

function GridCell({
  cellId,
  slot,
  stageColor,
  rowSpan,
  timeSlots,
  isConflict,
  eventDate,
  onDeleteSlot,
  onUpdateSlot,
}: CellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { occupied: !!slot },
  })

  return (
    <td
      ref={setNodeRef}
      rowSpan={rowSpan}
      className={cn(
        "border border-slate-100 p-1 align-top",
        "transition-colors",
        isOver && !slot && "bg-indigo-50 ring-1 ring-inset ring-indigo-400",
        isOver && slot && "bg-red-50",
        !isOver && "bg-white"
      )}
      style={{ height: `${rowSpan * 40}px`, minWidth: "160px", verticalAlign: "top" }}
    >
      {slot ? (
        <SlotCard
          slot={slot}
          stageColor={stageColor}
          timeSlots={timeSlots}
          isConflict={isConflict}
          eventDate={eventDate}
          onDelete={onDeleteSlot}
          onUpdate={onUpdateSlot}
        />
      ) : (
        isOver && (
          <div className="flex items-center justify-center h-full text-indigo-400 text-xl pointer-events-none">
            +
          </div>
        )
      )}
    </td>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/components/StageGrid.tsx
git commit -m "feat: add StageGrid with time slots, drop zones, rowspan and conflict detection"
```

---

### Task 8: FestivalPlanner.tsx

**Files:**
- Create: `src/modules/events/components/FestivalPlanner.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/modules/events/components/FestivalPlanner.tsx
"use client"

import { useState, useTransition } from "react"
import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { createSlot } from "../actions/slot.actions"
import { ArtistSidebar } from "./ArtistSidebar"
import { StageGrid } from "./StageGrid"
import type { EventWithRelations, SlotWithBooking } from "../actions/event.actions"
import type { Artist } from "@prisma/client"

interface Props {
  event: EventWithRelations
  artists: Artist[]
  initialSlots: SlotWithBooking[]
}

export function FestivalPlanner({ event, artists, initialSlots }: Props) {
  const [slots, setSlots] = useState<SlotWithBooking[]>(initialSlots)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const assignedArtistIds = new Set<string>(
    slots
      .map((s) => s.booking?.artistId)
      .filter((id): id is string => !!id)
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return

    const artistId = active.data.current?.artistId as string | undefined
    if (!artistId) return

    // Prevent drop on occupied cell or already-assigned artist
    if (over.data.current?.occupied) return
    if (assignedArtistIds.has(artistId)) return

    const cellId = over.id as string
    const separatorIdx = cellId.indexOf("::")
    if (separatorIdx === -1) return
    const stageId = cellId.slice(0, separatorIdx)
    const timeSlot = cellId.slice(separatorIdx + 2)

    const [h, m] = timeSlot.split(":").map(Number)
    const startDate = new Date(event.date)
    startDate.setHours(h, m, 0, 0)
    const endDate = new Date(startDate.getTime() + event.gridInterval * 60 * 1000)

    // Optimistic slot
    const tempId = `temp-${Date.now()}`
    const artist = artists.find((a) => a.id === artistId)
    if (!artist) return

    const tempSlot = {
      id: tempId,
      stageId,
      startTime: startDate,
      endTime: endDate,
      bookingId: null,
      booking: {
        id: "temp",
        artistId,
        projectId: null,
        venueId: event.venueId,
        date: new Date(event.date),
        status: "ERSTKONTAKT" as const,
        contactPerson: null,
        tourId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist,
        project: null,
      },
    } as SlotWithBooking

    const snapshot = slots
    setSlots((prev) => [...prev, tempSlot])
    setError(null)

    startTransition(async () => {
      const result = await createSlot({
        eventId: event.id,
        stageId,
        artistId,
        startTimeISO: startDate.toISOString(),
        endTimeISO: endDate.toISOString(),
      })

      if (!result.success || !result.slot) {
        setSlots(snapshot)
        setError(result.message ?? "Slot konnte nicht gespeichert werden.")
      } else {
        setSlots((prev) => prev.map((s) => (s.id === tempId ? result.slot! : s)))
      }
    })
  }

  function handleDeleteSlot(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
  }

  function handleUpdateSlot(slotId: string, startISO: string, endISO: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, startTime: new Date(startISO), endTime: new Date(endISO) } : s
      )
    )
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-4">
        <ArtistSidebar artists={artists} assignedArtistIds={assignedArtistIds} />
        <div className="flex-1 overflow-x-auto">
          <StageGrid
            event={event}
            slots={slots}
            onDeleteSlot={handleDeleteSlot}
            onUpdateSlot={handleUpdateSlot}
          />
        </div>
      </div>
      <div className="mt-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="h-9 px-4 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Drucken
        </button>
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/events/components/FestivalPlanner.tsx
git commit -m "feat: add FestivalPlanner with optimistic DnD and rollback"
```

---

### Task 9: /events page (Liste)

**Files:**
- Create: `src/app/(dashboard)/events/page.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/app/(dashboard)/events/page.tsx
import Link from "next/link"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { getEvents } from "@/modules/events/actions/event.actions"

export const metadata = { title: "Events – Booker App" }

export default async function EventsPage() {
  const events = await getEvents()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Events</h2>
        <Link
          href="/events/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Event anlegen
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500">Noch keine Events angelegt.</p>
      ) : (
        <div className="rounded-md border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Datum</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Venue</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Bühnen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/events/${event.id}`}
                      className="font-medium text-slate-900 hover:text-indigo-600"
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {format(new Date(event.date), "d. MMM yyyy", { locale: de })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {event.venue.name}
                    {event.venue.city ? ` · ${event.venue.city}` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{event.stages.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/events/page.tsx
git commit -m "feat: add /events list page"
```

---

### Task 10: /events/new und /events/[id]/edit

**Files:**
- Create: `src/app/(dashboard)/events/new/page.tsx`
- Create: `src/app/(dashboard)/events/[id]/edit/page.tsx`

- [ ] **Step 1: /events/new anlegen**

```typescript
// src/app/(dashboard)/events/new/page.tsx
import Link from "next/link"
import { db } from "@/lib/db"
import { createEvent } from "@/modules/events/actions/event.actions"
import { EventForm } from "@/modules/events/components/EventForm"

export const metadata = { title: "Event anlegen – Booker App" }

export default async function NewEventPage() {
  const venues = await db.venue.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/events" className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Events
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Event anlegen</h2>
      </div>
      <EventForm action={createEvent} venues={venues} showStages={true} />
    </div>
  )
}
```

- [ ] **Step 2: /events/[id]/edit anlegen**

```typescript
// src/app/(dashboard)/events/[id]/edit/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import {
  getEventById,
  updateEvent,
  deleteEvent,
  createStage,
  deleteStage,
} from "@/modules/events/actions/event.actions"
import { EventForm } from "@/modules/events/components/EventForm"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const event = await getEventById(id)
  return { title: event ? `${event.name} bearbeiten – Booker App` : "Event bearbeiten – Booker App" }
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params
  const [event, venues] = await Promise.all([
    getEventById(id),
    db.venue.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!event) notFound()

  const boundUpdate = updateEvent.bind(null, id)
  const boundDelete = deleteEvent.bind(null, id)
  const boundCreateStage = createStage.bind(null, id)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/events/${id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Planer
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Event bearbeiten</h2>
      </div>

      <EventForm
        action={boundUpdate}
        venues={venues}
        showStages={false}
        defaultValues={{
          name: event.name,
          venueId: event.venueId,
          date: format(new Date(event.date), "yyyy-MM-dd"),
          gridInterval: event.gridInterval,
          startTime: event.startTime,
          endTime: event.endTime,
        }}
        deleteAction={boundDelete}
      />

      {/* Stage-Verwaltung */}
      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Bühnen verwalten</h3>
        <div className="flex flex-col gap-2 mb-4">
          {event.stages.map((stage) => {
            const boundDeleteStage = deleteStage.bind(null, stage.id, id)
            return (
              <div
                key={stage.id}
                className="flex items-center gap-3 rounded-md border border-slate-200 p-3"
              >
                <div
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="flex-1 text-sm font-medium text-slate-900">{stage.name}</span>
                <span className="text-xs text-slate-400">Reihenfolge {stage.order}</span>
                <span className="text-xs text-slate-400">{stage.slots.length} Slots</span>
                <form action={boundDeleteStage}>
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Löschen
                  </button>
                </form>
              </div>
            )
          })}
          {event.stages.length === 0 && (
            <p className="text-sm text-slate-400">Noch keine Bühnen vorhanden.</p>
          )}
        </div>

        <form action={boundCreateStage} className="flex gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-slate-700">Name *</label>
            <input
              name="name"
              placeholder="Bühnenname"
              className="h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Farbe</label>
            <input
              type="color"
              name="color"
              defaultValue="#6366f1"
              className="h-9 w-12 rounded-md border border-slate-300 cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Reihenf.</label>
            <input
              type="number"
              name="order"
              defaultValue={event.stages.length}
              className="h-9 w-20 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-md bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Hinzufügen
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/events/new/ src/app/(dashboard)/events/[id]/edit/
git commit -m "feat: add /events/new and /events/[id]/edit pages"
```

---

### Task 11: /events/[id] — Festival-Planer

**Files:**
- Create: `src/app/(dashboard)/events/[id]/page.tsx`

- [ ] **Step 1: Datei anlegen**

```typescript
// src/app/(dashboard)/events/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { db } from "@/lib/db"
import { getEventById } from "@/modules/events/actions/event.actions"
import { FestivalPlanner } from "@/modules/events/components/FestivalPlanner"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const event = await getEventById(id)
  return { title: event ? `${event.name} – Booker App` : "Event – Booker App" }
}

export default async function EventPage({ params }: Props) {
  const { id } = await params
  const [event, artists] = await Promise.all([
    getEventById(id),
    db.artist.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!event) notFound()

  const allSlots = event.stages.flatMap((s) => s.slots)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/events"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Events
          </Link>
          <h2 className="text-xl font-semibold text-slate-900">{event.name}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {format(new Date(event.date), "d. MMMM yyyy", { locale: de })}
            {" · "}
            {event.venue.name}
            {event.venue.city ? ` · ${event.venue.city}` : ""}
            {" · "}
            {event.startTime}–{event.endTime}
          </p>
        </div>
        <Link
          href={`/events/${id}/edit`}
          className="h-9 px-4 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Bearbeiten
        </Link>
      </div>

      <FestivalPlanner event={event} artists={artists} initialSlots={allSlots} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/events/[id]/page.tsx
git commit -m "feat: add /events/[id] festival planner page"
```

---

### Task 12: Build-Verifikation

**Files:** keine neuen Dateien

- [ ] **Step 1: Typecheck**

```bash
pnpm typecheck
```

Expected: 0 Fehler.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: Keine Warnungen oder Fehler.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: Build erfolgreich. Alle Seiten kompiliert.

- [ ] **Step 4: Manuelle Smoke-Tests**

Starte den Dev-Server (`pnpm dev`) und prüfe:

- [ ] `/events` lädt ohne Fehler, zeigt „Noch keine Events"
- [ ] `/events/new` öffnet Formular, Stage kann hinzugefügt werden
- [ ] Event anlegen → Weiterleitung zu `/events/[id]`
- [ ] Planer zeigt Sidebar mit Artists und Stage-Raster
- [ ] Artist per DnD auf Zelle ziehen → Slot erscheint sofort (optimistisch)
- [ ] Seiten-Reload → Slot noch vorhanden
- [ ] Klick auf Slot → Popover mit Zeit-Dropdowns
- [ ] `/events/[id]/edit` → Eventfelder bearbeiten, Stage hinzufügen/löschen

- [ ] **Step 5: Final Commit falls nötig**

```bash
git add -A
git commit -m "chore: build verification for festival planner"
```
