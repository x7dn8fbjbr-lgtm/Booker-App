// src/modules/bookings/components/BookingCard.tsx
"use client"

import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { BookingWithRelations } from "../actions/booking.actions"

interface Props {
  booking: BookingWithRelations
}

export function BookingCard({ booking }: Props) {
  const router = useRouter()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: booking.id,
    data: { status: booking.status },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) {
          router.push(`/bookings/${booking.id}`)
        }
      }}
      className={cn(
        "rounded-md border border-slate-200 bg-white p-3 shadow-sm",
        "cursor-grab active:cursor-grabbing select-none",
        "flex flex-col gap-1.5"
      )}
    >
      <p className="text-sm font-medium text-slate-900 truncate">
        {booking.artist.name}
      </p>
      <p className="text-xs text-slate-500 truncate">
        {booking.venue.name}
        {booking.venue.city ? ` · ${booking.venue.city}` : ""}
      </p>
      <p className="text-xs text-slate-400">
        {format(new Date(booking.date), "d. MMM yyyy", { locale: de })}
      </p>
      {booking.project && (
        <span className="inline-block self-start rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
          {booking.project.name}
        </span>
      )}
    </div>
  )
}
