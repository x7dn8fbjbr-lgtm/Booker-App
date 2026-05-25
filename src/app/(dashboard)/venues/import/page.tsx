import { CsvImport } from "@/modules/venues/components/CsvImport"

export const metadata = { title: "Venues importieren – Booker App" }

export default function ImportVenuePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">CSV importieren</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Importiere Venues aus einer CSV-Datei. Die Stadt kann nach dem Import manuell ergänzt werden.
        </p>
      </div>
      <CsvImport />
    </div>
  )
}
