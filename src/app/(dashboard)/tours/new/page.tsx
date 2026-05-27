// src/app/(dashboard)/tours/new/page.tsx
import Link from "next/link"
import { db } from "@/lib/db"
import { createTour } from "@/modules/tours/actions/tour.actions"
import { TourForm } from "@/modules/tours/components/TourForm"

export const metadata = { title: "Neue Tour – Booker App" }

export default async function NewTourPage() {
  const artists = await db.artist.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/tours" className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Touren
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Neue Tour</h2>
      </div>

      <TourForm action={createTour} artists={artists} />
    </div>
  )
}
