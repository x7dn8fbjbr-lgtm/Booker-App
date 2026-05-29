import Link from "next/link"
import { Suspense } from "react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { db } from "@/lib/db"
import { BookingStatus } from "@prisma/client"

export const revalidate = 3600

const quickLinks = [
  { label: "Artist anlegen", href: "/artists/new", description: "Neuen Künstler in die Datenbank aufnehmen" },
  { label: "Venue anlegen", href: "/venues/new", description: "Neue Spielstätte hinzufügen" },
  { label: "Booking anlegen", href: "/bookings/new", description: "Neuen Buchungsvorgang starten" },
]

async function Stats() {
  const now = new Date()
  const [artistCount, venueCount, openBookingCount, confirmedBookingCount] = await Promise.all([
    db.artist.count(),
    db.venue.count(),
    db.booking.count({
      where: { status: { in: [BookingStatus.ERSTKONTAKT, BookingStatus.IN_VERHANDLUNG] } },
    }),
    db.booking.count({ where: { status: BookingStatus.BESTAETIGT } }),
  ])

  const stats = [
    {
      label: "Artists",
      value: artistCount,
      href: "/artists",
      color: "bg-indigo-50 text-indigo-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: "Venues",
      value: venueCount,
      href: "/venues",
      color: "bg-violet-50 text-violet-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      label: "Offene Bookings",
      value: openBookingCount,
      href: "/bookings",
      color: "bg-amber-50 text-amber-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: "Bestätigte Bookings",
      value: confirmedBookingCount,
      href: "/bookings",
      color: "bg-green-50 text-green-600",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} href={stat.href}>
          <Card className="transition-shadow hover:shadow-md">
            <CardContent className="py-4">
              <div className={`mb-3 inline-flex items-center justify-center rounded-lg p-2 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 rounded-lg bg-slate-100" />
      ))}
    </div>
  )
}

async function UpcomingBookings() {
  const now = new Date()
  const bookings = await db.booking.findMany({
    where: { status: BookingStatus.BESTAETIGT, date: { gte: now } },
    orderBy: { date: "asc" },
    take: 5,
    include: { artist: true, venue: true },
  })

  if (bookings.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-700">Nächste Bookings</h3>
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/bookings/${booking.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="w-14 shrink-0 text-center">
              <p className="text-xs font-medium uppercase text-slate-400">
                {format(new Date(booking.date), "MMM", { locale: de })}
              </p>
              <p className="text-xl font-bold leading-none text-slate-900">
                {format(new Date(booking.date), "d")}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{booking.artist.name}</p>
              <p className="truncate text-xs text-slate-500">
                {booking.venue.city
                  ? `${booking.venue.name}, ${booking.venue.city}`
                  : booking.venue.name}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0 text-slate-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

function UpcomingBookingsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 h-4 w-32 rounded bg-slate-200" />
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <div className="w-14 shrink-0">
              <div className="h-3 w-8 rounded bg-slate-100 mx-auto mb-1" />
              <div className="h-6 w-6 rounded bg-slate-200 mx-auto" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 rounded bg-slate-200" />
              <div className="h-3 w-28 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Übersicht</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Willkommen zurück. Hier siehst du den aktuellen Stand deiner Bookings.
        </p>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense fallback={<UpcomingBookingsSkeleton />}>
        <UpcomingBookings />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{link.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
