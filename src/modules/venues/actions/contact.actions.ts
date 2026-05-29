"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
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

  revalidatePath(`/venues/${venueId}`)
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

  revalidatePath(`/venues/${venueId}`)
  redirect(`/venues/${venueId}?tab=ansprechpartner`)
}

export async function deleteContact(id: string, venueId: string): Promise<void> {
  await db.contactPerson.delete({ where: { id } })
  revalidatePath(`/venues/${venueId}`)
  redirect(`/venues/${venueId}?tab=ansprechpartner`)
}
