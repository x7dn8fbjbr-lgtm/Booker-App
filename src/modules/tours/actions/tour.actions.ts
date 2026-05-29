// src/modules/tours/actions/tour.actions.ts
"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"

import { z } from "zod"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireSession(): Promise<{ message: string } | null> {
  const session = await getServerSession(authOptions)
  if (!session) return { message: "Nicht autorisiert." }
  return null
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createTour(
  prevState: TourFormState,
  formData: FormData
): Promise<TourFormState> {
  const authError = await requireSession()
  if (authError) return authError

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

  revalidatePath("/tours")
  redirect(`/tours/${tourId}`)
}

export async function updateTour(
  id: string,
  prevState: TourFormState,
  formData: FormData
): Promise<TourFormState> {
  const authError = await requireSession()
  if (authError) return authError

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

  revalidatePath("/tours")
  revalidatePath(`/tours/${id}`)
  redirect(`/tours/${id}`)
}

export async function deleteTour(id: string): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session) { redirect("/login"); return }
  await db.tour.delete({ where: { id } })
  revalidatePath("/tours")
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
