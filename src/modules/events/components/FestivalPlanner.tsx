// src/modules/events/components/FestivalPlanner.tsx
"use client"

import { useState, useTransition } from "react"
import { DndContext, type DragEndEvent } from "@dnd-kit/core"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { createSlot } from "../actions/slot.actions"
import { ArtistSidebar } from "./ArtistSidebar"
import { StageGrid } from "./StageGrid"
import type { EventWithRelations, SlotWithBooking } from "../actions/event.actions"
import type { Artist } from "@prisma/client"

interface Props {
  event: EventWithRelations
  artists: Artist[]
  initialSlots: SlotWithBooking[]
}

function getDayList(startDate: Date, endDate: Date | null): Date[] {
  const days: Date[] = []
  const end = endDate ?? startDate
  const current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
  while (current <= endUTC) {
    days.push(new Date(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return days
}

export function FestivalPlanner({ event, artists, initialSlots }: Props) {
  const days = getDayList(new Date(event.date), event.endDate ? new Date(event.endDate) : null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [slots, setSlots] = useState<SlotWithBooking[]>(initialSlots)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const assignedArtistIds = new Set<string>(
    slots
      .map((s) => s.booking?.artistId)
      .filter((id): id is string => !!id)
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return

    const artistId = active.data.current?.artistId as string | undefined
    if (!artistId) return

    if (over.data.current?.occupied) return
    if (assignedArtistIds.has(artistId)) return

    // Cell ID format: ${stageId}::${dateStr}::${timeSlot}
    const cellId = over.id as string
    const parts = cellId.split("::")
    if (parts.length !== 3) return
    const [stageId, dateStr, timeSlot] = parts

    const [h, m] = timeSlot.split(":").map(Number)
    const startDate = new Date(`${dateStr}T00:00:00Z`)
    startDate.setUTCHours(h, m, 0, 0)
    const endDate = new Date(startDate.getTime() + event.gridInterval * 60 * 1000)

    const tempId = `temp-${Date.now()}`
    const artist = artists.find((a) => a.id === artistId)
    if (!artist) return

    const tempSlot = {
      id: tempId,
      stageId,
      startTime: startDate,
      endTime: endDate,
      bookingId: null,
      booking: {
        id: "temp",
        artistId,
        projectId: null,
        venueId: event.venueId,
        date: new Date(event.date),
        status: "ERSTKONTAKT" as const,
        contactPerson: null,
        tourId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        artist,
        project: null,
      },
    } as SlotWithBooking

    const snapshot = slots
    setSlots((prev) => [...prev, tempSlot])
    setError(null)

    startTransition(async () => {
      const result = await createSlot({
        eventId: event.id,
        stageId,
        artistId,
        startTimeISO: startDate.toISOString(),
        endTimeISO: endDate.toISOString(),
      })

      if (!result.success || !result.slot) {
        setSlots(snapshot)
        setError(result.message ?? "Slot konnte nicht gespeichert werden.")
      } else {
        setSlots((prev) => prev.map((s) => (s.id === tempId ? result.slot! : s)))
      }
    })
  }

  function handleDeleteSlot(slotId: string) {
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
  }

  function handleUpdateSlot(slotId: string, startISO: string, endISO: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId ? { ...s, startTime: new Date(startISO), endTime: new Date(endISO) } : s
      )
    )
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {days.length > 1 && (
        <div className="flex gap-1 mb-4 print:hidden">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={cn(
                "h-9 px-4 rounded-md text-sm font-medium transition-colors",
                i === selectedDay
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              )}
            >
              {format(day, "EEE d. MMM", { locale: de })}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <ArtistSidebar artists={artists} assignedArtistIds={assignedArtistIds} />
        <div className="flex-1 overflow-x-auto">
          <StageGrid
            event={event}
            slots={slots}
            selectedDate={days[selectedDay]}
            onDeleteSlot={handleDeleteSlot}
            onUpdateSlot={handleUpdateSlot}
          />
        </div>
      </div>
      <div className="mt-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="h-9 px-4 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Drucken
        </button>
      </div>
    </DndContext>
  )
}
