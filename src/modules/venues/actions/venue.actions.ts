"use server"

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"
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

async function requireSession(): Promise<{ message: string } | null> {
  const session = await getServerSession(authOptions)
  if (!session) return { message: "Nicht autorisiert." }
  return null
}

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
  const authError = await requireSession()
  if (authError) return authError

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
  const authError = await requireSession()
  if (authError) return authError

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
  const session = await getServerSession(authOptions)
  if (!session) { redirect("/login"); return }
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
