// src/modules/events/actions/slot.actions.ts
"use server"
// TODO(offene-frage-1): Add auth check and orgId/userId scoping when multi-user is implemented

import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { BookingStatus } from "@prisma/client"
import type { SlotWithBooking } from "./event.actions"

export async function createSlot(params: {
  eventId: string
  stageId: string
  artistId: string
  startTimeISO: string
  endTimeISO: string
}): Promise<{ success: boolean; slot?: SlotWithBooking; message?: string }> {
  const { eventId, stageId, artistId, startTimeISO, endTimeISO } = params

  try {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { venueId: true, date: true },
    })
    if (!event) return { success: false, message: "Event nicht gefunden" }

    // Use the slot's own date (not event.date) so multi-day events work correctly
    const slotDate = new Date(startTimeISO)
    const dayStart = new Date(Date.UTC(slotDate.getUTCFullYear(), slotDate.getUTCMonth(), slotDate.getUTCDate()))
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    let booking = await db.booking.findFirst({
      where: {
        artistId,
        venueId: event.venueId,
        date: { gte: dayStart, lt: dayEnd },
      },
    })

    if (!booking) {
      booking = await db.booking.create({
        data: {
          artistId,
          venueId: event.venueId,
          date: event.date,
          status: BookingStatus.ERSTKONTAKT,
        },
      })
    }

    const slot = await db.slot.create({
      data: {
        stageId,
        startTime: new Date(startTimeISO),
        endTime: new Date(endTimeISO),
        bookingId: booking.id,
      },
      include: {
        booking: { include: { artist: true, project: true } },
      },
    })

    revalidatePath("/events")
    return { success: true, slot }
  } catch (error) {
    console.error("[createSlot]", error)
    return { success: false, message: "Slot konnte nicht gespeichert werden." }
  }
}

export async function updateSlotTimes(
  slotId: string,
  startTimeISO: string,
  endTimeISO: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.slot.update({
      where: { id: slotId },
      data: { startTime: new Date(startTimeISO), endTime: new Date(endTimeISO) },
    })
    revalidatePath("/events")
    return { success: true }
  } catch (error) {
    console.error("[updateSlotTimes]", error)
    return { success: false, message: "Zeitänderung fehlgeschlagen." }
  }
}

export async function deleteSlot(
  slotId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    await db.slot.delete({ where: { id: slotId } })
    revalidatePath("/events")
    return { success: true }
  } catch (error) {
    console.error("[deleteSlot]", error)
    return { success: false, message: "Löschen fehlgeschlagen." }
  }
}
