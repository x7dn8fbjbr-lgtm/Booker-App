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
