// src/app/(dashboard)/events/[id]/edit/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import {
  getEventById,
  updateEvent,
  deleteEvent,
  createStage,
  deleteStage,
} from "@/modules/events/actions/event.actions"
import { EventForm } from "@/modules/events/components/EventForm"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const event = await getEventById(id)
  return { title: event ? `${event.name} bearbeiten – Booker App` : "Event bearbeiten – Booker App" }
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params
  const [event, venues] = await Promise.all([
    getEventById(id),
    db.venue.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!event) notFound()

  const boundUpdate = updateEvent.bind(null, id)
  const boundDelete = deleteEvent.bind(null, id)

  async function addStageAction(formData: FormData) {
    "use server"
    await createStage(id, formData)
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/events/${id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Planer
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Event bearbeiten</h2>
      </div>

      <EventForm
        action={boundUpdate}
        venues={venues}
        showStages={false}
        defaultValues={{
          name: event.name,
          venueId: event.venueId,
          date: format(new Date(event.date), "yyyy-MM-dd"),
          gridInterval: event.gridInterval,
          startTime: event.startTime,
          endTime: event.endTime,
        }}
        deleteAction={boundDelete}
      />

      <div className="max-w-2xl">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Bühnen verwalten</h3>
        <div className="flex flex-col gap-2 mb-4">
          {event.stages.map((stage) => {
            const boundDeleteStage = deleteStage.bind(null, stage.id, id)
            return (
              <div
                key={stage.id}
                className="flex items-center gap-3 rounded-md border border-slate-200 p-3"
              >
                <div
                  className="h-4 w-4 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="flex-1 text-sm font-medium text-slate-900">{stage.name}</span>
                <span className="text-xs text-slate-400">Reihenfolge {stage.order}</span>
                <span className="text-xs text-slate-400">{stage.slots.length} Slots</span>
                <form action={boundDeleteStage}>
                  <button
                    type="submit"
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Löschen
                  </button>
                </form>
              </div>
            )
          })}
          {event.stages.length === 0 && (
            <p className="text-sm text-slate-400">Noch keine Bühnen vorhanden.</p>
          )}
        </div>

        <form action={addStageAction} className="flex gap-3 items-end">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-sm font-medium text-slate-700">Name *</label>
            <input
              name="name"
              placeholder="Bühnenname"
              className="h-9 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Farbe</label>
            <input
              type="color"
              name="color"
              defaultValue="#6366f1"
              className="h-9 w-12 rounded-md border border-slate-300 cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Reihenf.</label>
            <input
              type="number"
              name="order"
              defaultValue={event.stages.length}
              className="h-9 w-20 rounded-md border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="h-9 px-4 rounded-md bg-indigo-600 text-sm text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Hinzufügen
          </button>
        </form>
      </div>
    </div>
  )
}
