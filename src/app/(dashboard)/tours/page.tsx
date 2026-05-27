// src/app/(dashboard)/tours/page.tsx
import Link from "next/link"
import { getTours } from "@/modules/tours/actions/tour.actions"
import { TourCard } from "@/modules/tours/components/TourCard"

export const metadata = { title: "Touren – Booker App" }

export default async function ToursPage() {
  const tours = await getTours()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Touren</h2>
        <Link
          href="/tours/new"
          className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          Tour anlegen
        </Link>
      </div>

      {tours.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <p className="text-sm">Noch keine Touren angelegt.</p>
          <Link href="/tours/new" className="mt-2 text-sm text-indigo-600 hover:underline">
            Erste Tour anlegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  )
}
