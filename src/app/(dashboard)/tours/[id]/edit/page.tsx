// src/app/(dashboard)/tours/[id]/edit/page.tsx
import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { db } from "@/lib/db"
import {
  getTourById,
  updateTour,
  deleteTour,
} from "@/modules/tours/actions/tour.actions"
import { TourForm } from "@/modules/tours/components/TourForm"

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const tour = await getTourById(id)
  return { title: tour ? `${tour.name} bearbeiten – Booker App` : "Tour bearbeiten – Booker App" }
}

export default async function EditTourPage({ params }: Props) {
  const { id } = await params
  const [tour, artists] = await Promise.all([
    getTourById(id),
    db.artist.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!tour) notFound()

  const boundUpdate = updateTour.bind(null, id)
  const boundDelete = deleteTour.bind(null, id)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/tours/${id}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 inline-block">
          ← Tour
        </Link>
        <h2 className="text-xl font-semibold text-slate-900">Tour bearbeiten</h2>
      </div>

      <TourForm
        action={boundUpdate}
        artists={artists}
        defaultValues={{
          name: tour.name,
          artistId: tour.artistId,
          startDate: format(new Date(tour.startDate), "yyyy-MM-dd"),
          endDate: format(new Date(tour.endDate), "yyyy-MM-dd"),
        }}
        deleteAction={boundDelete}
      />
    </div>
  )
}
