# Booking-CRM (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Booking-CRM module with a Kanban board (drag & drop), full CRUD, negotiation details, and a communication log with tag filtering.

**Architecture:** Server Components for data fetching, Server Actions for mutations, Client Components for Kanban, forms, and the tag-filter log. Optimistic status update on DnD with rollback on error. No API layer — Server Actions only.

**Tech Stack:** Next.js 16 App Router, Prisma 6, @dnd-kit/core + @dnd-kit/utilities, Zod v4, React 19 `useActionState` + `useTransition`, Tailwind CSS.

---

## File Map

| Action | Path |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Create | `src/modules/bookings/actions/booking.actions.ts` |
| Create | `src/modules/bookings/actions/negotiation.actions.ts` |
| Create | `src/modules/bookings/actions/log.actions.ts` |
| Create | `src/modules/bookings/components/BookingCard.tsx` |
| Create | `src/modules/bookings/components/KanbanBoard.tsx` |
| Create | `src/modules/bookings/components/BookingForm.tsx` |
| Create | `src/modules/bookings/components/NegotiationForm.tsx` |
| Create | `src/modules/bookings/components/CommunicationLog.tsx` |
| Create | `src/modules/bookings/components/LogForm.tsx` |
| Create | `src/app/(dashboard)/bookings/page.tsx` |
| Create | `src/app/(dashboard)/bookings/new/page.tsx` |
| Create | `src/app/(dashboard)/bookings/[id]/page.tsx` |
| Create | `src/app/(dashboard)/bookings/[id]/edit/page.tsx` |
| Modify | `src/app/(dashboard)/artists/[id]/page.tsx` |
| Modify | `src/app/(dashboard)/venues/[id]/page.tsx` |

---

## Task 1: Schema migration + install @dnd-kit

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `contactPerson` to Booking and `tags` to CommunicationLog in schema**

In `prisma/schema.prisma`, update the two models:

```prisma
model Booking {
  id             String             @id @default(cuid())
  artistId       String
  artist         Artist             @relation(fields: [artistId], references: [id])
  projectId      String?
  project        Project?           @relation(fields: [projectId], references: [id])
  venueId        String
  venue          Venue              @relation(fields: [venueId], references: [id])
  date           DateTime
  contactPerson  String?
  status         BookingStatus      @default(ERSTKONTAKT)
  negotiation    NegotiationDetail?
  communications CommunicationLog[]
  documents      Document[]
  tourId         String?
  tour           Tour?              @relation(fields: [tourId], references: [id])
  createdAt      DateTime           @default(now())
  updatedAt      DateTime           @updatedAt

  @@index([artistId])
  @@index([venueId])
  @@index([status])
  @@index([date])
}

model CommunicationLog {
  id            String   @id @default(cuid())
  bookingId     String
  booking       Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  contactPerson String?
  body          String   @db.Text
  tags          String[]
  attachmentUrl String?
  createdAt     DateTime @default(now())

  @@index([bookingId])
}
```

- [ ] **Step 2: Run local migration**

```bash
pnpm prisma migrate dev --name add_booking_contact_and_log_tags
```

Expected: Migration applied successfully, Prisma client regenerated.

- [ ] **Step 3: Apply migration to Supabase staging**

Run in the Supabase SQL editor (project: booker-app staging):

```sql
ALTER TABLE "Booking" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "CommunicationLog" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
```

- [ ] **Step 4: Install @dnd-kit packages**

```bash
pnpm add @dnd-kit/core @dnd-kit/utilities
```

Expected: Packages added to `dependencies` in `package.json`.

- [ ] **Step 5: Verify Prisma client has new fields**

```bash
pnpm typecheck
```

Expected: No errors. If `Booking` type is missing `contactPerson` or `CommunicationLog` missing `tags`, run `pnpm db:generate` first.

- [ ] **Step 6: Commit**

```bash
git add prisma/ package.json pnpm-lock.yaml
git commit -m "feat: add booking contactPerson, log tags, install dnd-kit"
```

---

## Task 2: booking.actions.ts

**Files:**
- Create: `src/modules/bookings/actions/booking.actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/actions/booking.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"
import { BookingStatus } from "@prisma/client"
import type {
  Booking,
  Artist,
  Venue,
  Project,
  NegotiationDetail,
  CommunicationLog,
} from "@prisma/client"

// ─── Types ───────────────────────────────────────────────────────────────────

export type BookingFormState = {
  errors?: {
    artistId?: string[]
    venueId?: string[]
    date?: string[]
    status?: string[]
  }
  message?: string
}

export type BookingWithRelations = Booking & {
  artist: Artist
  venue: Venue
  project: Project | null
}

export type BookingDetail = BookingWithRelations & {
  negotiation: NegotiationDetail | null
  communications: CommunicationLog[]
}

// ─── Validation ──────────────────────────────────────────────────────────────

const BookingSchema = z.object({
  artistId: z.string().min(1, "Artist ist erforderlich"),
  projectId: z.string().optional(),
  venueId: z.string().min(1, "Venue ist erforderlich"),
  date: z.string().min(1, "Datum ist erforderlich"),
  time: z.string().optional(),
  status: z.nativeEnum(BookingStatus),
  contactPerson: z.string().optional(),
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildDateTime(dateStr: string, timeStr?: string): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00`)
  }
  return new Date(dateStr)
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getBookings(): Promise<BookingWithRelations[]> {
  return db.booking.findMany({
    include: {
      artist: true,
      venue: true,
      project: true,
    },
    orderBy: { date: "asc" },
  })
}

export async function getBookingById(id: string): Promise<BookingDetail | null> {
  return db.booking.findUnique({
    where: { id },
    include: {
      artist: true,
      venue: true,
      project: true,
      negotiation: true,
      communications: {
        orderBy: { createdAt: "desc" },
      },
    },
  })
}

export async function getProjectsByArtist(artistId: string): Promise<Project[]> {
  return db.project.findMany({
    where: { artistId },
    orderBy: { name: "asc" },
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createBooking(
  prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const result = BookingSchema.safeParse({
    artistId: (formData.get("artistId") as string | null) ?? "",
    projectId: (formData.get("projectId") as string) || undefined,
    venueId: (formData.get("venueId") as string | null) ?? "",
    date: (formData.get("date") as string | null) ?? "",
    time: (formData.get("time") as string) || undefined,
    status: (formData.get("status") as string) || "ERSTKONTAKT",
    contactPerson: (formData.get("contactPerson") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  let bookingId: string
  try {
    const booking = await db.booking.create({
      data: {
        artistId: result.data.artistId,
        projectId: result.data.projectId ?? null,
        venueId: result.data.venueId,
        date: buildDateTime(result.data.date, result.data.time),
        status: result.data.status,
        contactPerson: result.data.contactPerson ?? null,
      },
    })
    bookingId = booking.id
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/bookings/${bookingId}`)
}

export async function updateBooking(
  id: string,
  prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const result = BookingSchema.safeParse({
    artistId: (formData.get("artistId") as string | null) ?? "",
    projectId: (formData.get("projectId") as string) || undefined,
    venueId: (formData.get("venueId") as string | null) ?? "",
    date: (formData.get("date") as string | null) ?? "",
    time: (formData.get("time") as string) || undefined,
    status: (formData.get("status") as string) || "ERSTKONTAKT",
    contactPerson: (formData.get("contactPerson") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.booking.update({
      where: { id },
      data: {
        artistId: result.data.artistId,
        projectId: result.data.projectId ?? null,
        venueId: result.data.venueId,
        date: buildDateTime(result.data.date, result.data.time),
        status: result.data.status,
        contactPerson: result.data.contactPerson ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/bookings/${id}`)
}

export async function deleteBooking(id: string): Promise<void> {
  await db.booking.delete({ where: { id } })
  redirect("/bookings")
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.booking.update({ where: { id }, data: { status } })
    return { success: true }
  } catch {
    return { success: false, message: "Status konnte nicht gespeichert werden." }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/actions/booking.actions.ts
git commit -m "feat: add booking server actions"
```

---

## Task 3: negotiation.actions.ts

**Files:**
- Create: `src/modules/bookings/actions/negotiation.actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/actions/negotiation.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"

export type NegotiationFormState = {
  errors?: {
    fee?: string[]
    travelCosts?: string[]
    accommodation?: string[]
  }
  message?: string
}

const NegotiationSchema = z.object({
  fee: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive().optional()),
  currency: z.string().min(1).default("EUR"),
  travelCosts: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive().optional()),
  accommodation: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive().optional()),
  notes: z.string().optional(),
})

export async function upsertNegotiation(
  bookingId: string,
  prevState: NegotiationFormState,
  formData: FormData
): Promise<NegotiationFormState> {
  const result = NegotiationSchema.safeParse({
    fee: (formData.get("fee") as string) || undefined,
    currency: (formData.get("currency") as string) || "EUR",
    travelCosts: (formData.get("travelCosts") as string) || undefined,
    accommodation: (formData.get("accommodation") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await db.negotiationDetail.upsert({
      where: { bookingId },
      update: {
        fee: result.data.fee ?? null,
        currency: result.data.currency,
        travelCosts: result.data.travelCosts ?? null,
        accommodation: result.data.accommodation ?? null,
        notes: result.data.notes ?? null,
      },
      create: {
        bookingId,
        fee: result.data.fee ?? null,
        currency: result.data.currency,
        travelCosts: result.data.travelCosts ?? null,
        accommodation: result.data.accommodation ?? null,
        notes: result.data.notes ?? null,
      },
    })
  } catch {
    return { message: "Speichern fehlgeschlagen. Bitte erneut versuchen." }
  }

  redirect(`/bookings/${bookingId}?tab=verhandlung`)
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/actions/negotiation.actions.ts
git commit -m "feat: add negotiation upsert action"
```

---

## Task 4: log.actions.ts

**Files:**
- Create: `src/modules/bookings/actions/log.actions.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/actions/log.actions.ts
"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { db } from "@/lib/db"

export type LogFormState = {
  errors?: {
    body?: string[]
  }
  message?: string
}

const LogSchema = z.object({
  body: z.string().min(1, "Nachricht ist erforderlich"),
  contactPerson: z.string().optional(),
  tags: z.string().optional(),
})

export async function createLog(
  bookingId: string,
  prevState: LogFormState,
  formData: FormData
): Promise<LogFormState> {
  const result = LogSchema.safeParse({
    body: (formData.get("body") as string | null) ?? "",
    contactPerson: (formData.get("contactPerson") as string) || undefined,
    tags: (formData.get("tags") as string) || undefined,
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const tags = result.data.tags
    ? result.data.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  try {
    await db.communicationLog.create({
      data: {
        bookingId,
        body: result.data.body,
        contactPerson: result.data.contactPerson ?? null,
        tags,
      },
    })
  } catch {
    return { message: "Eintrag konnte nicht gespeichert werden." }
  }

  redirect(`/bookings/${bookingId}?tab=kommunikation`)
}

export async function deleteLog(id: string, bookingId: string): Promise<void> {
  await db.communicationLog.delete({ where: { id } })
  redirect(`/bookings/${bookingId}?tab=kommunikation`)
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/actions/log.actions.ts
git commit -m "feat: add communication log actions"
```

---

## Task 5: BookingCard.tsx

**Files:**
- Create: `src/modules/bookings/components/BookingCard.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/components/BookingCard.tsx
"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { BookingWithRelations } from "../actions/booking.actions"

interface Props {
  booking: BookingWithRelations
}

export function BookingCard({ booking }: Props) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
    data: { status: booking.status },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) {
          router.push(`/bookings/${booking.id}`)
        }
      }}
      className={cn(
        "rounded-md border border-slate-200 bg-white p-3 shadow-sm",
        "cursor-grab active:cursor-grabbing select-none",
        "flex flex-col gap-1.5"
      )}
    >
      <p className="text-sm font-medium text-slate-900 truncate">
        {booking.artist.name}
      </p>
      <p className="text-xs text-slate-500 truncate">
        {booking.venue.name}
        {booking.venue.city ? ` · ${booking.venue.city}` : ""}
      </p>
      <p className="text-xs text-slate-400">
        {format(new Date(booking.date), "d. MMM yyyy", { locale: de })}
      </p>
      {booking.project && (
        <span className="inline-block self-start rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {booking.project.name}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/components/BookingCard.tsx
git commit -m "feat: add BookingCard component"
```

---

## Task 6: KanbanBoard.tsx

**Files:**
- Create: `src/modules/bookings/components/KanbanBoard.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/components/KanbanBoard.tsx
"use client"

import { useState, useTransition } from "react"
import { DndContext, useDroppable, type DragEndEvent } from "@dnd-kit/core"
import { BookingStatus } from "@prisma/client"
import { cn } from "@/lib/utils"
import { BookingCard } from "./BookingCard"
import { updateBookingStatus } from "../actions/booking.actions"
import type { BookingWithRelations } from "../actions/booking.actions"

const COLUMNS: { status: BookingStatus; label: string }[] = [
  { status: BookingStatus.ERSTKONTAKT, label: "Erstkontakt" },
  { status: BookingStatus.IN_VERHANDLUNG, label: "In Verhandlung" },
  { status: BookingStatus.BESTAETIGT, label: "Bestätigt" },
  { status: BookingStatus.ABGESAGT, label: "Abgesagt" },
]

interface Props {
  initialBookings: BookingWithRelations[]
}

export function KanbanBoard({ initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const bookingId = active.id as string
    const newStatus = over.id as BookingStatus

    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking || booking.status === newStatus) return

    const snapshot = bookings

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    )
    setError(null)

    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, newStatus)
      if (!result.success) {
        setBookings(snapshot)
        setError(result.message ?? "Statusänderung fehlgeschlagen.")
      }
    })
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            bookings={bookings.filter((b) => b.status === col.status)}
          />
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({
  status,
  label,
  bookings,
}: {
  status: BookingStatus
  label: string
  bookings: BookingWithRelations[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-lg p-3 min-h-48 transition-colors",
        status === BookingStatus.ABGESAGT ? "bg-slate-100" : "bg-slate-50",
        isOver && "ring-2 ring-inset ring-indigo-400"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 border border-slate-200">
          {bookings.length}
        </span>
      </div>
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/components/KanbanBoard.tsx
git commit -m "feat: add KanbanBoard component with optimistic DnD"
```

---

## Task 7: BookingForm.tsx

**Files:**
- Create: `src/modules/bookings/components/BookingForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/components/BookingForm.tsx
"use client"

import { useActionState, useState, useTransition } from "react"
import { BookingStatus } from "@prisma/client"
import { format } from "date-fns"
import { getProjectsByArtist } from "../actions/booking.actions"
import type { BookingFormState } from "../actions/booking.actions"
import type { Artist, Venue, Project } from "@prisma/client"

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "ERSTKONTAKT", label: "Erstkontakt" },
  { value: "IN_VERHANDLUNG", label: "In Verhandlung" },
  { value: "BESTAETIGT", label: "Bestätigt" },
  { value: "ABGESAGT", label: "Abgesagt" },
]

interface Props {
  action: (prevState: BookingFormState, formData: FormData) => Promise<BookingFormState>
  artists: Artist[]
  venues: Venue[]
  defaultValues?: {
    artistId?: string
    projectId?: string
    venueId?: string
    date?: string
    time?: string
    status?: BookingStatus
    contactPerson?: string
  }
  initialProjects?: Project[]
  deleteAction?: () => Promise<void>
}

const initialState: BookingFormState = {}

export function BookingForm({
  action,
  artists,
  venues,
  defaultValues,
  initialProjects = [],
  deleteAction,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedArtistId, setSelectedArtistId] = useState(
    defaultValues?.artistId ?? ""
  )
  const [, startProjectTransition] = useTransition()

  function handleArtistChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const artistId = e.target.value
    setSelectedArtistId(artistId)
    if (!artistId) {
      setProjects([])
      return
    }
    startProjectTransition(async () => {
      const ps = await getProjectsByArtist(artistId)
      setProjects(ps)
    })
  }

  const defaultDate = defaultValues?.date ?? ""
  const defaultTime = defaultValues?.time ?? ""

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state.message && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Artist */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="artistId" className="text-sm font-medium text-slate-700">
          Artist <span className="text-red-500">*</span>
        </label>
        <select
          id="artistId"
          name="artistId"
          value={selectedArtistId}
          onChange={handleArtistChange}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Artist wählen —</option>
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

      {/* Project */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="projectId" className="text-sm font-medium text-slate-700">
          Projekt
        </label>
        <select
          id="projectId"
          name="projectId"
          defaultValue={defaultValues?.projectId ?? ""}
          disabled={!selectedArtistId || projects.length === 0}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">— kein Projekt —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Venue */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="venueId" className="text-sm font-medium text-slate-700">
          Venue <span className="text-red-500">*</span>
        </label>
        <select
          id="venueId"
          name="venueId"
          defaultValue={defaultValues?.venueId ?? ""}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Venue wählen —</option>
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

      {/* Date + Time */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="date" className="text-sm font-medium text-slate-700">
            Datum <span className="text-red-500">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {state.errors?.date && (
            <p className="text-xs text-red-600">{state.errors.date[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-32">
          <label htmlFor="time" className="text-sm font-medium text-slate-700">
            Uhrzeit
          </label>
          <input
            id="time"
            name="time"
            type="time"
            defaultValue={defaultTime}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "ERSTKONTAKT"}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Contact person */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactPerson" className="text-sm font-medium text-slate-700">
          Ansprechpartner
        </label>
        <input
          id="contactPerson"
          name="contactPerson"
          type="text"
          defaultValue={defaultValues?.contactPerson ?? ""}
          placeholder="z. B. Max Mustermann"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Speichern …" : "Speichern"}
        </button>
      </div>

      {/* Danger zone */}
      {deleteAction && (
        <div className="mt-8 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800 mb-3">Gefahrenzone</p>
          <form action={deleteAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Booking löschen
            </button>
          </form>
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/components/BookingForm.tsx
git commit -m "feat: add BookingForm with dynamic project loading"
```

---

## Task 8: NegotiationForm.tsx

**Files:**
- Create: `src/modules/bookings/components/NegotiationForm.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/modules/bookings/components/NegotiationForm.tsx
"use client"

import { useActionState } from "react"
import type { NegotiationFormState } from "../actions/negotiation.actions"
import type { NegotiationDetail } from "@prisma/client"

interface Props {
  action: (
    prevState: NegotiationFormState,
    formData: FormData
  ) => Promise<NegotiationFormState>
  negotiation: NegotiationDetail | null
}

const initialState: NegotiationFormState = {}

export function NegotiationForm({ action, negotiation }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state.message && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="flex gap-4">
        {/* Fee */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="fee" className="text-sm font-medium text-slate-700">
            Gage (€)
          </label>
          <input
            id="fee"
            name="fee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={negotiation?.fee ?? ""}
            placeholder="0.00"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {state.errors?.fee && (
            <p className="text-xs text-red-600">{state.errors.fee[0]}</p>
          )}
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-1.5 w-28">
          <label htmlFor="currency" className="text-sm font-medium text-slate-700">
            Währung
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            defaultValue={negotiation?.currency ?? "EUR"}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Travel costs */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="travelCosts" className="text-sm font-medium text-slate-700">
          Fahrtkosten (€)
        </label>
        <input
          id="travelCosts"
          name="travelCosts"
          type="number"
          step="0.01"
          min="0"
          defaultValue={negotiation?.travelCosts ?? ""}
          placeholder="0.00"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {state.errors?.travelCosts && (
          <p className="text-xs text-red-600">{state.errors.travelCosts[0]}</p>
        )}
      </div>

      {/* Accommodation */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="accommodation" className="text-sm font-medium text-slate-700">
          Übernachtungskosten (€)
        </label>
        <input
          id="accommodation"
          name="accommodation"
          type="number"
          step="0.01"
          min="0"
          defaultValue={negotiation?.accommodation ?? ""}
          placeholder="0.00"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {state.errors?.accommodation && (
          <p className="text-xs text-red-600">{state.errors.accommodation[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Sonstige Konditionen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={negotiation?.notes ?? ""}
          placeholder="z. B. Backline, Catering, besondere Vereinbarungen …"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Speichern …" : "Speichern"}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/bookings/components/NegotiationForm.tsx
git commit -m "feat: add NegotiationForm component"
```

---

## Task 9: CommunicationLog.tsx + LogForm.tsx

**Files:**
- Create: `src/modules/bookings/components/CommunicationLog.tsx`
- Create: `src/modules/bookings/components/LogForm.tsx`

- [ ] **Step 1: Create CommunicationLog.tsx**

This is a Client Component to support the tag filter. The delete button uses a bound Server Action inside a `<form>`.

```typescript
// src/modules/bookings/components/CommunicationLog.tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { deleteLog } from "../actions/log.actions"
import type { CommunicationLog as CommunicationLogType } from "@prisma/client"

interface Props {
  bookingId: string
  logs: CommunicationLogType[]
}

export function CommunicationLog({ bookingId, logs }: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = [...new Set(logs.flatMap((l) => l.tags))].sort()

  const filteredLogs =
    selectedTags.length === 0
      ? logs
      : logs.filter((l) => selectedTags.some((t) => l.tags.includes(t)))

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedTags.includes(tag)
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="rounded-full px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Log entries */}
      {filteredLogs.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">
          {logs.length === 0
            ? "Noch keine Einträge."
            : "Keine Einträge für den gewählten Filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLogs.map((log) => {
            const boundDelete = deleteLog.bind(null, log.id, bookingId)
            return (
              <div
                key={log.id}
                className="rounded-md border border-slate-200 bg-white p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400">
                      {format(new Date(log.createdAt), "d. MMM yyyy, HH:mm", {
                        locale: de,
                      })}
                      {log.contactPerson ? ` · ${log.contactPerson}` : ""}
                    </span>
                  </div>
                  <form action={boundDelete}>
                    <button
                      type="submit"
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                    >
                      Löschen
                    </button>
                  </form>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{log.body}</p>
                {log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {log.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create LogForm.tsx**

```typescript
// src/modules/bookings/components/LogForm.tsx
"use client"

import { useActionState } from "react"
import type { LogFormState } from "../actions/log.actions"

interface Props {
  action: (prevState: LogFormState, formData: FormData) => Promise<LogFormState>
}

const initialState: LogFormState = {}

export function LogForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <p className="text-sm font-medium text-slate-700">Neuer Eintrag</p>

      {state.message && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Body */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-slate-700">
          Nachricht <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          required
          placeholder="Was wurde besprochen?"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        {state.errors?.body && (
          <p className="text-xs text-red-600">{state.errors.body[0]}</p>
        )}
      </div>

      {/* Contact person */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="logContactPerson" className="text-sm font-medium text-slate-700">
          Kontaktperson
        </label>
        <input
          id="logContactPerson"
          name="contactPerson"
          type="text"
          placeholder="z. B. Max Mustermann"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tags" className="text-sm font-medium text-slate-700">
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="wichtig, vertrag, angebot (kommagetrennt)"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Speichern …" : "Eintrag hinzufügen"}
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/modules/bookings/components/CommunicationLog.tsx src/modules/bookings/components/LogForm.tsx
git commit -m "feat: add CommunicationLog and LogForm components"
```

---

## Task 10: /bookings page (Kanban)

**Files:**
- Create: `src/app/(dashboard)/bookings/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/app/(dashboard)/bookings/page.tsx
import Link from "next/link"
import { getBookings } from "@/modules/bookings/actions/booking.actions"
import { KanbanBoard } from "@/modules/bookings/components/KanbanBoard"

export const metadata = { title: "Bookings – Booker App" }

export default async function BookingsPage() {
  const bookings = await getBookings()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Bookings</h2>
        <Link
          href="/bookings/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Booking anlegen
        </Link>
      </div>

      <KanbanBoard initialBookings={bookings} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/bookings/page.tsx
git commit -m "feat: add /bookings Kanban page"
```

---

## Task 11: /bookings/new page

**Files:**
- Create: `src/app/(dashboard)/bookings/new/page.tsx`

- [ ] **Step 1: Create the file**

`searchParams` can contain `artistId` and `venueId` for pre-filling. When `artistId` is present the page pre-loads that artist's projects server-side.

```typescript
// src/app/(dashboard)/bookings/new/page.tsx
import Link from "next/link"
import { db } from "@/lib/db"
import { createBooking, getProjectsByArtist } from "@/modules/bookings/actions/booking.actions"
import { BookingForm } from "@/modules/bookings/components/BookingForm"

export const metadata = { title: "Booking anlegen – Booker App" }

interface Props {
  searchParams: Promise<{ artistId?: string; venueId?: string }>
}

export default async function NewBookingPage({ searchParams }: Props) {
  const { artistId, venueId } = await searchParams

  const [artists, venues, initialProjects] = await Promise.all([
    db.artist.findMany({ orderBy: { name: "asc" } }),
    db.venue.findMany({ orderBy: { name: "asc" } }),
    artistId ? getProjectsByArtist(artistId) : Promise.resolve([]),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/bookings"
          className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
        >
          ← Bookings
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Booking anlegen</h2>
      </div>

      <BookingForm
        action={createBooking}
        artists={artists}
        venues={venues}
        defaultValues={{ artistId, venueId }}
        initialProjects={initialProjects}
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/bookings/new/page.tsx
git commit -m "feat: add /bookings/new page"
```

---

## Task 12: /bookings/[id] detail page

**Files:**
- Create: `src/app/(dashboard)/bookings/[id]/page.tsx`

- [ ] **Step 1: Create the file**

Three tabs: Übersicht (with status change), Verhandlung, Kommunikation. StatusForm is a Client Component defined in the same file using `"use client"` — but since the page itself is a Server Component, we define StatusForm in a separate inline section. Because we can't mix `"use server"` and `"use client"` in the same file, the StatusForm is defined in its own component. For simplicity we inline it as a Client Component and keep it in the same file by NOT adding `"use server"` to the page (it's already a Server Component by default).

Actually, to keep the file clean, define `StatusForm` directly in the page file. The page file has no `"use server"` directive (it's a Server Component by default), and the `StatusForm` sub-component uses `"use client"` — but you can't put that in the same file. So create the status form as a simple HTML form that POSTs via a bound Server Action, or use a separate file.

The cleanest approach: the status form is a `<form action={boundUpdateStatus}>` with a `<select>` and submit button — no client-side JS needed.

```typescript
// src/app/(dashboard)/bookings/[id]/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { BookingStatus } from "@prisma/client"
import { cn } from "@/lib/utils"
import {
  getBookingById,
  updateBookingStatus,
} from "@/modules/bookings/actions/booking.actions"
import { upsertNegotiation } from "@/modules/bookings/actions/negotiation.actions"
import { createLog } from "@/modules/bookings/actions/log.actions"
import { NegotiationForm } from "@/modules/bookings/components/NegotiationForm"
import { CommunicationLog } from "@/modules/bookings/components/CommunicationLog"
import { LogForm } from "@/modules/bookings/components/LogForm"

const STATUS_LABELS: Record<BookingStatus, string> = {
  ERSTKONTAKT: "Erstkontakt",
  IN_VERHANDLUNG: "In Verhandlung",
  BESTAETIGT: "Bestätigt",
  ABGESAGT: "Abgesagt",
}

const STATUS_BADGE: Record<BookingStatus, string> = {
  ERSTKONTAKT: "bg-slate-100 text-slate-700",
  IN_VERHANDLUNG: "bg-amber-100 text-amber-700",
  BESTAETIGT: "bg-green-100 text-green-700",
  ABGESAGT: "bg-red-100 text-red-700",
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS) as [BookingStatus, string][]

const TABS = [
  { label: "Übersicht", value: "uebersicht" },
  { label: "Verhandlung", value: "verhandlung" },
  { label: "Kommunikation", value: "kommunikation" },
] as const

type Tab = (typeof TABS)[number]["value"]

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) return { title: "Booking – Booker App" }
  return {
    title: `${booking.artist.name} · ${booking.venue.name} – Booker App`,
  }
}

export default async function BookingDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  const { tab } = await searchParams

  const booking = await getBookingById(id)
  if (!booking) notFound()

  const activeTab: Tab = TABS.some((t) => t.value === tab)
    ? (tab as Tab)
    : "uebersicht"

  const boundUpdateStatus = updateBookingStatus.bind(null, id)
  const boundUpsertNegotiation = upsertNegotiation.bind(null, id)
  const boundCreateLog = createLog.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/bookings"
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
          >
            ← Bookings
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {booking.artist.name} · {booking.venue.name}
            </h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_BADGE[booking.status]
              )}
            >
              {STATUS_LABELS[booking.status]}
            </span>
          </div>
        </div>
        <Link
          href={`/bookings/${id}/edit`}
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
              href={`/bookings/${id}?tab=${t.value}`}
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

      {/* Tab: Übersicht */}
      {activeTab === "uebersicht" && (
        <div className="flex flex-col gap-6 max-w-lg">
          <div className="flex flex-col gap-3">
            <InfoRow label="Artist" value={booking.artist.name} />
            {booking.project && (
              <InfoRow label="Projekt" value={booking.project.name} badge />
            )}
            <InfoRow
              label="Venue"
              value={
                booking.venue.city
                  ? `${booking.venue.name} (${booking.venue.city})`
                  : booking.venue.name
              }
            />
            <InfoRow
              label="Datum"
              value={format(new Date(booking.date), "d. MMMM yyyy, HH:mm", {
                locale: de,
              })}
            />
            <InfoRow label="Ansprechpartner" value={booking.contactPerson} />
          </div>

          {/* Status change */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-slate-700">Status ändern</p>
            <form
              action={async (formData: FormData) => {
                "use server"
                const status = formData.get("status") as BookingStatus
                await boundUpdateStatus(status)
              }}
              className="flex gap-3 items-center"
            >
              <select
                name="status"
                defaultValue={booking.status}
                className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md bg-white border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Speichern
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab: Verhandlung */}
      {activeTab === "verhandlung" && (
        <NegotiationForm
          action={boundUpsertNegotiation}
          negotiation={booking.negotiation}
        />
      )}

      {/* Tab: Kommunikation */}
      {activeTab === "kommunikation" && (
        <div className="flex flex-col gap-6">
          <CommunicationLog bookingId={id} logs={booking.communications} />
          <LogForm action={boundCreateLog} />
        </div>
      )}
    </div>
  )
}

function InfoRow({
  label,
  value,
  badge = false,
}: {
  label: string
  value: string | null | undefined
  badge?: boolean
}) {
  return (
    <div className="flex gap-4">
      <span className="w-32 flex-shrink-0 text-sm font-medium text-slate-500">
        {label}
      </span>
      {value ? (
        badge ? (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
            {value}
          </span>
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

**Note on inline Server Action:** The status-change form uses an inline `"use server"` async function. This is valid in Next.js App Router Server Components. If the linter flags it, extract into a named function at the top of the file or in `booking.actions.ts`.

Alternative (cleaner) approach for the status form — add a `updateBookingStatusFormAction` to `booking.actions.ts`:

```typescript
// Add to booking.actions.ts
export async function updateBookingStatusFormAction(
  bookingId: string,
  prevState: unknown,
  formData: FormData
): Promise<void> {
  const status = formData.get("status") as BookingStatus
  await db.booking.update({ where: { id: bookingId }, data: { status } })
  redirect(`/bookings/${bookingId}?tab=uebersicht`)
}
```

Then in the page use `updateBookingStatusFormAction.bind(null, id)` with `useActionState`. This avoids inline Server Actions. **Use this alternative if TypeScript errors appear with the inline approach.**

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors. If the inline `"use server"` in JSX causes issues, refactor using the alternative `updateBookingStatusFormAction` approach described above.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/bookings/[id]/page.tsx
git commit -m "feat: add /bookings/[id] detail page with 3 tabs"
```

---

## Task 13: /bookings/[id]/edit page

**Files:**
- Create: `src/app/(dashboard)/bookings/[id]/edit/page.tsx`

- [ ] **Step 1: Create the file**

```typescript
// src/app/(dashboard)/bookings/[id]/edit/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import {
  getBookingById,
  updateBooking,
  deleteBooking,
  getProjectsByArtist,
} from "@/modules/bookings/actions/booking.actions"
import { BookingForm } from "@/modules/bookings/components/BookingForm"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) return { title: "Booking bearbeiten – Booker App" }
  return { title: `${booking.artist.name} bearbeiten – Booker App` }
}

export default async function EditBookingPage({ params }: Props) {
  const { id } = await params

  const booking = await getBookingById(id)
  if (!booking) notFound()

  const [artists, venues, initialProjects] = await Promise.all([
    db.artist.findMany({ orderBy: { name: "asc" } }),
    db.venue.findMany({ orderBy: { name: "asc" } }),
    getProjectsByArtist(booking.artistId),
  ])

  const boundUpdate = updateBooking.bind(null, id)
  const boundDelete = deleteBooking.bind(null, id)

  const dateStr = format(new Date(booking.date), "yyyy-MM-dd")
  const timeStr = format(new Date(booking.date), "HH:mm")

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/bookings/${id}`}
          className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block"
        >
          ← Booking
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Booking bearbeiten</h2>
      </div>

      <BookingForm
        action={boundUpdate}
        artists={artists}
        venues={venues}
        defaultValues={{
          artistId: booking.artistId,
          projectId: booking.projectId ?? undefined,
          venueId: booking.venueId,
          date: dateStr,
          time: timeStr,
          status: booking.status,
          contactPerson: booking.contactPerson ?? undefined,
        }}
        initialProjects={initialProjects}
        deleteAction={boundDelete}
      />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/bookings/[id]/edit/page.tsx
git commit -m "feat: add /bookings/[id]/edit page"
```

---

## Task 14: Update Artist + Venue detail pages

**Files:**
- Modify: `src/app/(dashboard)/artists/[id]/page.tsx`
- Modify: `src/app/(dashboard)/venues/[id]/page.tsx`

- [ ] **Step 1: Update the artist Bookings tab in `artists/[id]/page.tsx`**

Replace the empty Bookings tab content with a link to create a booking pre-filled with the artist, and (later) a list of bookings. For now, replace the placeholder `EmptyState` with a booking button:

```tsx
{activeTab === "bookings" && (
  <div className="flex flex-col gap-4">
    <div className="flex justify-end">
      <Link
        href={`/bookings/new?artistId=${id}`}
        className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
      >
        Booking anlegen
      </Link>
    </div>
    <EmptyState
      title="Noch keine Bookings"
      description="Lege das erste Booking für diesen Artist an."
    />
  </div>
)}
```

The exact lines to replace in `src/app/(dashboard)/artists/[id]/page.tsx` (around line 107–112):

Old:
```tsx
      {activeTab === "bookings" && (
        <EmptyState
          title="Noch keine Bookings"
          description="Bookings werden in Phase 4 implementiert."
        />
      )}
```

New:
```tsx
      {activeTab === "bookings" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href={`/bookings/new?artistId=${id}`}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Booking anlegen
            </Link>
          </div>
          <EmptyState
            title="Noch keine Bookings"
            description="Lege das erste Booking für diesen Artist an."
          />
        </div>
      )}
```

- [ ] **Step 2: Update the venue Bookings tab in `venues/[id]/page.tsx`**

The exact lines to replace in `src/app/(dashboard)/venues/[id]/page.tsx` (around line 122–126):

Old:
```tsx
      {activeTab === "bookings" && (
        <EmptyState
          title="Noch keine Bookings"
          description="Bookings werden in Phase 3 implementiert."
        />
      )}
```

New:
```tsx
      {activeTab === "bookings" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Link
              href={`/bookings/new?venueId=${id}`}
              className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Booking anlegen
            </Link>
          </div>
          <EmptyState
            title="Noch keine Bookings"
            description="Lege das erste Booking für diese Venue an."
          />
        </div>
      )}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/artists/[id]/page.tsx src/app/(dashboard)/venues/[id]/page.tsx
git commit -m "feat: add Booking anlegen buttons to Artist and Venue detail pages"
```

---

## Task 15: Build verification

- [ ] **Step 1: Run full typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Expected: 0 errors. Fix any reported issues before proceeding.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: Build succeeds without errors. If Prisma client is stale, run `pnpm db:generate` first.

- [ ] **Step 4: Manual smoke test (dev server)**

```bash
pnpm dev
```

Test each flow:
1. `/bookings` — Kanban renders 4 columns (may be empty)
2. `/bookings/new` — form loads, artist dropdown works, project dropdown updates when artist selected
3. Create a booking → redirects to `/bookings/[id]`
4. `/bookings/[id]?tab=verhandlung` — Negotiation form renders and saves
5. `/bookings/[id]?tab=kommunikation` — Log form renders, add an entry, tag filter appears after adding entries with tags
6. Drag a card between Kanban columns — status updates optimistically
7. `/artists/[id]?tab=bookings` — "Booking anlegen" button links to `/bookings/new?artistId=…`
8. `/venues/[id]?tab=bookings` — "Booking anlegen" button links to `/bookings/new?venueId=…`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: Phase 3 Booking-CRM complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Kanban 4 columns, ABGESAGT muted | Task 6 KanbanBoard |
| Column shows booking count | Task 6 KanbanColumn |
| Card: artist, venue, date, project badge | Task 5 BookingCard |
| Klick on card → detail page | Task 5 BookingCard onClick |
| DnD → optimistic status + rollback | Task 6 KanbanBoard handleDragEnd |
| "Booking anlegen" button → /bookings/new | Task 10 BookingsPage |
| Booking form: all 7 fields | Task 7 BookingForm |
| Dynamic project load by artist | Task 7 handleArtistChange |
| URL params ?artistId / ?venueId | Task 11 NewBookingPage |
| Zod validation in all actions | Tasks 2, 3, 4 |
| Detail: header with status badge | Task 12 |
| Detail Tab 1: info + status change | Task 12 |
| Detail Tab 2: negotiation upsert | Tasks 3, 8, 12 |
| Detail Tab 3: log list, tag filter, log form | Tasks 4, 9, 12 |
| Tags as comma-separated input | Task 4 createLog |
| Tag filter OR logic, client-side | Task 9 CommunicationLog |
| Delete log without confirmation | Task 9 CommunicationLog (form action) |
| Edit page with all fields prefilled | Task 13 |
| Edit page: danger zone delete | Task 13 via BookingForm.deleteAction |
| Cascade delete (schema) | Already in schema (onDelete: Cascade) |
| Artist detail "Booking anlegen" button | Task 14 |
| Venue detail "Booking anlegen" button | Task 14 |
| schema CommunicationLog.tags | Task 1 |
| schema Booking.contactPerson | Task 1 (added — missing from original schema) |

**Type consistency:** All actions export their state types (`BookingFormState`, `NegotiationFormState`, `LogFormState`) which are imported by the corresponding form components. `BookingWithRelations` and `BookingDetail` are imported by page components and the KanbanBoard.
