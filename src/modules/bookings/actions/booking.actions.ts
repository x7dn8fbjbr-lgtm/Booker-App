// src/modules/bookings/actions/booking.actions.ts
"use server"

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
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

// Always construct as UTC — CLAUDE.md: "Alle Datumsangaben als UTC speichern"
function buildDateTime(dateStr: string, timeStr?: string): Date {
  if (timeStr) {
    return new Date(`${dateStr}T${timeStr}:00Z`)
  }
  return new Date(`${dateStr}T00:00:00Z`)
}

function parseBookingFormData(formData: FormData) {
  return {
    artistId: (formData.get("artistId") as string | null) ?? "",
    projectId: (formData.get("projectId") as string) || undefined,
    venueId: (formData.get("venueId") as string | null) ?? "",
    date: (formData.get("date") as string | null) ?? "",
    time: (formData.get("time") as string) || undefined,
    status: (formData.get("status") as string) || "ERSTKONTAKT",
    contactPerson: (formData.get("contactPerson") as string) || undefined,
  }
}

async function requireSession(): Promise<{ message: string } | null> {
  const session = await getServerSession(authOptions)
  if (!session) return { message: "Nicht autorisiert." }
  return null
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
  try {
    return await db.booking.findUnique({
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
  } catch (error) {
    console.error("[getBookingById]", error)
    throw error
  }
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
  const authError = await requireSession()
  if (authError) return authError

  const result = BookingSchema.safeParse(parseBookingFormData(formData))
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
  const authError = await requireSession()
  if (authError) return authError

  const result = BookingSchema.safeParse(parseBookingFormData(formData))
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
  const session = await getServerSession(authOptions)
  if (!session) { redirect("/login"); return }
  await db.booking.delete({ where: { id } })
  redirect("/bookings")
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<{ success: boolean; message?: string }> {
  const session = await getServerSession(authOptions)
  if (!session) return { success: false, message: "Nicht autorisiert." }
  try {
    await db.booking.update({ where: { id }, data: { status } })
    return { success: true }
  } catch {
    return { success: false, message: "Status konnte nicht gespeichert werden." }
  }
}

export async function updateBookingStatusFormAction(
  bookingId: string,
  _prevState: unknown,
  formData: FormData
): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const parsed = z.nativeEnum(BookingStatus).safeParse(formData.get("status"))
  if (!parsed.success) return
  await db.booking.update({ where: { id: bookingId }, data: { status: parsed.data } })
  redirect(`/bookings/${bookingId}?tab=uebersicht`)
}
