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
