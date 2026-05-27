import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { db } from "@/lib/db"
import { BookingStatus } from "@prisma/client"

const quickLinks = [
  { label: "Artist anlegen", href: "/artists/new", description: "Neuen Künstler in die Datenbank aufnehmen" },
  { label: "Venue anlegen", href: "/venues/new", description: "Neue Spielstätte hinzufügen" },
  { label: "Booking anlegen", href: "/bookings/new", description: "Neuen Buchungsvorgang starten" },
]

export default async function DashboardPage() {
  const [artistCount, venueCount, openBookingCount, confirmedBookingCount] = await Promise.all([
    db.artist.count(),
    db.venue.count(),
    db.booking.count({
      where: { status: { in: [BookingStatus.ERSTKONTAKT, BookingStatus.IN_VERHANDLUNG] } },
    }),
    db.booking.count({ where: { status: BookingStatus.BESTAETIGT } }),
  ])

  const stats = [
    { label: "Artists", value: artistCount, href: "/artists" },
    { label: "Venues", value: venueCount, href: "/venues" },
    { label: "Offene Bookings", value: openBookingCount, href: "/bookings" },
    { label: "Bestätigte Bookings", value: confirmedBookingCount, href: "/bookings" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Übersicht</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Willkommen zurück. Hier siehst du den aktuellen Stand deiner Bookings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="py-4">
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

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
