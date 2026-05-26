// src/modules/bookings/components/BookingForm.tsx
"use client"

import { useActionState, useState, useTransition } from "react"
import { BookingStatus } from "@prisma/client"
import { getProjectsByArtist } from "../actions/booking.actions"
import type { BookingFormState } from "../actions/booking.actions"
import type { Artist, Venue, Project } from "@prisma/client"

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "ERSTKONTAKT", label: "Erstkontakt" },
  { value: "IN_VERHANDLUNG", label: "In Verhandlung" },
  { value: "BESTAETIGT", label: "Bestätigt" },
  { value: "ABGESAGT", label: "Abgesagt" },
]

interface Props {
  action: (prevState: BookingFormState, formData: FormData) => Promise<BookingFormState>
  artists: Artist[]
  venues: Venue[]
  defaultValues?: {
    artistId?: string
    projectId?: string
    venueId?: string
    date?: string
    time?: string
    status?: BookingStatus
    contactPerson?: string
  }
  initialProjects?: Project[]
  deleteAction?: () => Promise<void>
}

const initialState: BookingFormState = {}

export function BookingForm({
  action,
  artists,
  venues,
  defaultValues,
  initialProjects = [],
  deleteAction,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, initialState)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedArtistId, setSelectedArtistId] = useState(
    defaultValues?.artistId ?? ""
  )
  const [, startProjectTransition] = useTransition()

  function handleArtistChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const artistId = e.target.value
    setSelectedArtistId(artistId)
    if (!artistId) {
      setProjects([])
      return
    }
    startProjectTransition(async () => {
      const ps = await getProjectsByArtist(artistId)
      setProjects(ps)
    })
  }

  const defaultDate = defaultValues?.date ?? ""
  const defaultTime = defaultValues?.time ?? ""

  return (
    <form action={formAction} className="flex flex-col gap-5 max-w-lg">
      {state.message && (
        <p className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      {/* Artist */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="artistId" className="text-sm font-medium text-slate-700">
          Artist <span className="text-red-500">*</span>
        </label>
        <select
          id="artistId"
          name="artistId"
          value={selectedArtistId}
          onChange={handleArtistChange}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Artist wählen —</option>
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

      {/* Project */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="projectId" className="text-sm font-medium text-slate-700">
          Projekt
        </label>
        <select
          id="projectId"
          name="projectId"
          defaultValue={defaultValues?.projectId ?? ""}
          disabled={!selectedArtistId || projects.length === 0}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">— kein Projekt —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Venue */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="venueId" className="text-sm font-medium text-slate-700">
          Venue <span className="text-red-500">*</span>
        </label>
        <select
          id="venueId"
          name="venueId"
          defaultValue={defaultValues?.venueId ?? ""}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Venue wählen —</option>
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

      {/* Date + Time */}
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <label htmlFor="date" className="text-sm font-medium text-slate-700">
            Datum <span className="text-red-500">*</span>
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={defaultDate}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {state.errors?.date && (
            <p className="text-xs text-red-600">{state.errors.date[0]}</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5 w-32">
          <label htmlFor="time" className="text-sm font-medium text-slate-700">
            Uhrzeit
          </label>
          <input
            id="time"
            name="time"
            type="time"
            defaultValue={defaultTime}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className="text-sm font-medium text-slate-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={defaultValues?.status ?? "ERSTKONTAKT"}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Contact person */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contactPerson" className="text-sm font-medium text-slate-700">
          Ansprechpartner
        </label>
        <input
          id="contactPerson"
          name="contactPerson"
          type="text"
          defaultValue={defaultValues?.contactPerson ?? ""}
          placeholder="z. B. Max Mustermann"
          className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Speichern …" : "Speichern"}
        </button>
      </div>

      {/* Danger zone */}
      {deleteAction && (
        <div className="mt-8 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800 mb-3">Gefahrenzone</p>
          <form action={deleteAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center rounded-md border border-red-300 bg-white px-4 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              Booking löschen
            </button>
          </form>
        </div>
      )}
    </form>
  )
}
