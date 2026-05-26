// src/modules/bookings/components/LogForm.tsx
"use client"

import { useActionState } from "react"
import type { LogFormState } from "../actions/log.actions"

interface Props {
  action: (prevState: LogFormState, formData: FormData) => Promise<LogFormState>
}

const initialState: LogFormState = {}

export function LogForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState)

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4"
    >
      <p className="text-sm font-medium text-slate-700">Neuer Eintrag</p>

      {state.message && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Body */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-sm font-medium text-slate-700">
          Nachricht <span className="text-red-500">*</span>
        </label>
        <textarea
          id="body"
          name="body"
          rows={3}
          required
          placeholder="Was wurde besprochen?"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        {state.errors?.body && (
          <p className="text-xs text-red-600">{state.errors.body[0]}</p>
        )}
      </div>

      {/* Contact person */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="logContactPerson" className="text-sm font-medium text-slate-700">
          Kontaktperson
        </label>
        <input
          id="logContactPerson"
          name="contactPerson"
          type="text"
          placeholder="z. B. Max Mustermann"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tags" className="text-sm font-medium text-slate-700">
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          type="text"
          placeholder="wichtig, vertrag, angebot (kommagetrennt)"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Speichern …" : "Eintrag hinzufügen"}
        </button>
      </div>
    </form>
  )
}
