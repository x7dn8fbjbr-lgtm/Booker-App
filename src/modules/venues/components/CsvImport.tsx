"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { VenueType } from "@prisma/client"
import { Button } from "@/components/ui/Button"
import { importVenues, type ImportRow } from "@/modules/venues/actions/venue.actions"

type ParsedRow = {
  name: string
  street: string
  type: VenueType
  valid: boolean
}

const CATEGORY_MAP: Record<string, VenueType> = {
  club: VenueType.CLUB,
  theater: VenueType.THEATER,
  festival: VenueType.FESTIVAL,
  "open air": VenueType.OPEN_AIR,
}

const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  CLUB: "Club",
  THEATER: "Theater",
  FESTIVAL: "Festival",
  OPEN_AIR: "Open Air",
  SONSTIGE: "Sonstige",
}

function mapCategory(raw: string): VenueType {
  return CATEGORY_MAP[raw.toLowerCase().trim()] ?? VenueType.SONSTIGE
}

function parseCsv(text: string, delimiter: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase())
  const nameIdx = headers.indexOf("name")
  const kategorieIdx = headers.indexOf("kategorie")
  const adresseIdx = headers.indexOf("adresse")

  if (nameIdx === -1) return []

  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter)
    const name = (cells[nameIdx] ?? "").replace(/^"|"$/g, "").trim()
    return {
      name,
      street: (cells[adresseIdx] ?? "").replace(/^"|"$/g, "").trim(),
      type: mapCategory(cells[kategorieIdx] ?? ""),
      valid: name.length > 0,
    }
  })
}

export function CsvImport() {
  const router = useRouter()
  const [delimiter, setDelimiter] = useState<string>(";")
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const parsed = parseCsv(text, delimiter)
      if (parsed.length === 0) {
        setParseError(
          "Keine Daten gefunden. Prüfe das Trennzeichen und ob die Spalte 'Name' vorhanden ist."
        )
        setRows(null)
      } else {
        setRows(parsed)
      }
    }
    reader.readAsText(file, "utf-8")
  }

  function handleImport() {
    if (!rows) return
    const validRows: ImportRow[] = rows
      .filter((r) => r.valid)
      .map((r) => ({ name: r.name, street: r.street || undefined, type: r.type }))

    startTransition(async () => {
      await importVenues(validRows)
      router.push("/venues")
      router.refresh()
    })
  }

  const validCount = rows?.filter((r) => r.valid).length ?? 0

  if (!rows) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Trennzeichen</span>
          <div className="flex gap-4">
            {[
              { label: "Semikolon (;)", value: ";" },
              { label: "Komma (,)", value: "," },
              { label: "Tab", value: "\t" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer"
              >
                <input
                  type="radio"
                  name="delimiter"
                  value={opt.value}
                  checked={delimiter === opt.value}
                  onChange={() => setDelimiter(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 text-center">
          <p className="text-sm text-slate-500 mb-4">
            Erwartete Spalten: <code className="text-xs bg-slate-100 px-1 rounded">Name, Bewertung, Anzahl_Bewertungen, Kategorie, Adresse, Preis, Status</code>
          </p>
          <label className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer">
            Datei auswählen
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {parseError && (
          <p className="text-sm text-red-600">{parseError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <span className="font-medium">{rows.length}</span> Zeilen gelesen ·{" "}
          <span className="font-medium text-indigo-600">{validCount}</span> werden importiert ·{" "}
          <span className="font-medium text-red-500">{rows.length - validCount}</span> übersprungen
        </p>
        <button
          onClick={() => setRows(null)}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Neue Datei wählen
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Name</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Straße</th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-600">Typ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-slate-100 last:border-0 ${
                  !row.valid ? "bg-red-50" : ""
                }`}
              >
                <td className="px-4 py-2.5 text-slate-900">
                  {row.name || (
                    <span className="text-red-500 italic">kein Name — wird übersprungen</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{row.street || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">
                  {VENUE_TYPE_LABELS[row.type]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setRows(null)}
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          Abbrechen
        </button>
        <Button onClick={handleImport} loading={isPending} disabled={validCount === 0}>
          {validCount} Venues importieren
        </Button>
      </div>
    </div>
  )
}
