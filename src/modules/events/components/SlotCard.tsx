// src/modules/events/components/SlotCard.tsx
"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { updateSlotTimes, deleteSlot } from "../actions/slot.actions"
import type { SlotWithBooking } from "../actions/event.actions"

interface Props {
  slot: SlotWithBooking
  stageColor: string
  timeSlots: string[]
  isConflict: boolean
  eventDate: Date
  onDelete: (slotId: string) => void
  onUpdate: (slotId: string, startISO: string, endISO: string) => void
}

function buildISO(timeStr: string, eventDate: Date): string {
  const [h, m] = timeStr.split(":").map(Number)
  const d = new Date(eventDate)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function SlotCard({ slot, stageColor, timeSlots, isConflict, eventDate, onDelete, onUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [startTime, setStartTime] = useState(format(new Date(slot.startTime), "HH:mm"))
  const [endTime, setEndTime] = useState(format(new Date(slot.endTime), "HH:mm"))
  const [, startTransition] = useTransition()

  const artistName = slot.booking?.artist.name ?? "Unbekannt"

  function handleSave() {
    const startISO = buildISO(startTime, new Date(eventDate))
    const endISO = buildISO(endTime, new Date(eventDate))
    onUpdate(slot.id, startISO, endISO)
    startTransition(async () => {
      await updateSlotTimes(slot.id, startISO, endISO)
    })
    setOpen(false)
  }

  function handleDelete() {
    onDelete(slot.id)
    startTransition(async () => {
      await deleteSlot(slot.id)
    })
  }

  return (
    <div className="relative h-full">
      <div
        onClick={() => setOpen(!open)}
        className={cn(
          "h-full min-h-[36px] rounded p-1.5 cursor-pointer text-xs text-white overflow-hidden select-none",
          isConflict && "ring-2 ring-red-500"
        )}
        style={{ backgroundColor: stageColor }}
      >
        <p className="font-medium truncate leading-tight">{artistName}</p>
        <p className="opacity-80 text-[10px]">
          {format(new Date(slot.startTime), "HH:mm")}–{format(new Date(slot.endTime), "HH:mm")}
        </p>
        {isConflict && (
          <span className="absolute top-0.5 right-1 text-xs" title="Zeitkonflikt">⚠</span>
        )}
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 w-52 rounded-md border border-slate-200 bg-white shadow-lg p-3 flex flex-col gap-2.5 mt-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Von</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-7 rounded border border-slate-300 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">Bis</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-7 rounded border border-slate-300 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {timeSlots.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 h-7 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                Speichern
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-7 rounded border border-red-200 bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors"
              >
                Entfernen
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
