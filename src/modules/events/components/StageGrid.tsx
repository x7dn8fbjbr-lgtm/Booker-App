// src/modules/events/components/StageGrid.tsx
"use client"

import { useDroppable } from "@dnd-kit/core"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { SlotCard } from "./SlotCard"
import type { EventWithRelations, SlotWithBooking } from "../actions/event.actions"

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateTimeSlots(startTime: string, endTime: string, intervalMin: number): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(":").map(Number)
  const [endH, endM] = endTime.split(":").map(Number)
  let current = startH * 60 + startM
  const end = endH * 60 + endM
  while (current < end) {
    slots.push(
      `${Math.floor(current / 60).toString().padStart(2, "0")}:${(current % 60).toString().padStart(2, "0")}`
    )
    current += intervalMin
  }
  return slots
}

export function findConflictIds(slots: SlotWithBooking[]): Set<string> {
  const conflictIds = new Set<string>()
  const byArtist = new Map<string, SlotWithBooking[]>()

  for (const slot of slots) {
    const artistId = slot.booking?.artistId
    if (!artistId) continue
    const list = byArtist.get(artistId) ?? []
    list.push(slot)
    byArtist.set(artistId, list)
  }

  for (const list of byArtist.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j]
        if (
          new Date(a.startTime) < new Date(b.endTime) &&
          new Date(b.startTime) < new Date(a.endTime)
        ) {
          conflictIds.add(a.id)
          conflictIds.add(b.id)
        }
      }
    }
  }

  return conflictIds
}

function getSpanCount(slot: SlotWithBooking, intervalMin: number): number {
  const ms = new Date(slot.endTime).getTime() - new Date(slot.startTime).getTime()
  return Math.max(1, Math.round(ms / (intervalMin * 60 * 1000)))
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  event: EventWithRelations
  slots: SlotWithBooking[]
  onDeleteSlot: (slotId: string) => void
  onUpdateSlot: (slotId: string, startISO: string, endISO: string) => void
}

export function StageGrid({ event, slots, onDeleteSlot, onUpdateSlot }: Props) {
  const timeSlots = generateTimeSlots(event.startTime, event.endTime, event.gridInterval)
  const conflictIds = findConflictIds(slots)

  const coveredCells = new Set<string>()
  for (const slot of slots) {
    const startStr = format(new Date(slot.startTime), "HH:mm")
    const startIdx = timeSlots.indexOf(startStr)
    const span = getSpanCount(slot, event.gridInterval)
    for (let i = 1; i < span; i++) {
      if (startIdx + i < timeSlots.length) {
        coveredCells.add(`${slot.stageId}::${timeSlots[startIdx + i]}`)
      }
    }
  }

  const slotByCell = new Map<string, SlotWithBooking>()
  for (const slot of slots) {
    const startStr = format(new Date(slot.startTime), "HH:mm")
    slotByCell.set(`${slot.stageId}::${startStr}`, slot)
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table
        className="border-collapse"
        style={{ minWidth: `${event.stages.length * 160 + 64}px` }}
      >
        <thead>
          <tr>
            <th className="w-16 p-2" />
            {event.stages.map((stage) => (
              <th
                key={stage.id}
                className="px-3 py-2 text-sm font-semibold text-white text-center"
                style={{ backgroundColor: stage.color, minWidth: "160px" }}
              >
                {stage.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((timeSlot) => (
            <tr key={timeSlot}>
              <td className="w-16 pr-2 text-right text-xs text-slate-400 whitespace-nowrap align-top pt-1.5 border-t border-slate-100">
                {timeSlot}
              </td>
              {event.stages.map((stage) => {
                const cellId = `${stage.id}::${timeSlot}`
                if (coveredCells.has(cellId)) return null

                const slot = slotByCell.get(cellId)
                const span = slot ? getSpanCount(slot, event.gridInterval) : 1

                return (
                  <GridCell
                    key={cellId}
                    cellId={cellId}
                    slot={slot}
                    stageColor={stage.color}
                    rowSpan={span}
                    timeSlots={timeSlots}
                    isConflict={slot ? conflictIds.has(slot.id) : false}
                    eventDate={new Date(event.date)}
                    onDeleteSlot={onDeleteSlot}
                    onUpdateSlot={onUpdateSlot}
                  />
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Grid Cell ────────────────────────────────────────────────────────────────

interface CellProps {
  cellId: string
  slot?: SlotWithBooking
  stageColor: string
  rowSpan: number
  timeSlots: string[]
  isConflict: boolean
  eventDate: Date
  onDeleteSlot: (slotId: string) => void
  onUpdateSlot: (slotId: string, startISO: string, endISO: string) => void
}

function GridCell({
  cellId,
  slot,
  stageColor,
  rowSpan,
  timeSlots,
  isConflict,
  eventDate,
  onDeleteSlot,
  onUpdateSlot,
}: CellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { occupied: !!slot },
  })

  return (
    <td
      ref={setNodeRef}
      rowSpan={rowSpan}
      className={cn(
        "border border-slate-100 p-1 align-top",
        "transition-colors",
        isOver && !slot && "bg-indigo-50 ring-1 ring-inset ring-indigo-400",
        isOver && slot && "bg-red-50",
        !isOver && "bg-white"
      )}
      style={{ height: `${rowSpan * 40}px`, minWidth: "160px", verticalAlign: "top" }}
    >
      {slot ? (
        <SlotCard
          slot={slot}
          stageColor={stageColor}
          timeSlots={timeSlots}
          isConflict={isConflict}
          eventDate={eventDate}
          onDelete={onDeleteSlot}
          onUpdate={onUpdateSlot}
        />
      ) : (
        isOver && (
          <div className="flex items-center justify-center h-full text-indigo-400 text-xl pointer-events-none">
            +
          </div>
        )
      )}
    </td>
  )
}
