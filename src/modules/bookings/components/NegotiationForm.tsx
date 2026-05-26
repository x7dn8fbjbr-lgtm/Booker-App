// src/modules/bookings/components/NegotiationForm.tsx
"use client"

import { useActionState } from "react"
import type { NegotiationFormState } from "../actions/negotiation.actions"
import type { NegotiationDetail } from "@prisma/client"

interface Props {
  action: (
    prevState: NegotiationFormState,
    formData: FormData
  ) => Promise<NegotiationFormState>
  negotiation: NegotiationDetail | null
}

const initialState: NegotiationFormState = {}

export function NegotiationForm({ action, negotiation }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state.message && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div className="flex gap-4">
        {/* Fee */}
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="fee" className="text-sm font-medium text-slate-700">
            Gage (€)
          </label>
          <input
            id="fee"
            name="fee"
            type="number"
            step="0.01"
            min="0"
            defaultValue={negotiation?.fee ?? ""}
            placeholder="0.00"
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {state.errors?.fee && (
            <p className="text-xs text-red-600">{state.errors.fee[0]}</p>
          )}
        </div>

        {/* Currency */}
        <div className="flex flex-col gap-1.5 w-28">
          <label htmlFor="currency" className="text-sm font-medium text-slate-700">
            Währung
          </label>
          <input
            id="currency"
            name="currency"
            type="text"
            defaultValue={negotiation?.currency ?? "EUR"}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Travel costs */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="travelCosts" className="text-sm font-medium text-slate-700">
          Fahrtkosten (€)
        </label>
        <input
          id="travelCosts"
          name="travelCosts"
          type="number"
          step="0.01"
          min="0"
          defaultValue={negotiation?.travelCosts ?? ""}
          placeholder="0.00"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {state.errors?.travelCosts && (
          <p className="text-xs text-red-600">{state.errors.travelCosts[0]}</p>
        )}
      </div>

      {/* Accommodation */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="accommodation" className="text-sm font-medium text-slate-700">
          Übernachtungskosten (€)
        </label>
        <input
          id="accommodation"
          name="accommodation"
          type="number"
          step="0.01"
          min="0"
          defaultValue={negotiation?.accommodation ?? ""}
          placeholder="0.00"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {state.errors?.accommodation && (
          <p className="text-xs text-red-600">{state.errors.accommodation[0]}</p>
        )}
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Sonstige Konditionen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={negotiation?.notes ?? ""}
          placeholder="z. B. Backline, Catering, besondere Vereinbarungen …"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Speichern …" : "Speichern"}
        </button>
      </div>
    </form>
  )
}
