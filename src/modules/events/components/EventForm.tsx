// src/modules/events/components/EventForm.tsx
"use client"

import { useActionState, useState } from "react"
import type { EventFormState } from "../actions/event.actions"
import type { Venue } from "@prisma/client"

interface StageInput {
  name: string
  color: string
  order: number
}

interface Props {
  action: (prevState: EventFormState, formData: FormData) => Promise<EventFormState>
  venues: Venue[]
  defaultValues?: {
    name?: string
    venueId?: string
    date?: string
    gridInterval?: number
    startTime?: string
    endTime?: string
  }
  showStages?: boolean
  deleteAction?: () => Promise<void>
}

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 Minuten" },
  { value: 30, label: "30 Minuten" },
  { value: 60, label: "60 Minuten" },
]

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`)

export function EventForm({ action, venues, defaultValues, showStages = true, deleteAction }: Props) {
  const [state, formAction, isPending] = useActionState(action, {})
  const [stages, setStages] = useState<StageInput[]>(
    showStages ? [{ name: "", color: "#6366f1", order: 0 }] : []
  )

  function addStage() {
    setStages((prev) => [...prev, { name: "", color: "#6366f1", order: prev.length }])
  }

  function removeStage(i: number) {
    setStages((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateStage(i: number, field: keyof StageInput, value: string | number) {
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  const inputCls =
    "h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <form action={formAction} className="flex flex-col gap-6">
        {showStages && (
          <input type="hidden" name="stagesJson" value={JSON.stringify(stages)} />
        )}

        {state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Name *</label>
          <input name="name" defaultValue={defaultValues?.name} className={inputCls} />
          {state.errors?.name && (
            <p className="text-xs text-red-600">{state.errors.name[0]}</p>
          )}
        </div>

        {/* Venue */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Venue *</label>
          <select name="venueId" defaultValue={defaultValues?.venueId ?? ""} className={inputCls}>
            <option value="">Venue wählen…</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.city ? ` (${v.city})` : ""}
              </option>
            ))}
          </select>
          {state.errors?.venueId && (
            <p className="text-xs text-red-600">{state.errors.venueId[0]}</p>
          )}
        </div>

        {/* Datum */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Datum *</label>
          <input
            type="date"
            name="date"
            defaultValue={defaultValues?.date}
            className={inputCls}
          />
          {state.errors?.date && (
            <p className="text-xs text-red-600">{state.errors.date[0]}</p>
          )}
        </div>

        {/* Raster-Einstellungen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Raster</label>
            <select
              name="gridInterval"
              defaultValue={defaultValues?.gridInterval ?? 30}
              className={inputCls}
            >
              {INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Startzeit</label>
            <select
              name="startTime"
              defaultValue={defaultValues?.startTime ?? "14:00"}
              className={inputCls}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Endzeit</label>
            <select
              name="endTime"
              defaultValue={defaultValues?.endTime ?? "22:00"}
              className={inputCls}
            >
              {HOUR_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
            {state.errors?.endTime && (
              <p className="text-xs text-red-600">{state.errors.endTime[0]}</p>
            )}
          </div>
        </div>

        {/* Stages */}
        {showStages && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Bühnen *</label>
              <button
                type="button"
                onClick={addStage}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                + Bühne hinzufügen
              </button>
            </div>
            {state.errors?.stages && (
              <p className="text-xs text-red-600">{state.errors.stages[0]}</p>
            )}
            {stages.map((stage, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-md border border-slate-200 p-3"
              >
                <input
                  placeholder="Name der Bühne"
                  value={stage.name}
                  onChange={(e) => updateStage(i, "name", e.target.value)}
                  className="flex-1 h-8 rounded border border-slate-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => updateStage(i, "color", e.target.value)}
                  className="h-8 w-10 rounded border border-slate-300 cursor-pointer"
                  title="Farbe"
                />
                <input
                  type="number"
                  placeholder="0"
                  value={stage.order}
                  onChange={(e) => updateStage(i, "order", parseInt(e.target.value, 10) || 0)}
                  className="w-16 h-8 rounded border border-slate-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  title="Reihenfolge"
                />
                {stages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStage(i)}
                    className="text-red-500 hover:text-red-700 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="self-start h-9 px-4 rounded-md bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {isPending ? "Speichern…" : "Speichern"}
        </button>
      </form>

      {deleteAction && (
        <div className="mt-4 rounded-md border border-red-200 p-4">
          <h3 className="text-sm font-medium text-red-700 mb-3">Gefahrenzone</h3>
          <form action={deleteAction}>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-red-600 text-sm text-white font-medium hover:bg-red-700 transition-colors"
            >
              Event löschen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
