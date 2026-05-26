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
