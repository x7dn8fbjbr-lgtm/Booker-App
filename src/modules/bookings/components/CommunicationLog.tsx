// src/modules/bookings/components/CommunicationLog.tsx
"use client"

import { useState } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { deleteLog } from "../actions/log.actions"
import type { CommunicationLog as CommunicationLogType } from "@prisma/client"

interface Props {
  bookingId: string
  logs: CommunicationLogType[]
}

export function CommunicationLog({ bookingId, logs }: Props) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const allTags = [...new Set(logs.flatMap((l) => l.tags))].sort()

  const filteredLogs =
    selectedTags.length === 0
      ? logs
      : logs.filter((l) => selectedTags.some((t) => l.tags.includes(t)))

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedTags.includes(tag)
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className="rounded-full px-3 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Log entries */}
      {filteredLogs.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">
          {logs.length === 0
            ? "Noch keine Einträge."
            : "Keine Einträge für den gewählten Filter."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredLogs.map((log) => {
            const boundDelete = deleteLog.bind(null, log.id, bookingId)
            return (
              <div
                key={log.id}
                className="rounded-md border border-slate-200 bg-white p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-slate-400">
                      {format(new Date(log.createdAt), "d. MMM yyyy, HH:mm", {
                        locale: de,
                      })}
                      {log.contactPerson ? ` · ${log.contactPerson}` : ""}
                    </span>
                  </div>
                  <form action={boundDelete}>
                    <button
                      type="submit"
                      className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                    >
                      Löschen
                    </button>
                  </form>
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{log.body}</p>
                {log.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {log.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
