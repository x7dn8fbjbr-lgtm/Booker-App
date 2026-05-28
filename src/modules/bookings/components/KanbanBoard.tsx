// src/modules/bookings/components/KanbanBoard.tsx
"use client"

import { useState, useTransition } from "react"
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { BookingStatus } from "@prisma/client"
import { cn } from "@/lib/utils"
import { BookingCard } from "./BookingCard"
import { updateBookingStatus } from "../actions/booking.actions"
import type { BookingWithRelations } from "../actions/booking.actions"

const COLUMNS: { status: BookingStatus; label: string }[] = [
  { status: BookingStatus.ERSTKONTAKT, label: "Erstkontakt" },
  { status: BookingStatus.IN_VERHANDLUNG, label: "In Verhandlung" },
  { status: BookingStatus.BESTAETIGT, label: "Bestätigt" },
  { status: BookingStatus.ABGESAGT, label: "Abgesagt" },
]

interface Props {
  initialBookings: BookingWithRelations[]
}

export function KanbanBoard({ initialBookings }: Props) {
  const [bookings, setBookings] = useState(initialBookings)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const bookingId = active.id as string
    const newStatus = over.id as BookingStatus

    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking || booking.status === newStatus) return

    const snapshot = bookings

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    )
    setError(null)

    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, newStatus)
      if (!result.success) {
        setBookings(snapshot)
        setError(result.message ?? "Statusänderung fehlgeschlagen.")
      }
    })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            bookings={bookings.filter((b) => b.status === col.status)}
          />
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({
  status,
  label,
  bookings,
}: {
  status: BookingStatus
  label: string
  bookings: BookingWithRelations[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-lg p-3 min-h-48 transition-colors",
        status === BookingStatus.ABGESAGT ? "bg-slate-100" : "bg-slate-50",
        isOver && "ring-2 ring-inset ring-indigo-400"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 border border-slate-200">
          {bookings.length}
        </span>
      </div>
      {bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  )
}
