// src/modules/bookings/actions/negotiation.actions.ts
"use server"

import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

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
    .pipe(z.number().min(0).optional()),
  currency: z.string().min(1).default("EUR"),
  travelCosts: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().min(0).optional()),
  accommodation: z
    .string()
    .optional()
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().min(0).optional()),
  notes: z.string().optional(),
})

export async function upsertNegotiation(
  bookingId: string,
  prevState: NegotiationFormState,
  formData: FormData
): Promise<NegotiationFormState> {
  const session = await getServerSession(authOptions)
  if (!session) return { message: "Nicht autorisiert." }

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
