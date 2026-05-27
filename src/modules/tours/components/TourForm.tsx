// src/modules/tours/components/TourForm.tsx
"use client"

import { useActionState } from "react"
import type { TourFormState } from "../actions/tour.actions"
import type { Artist } from "@prisma/client"

interface Props {
  action: (prevState: TourFormState, formData: FormData) => Promise<TourFormState>
  artists: Artist[]
  defaultValues?: {
    name?: string
    artistId?: string
    startDate?: string
    endDate?: string
  }
  deleteAction?: () => Promise<void>
}

const inputCls =
  "h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

export function TourForm({ action, artists, defaultValues, deleteAction }: Props) {
  const [state, formAction, isPending] = useActionState(action, {})

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <form action={formAction} className="flex flex-col gap-6">
        {state.message && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-slate-700">
            Name *
          </label>
          <input
            id="name"
            name="name"
            defaultValue={defaultValues?.name}
            className={inputCls}
          />
          {state.errors?.name && (
            <p className="text-xs text-red-600">{state.errors.name[0]}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="artistId" className="text-sm font-medium text-slate-700">
            Artist *
          </label>
          <select
            id="artistId"
            name="artistId"
            defaultValue={defaultValues?.artistId ?? ""}
            className={inputCls}
          >
            <option value="">Artist wählen…</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          {state.errors?.artistId && (
            <p className="text-xs text-red-600">{state.errors.artistId[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-sm font-medium text-slate-700">
              Startdatum *
            </label>
            <input
              id="startDate"
              type="date"
              name="startDate"
              defaultValue={defaultValues?.startDate}
              className={inputCls}
            />
            {state.errors?.startDate && (
              <p className="text-xs text-red-600">{state.errors.startDate[0]}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endDate" className="text-sm font-medium text-slate-700">
              Enddatum *
            </label>
            <input
              id="endDate"
              type="date"
              name="endDate"
              defaultValue={defaultValues?.endDate}
              className={inputCls}
            />
            {state.errors?.endDate && (
              <p className="text-xs text-red-600">{state.errors.endDate[0]}</p>
            )}
          </div>
        </div>

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
              Tour löschen
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
