// src/app/(dashboard)/tours/[id]/ical/route.ts
import { NextResponse } from "next/server"
import { format } from "date-fns"
import { getTourById } from "@/modules/tours/actions/tour.actions"

function toICalDate(date: Date): string {
  return format(date, "yyyyMMdd")
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const tour = await getTourById(id)
  if (!tour) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const events = tour.bookings.map((booking) => {
    const dateStr = toICalDate(new Date(booking.date))
    const summary = escapeICalText(`${tour.artist.name} @ ${booking.venue.name}`)
    const description = escapeICalText(booking.status)
    return [
      "BEGIN:VEVENT",
      `UID:${booking.id}@booker-app`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    ].join("\r\n")
  })

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booker App//Tour Export//DE",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeICalText(tour.name)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n")

  const filename = `${tour.name.replace(/[^a-z0-9]/gi, "_")}.ics`

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
