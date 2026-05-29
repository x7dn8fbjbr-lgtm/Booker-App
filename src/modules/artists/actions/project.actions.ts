// src/modules/artists/actions/project.actions.ts
"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
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
    name: (formData.get("name") as string | null) ?? "",
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

  revalidatePath(`/artists/${artistId}`)
  redirect(`/artists/${artistId}?tab=projekte`)
}

export async function updateProject(
  id: string,
  artistId: string,
  prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const result = ProjectSchema.safeParse({
    name: (formData.get("name") as string | null) ?? "",
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

  revalidatePath(`/artists/${artistId}`)
  redirect(`/artists/${artistId}?tab=projekte`)
}

export async function deleteProject(
  id: string,
  artistId: string
): Promise<void> {
  await db.project.delete({ where: { id } })
  revalidatePath(`/artists/${artistId}`)
  redirect(`/artists/${artistId}?tab=projekte`)
}
