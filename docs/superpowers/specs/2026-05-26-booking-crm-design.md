# Booking-CRM (Phase 3) — Design Spec

**Datum:** 2026-05-26  
**Status:** Approved  
**PRD-Referenz:** US-301, US-302, US-303

---

## Ziel

Booking-CRM mit Kanban-Board (Drag & Drop), vollständigem CRUD, Verhandlungsdetails und Kommunikations-Log mit Tag-Filterung.

## Architektur

Folgt dem Artist- und Venue-Modul: Server Components für Datenabruf, Server Actions für Mutationen, Client Components für Kanban und Formulare. Optimistisches State-Update beim DnD-Statuswechsel mit Rollback bei Fehler. Kein API-Layer — ausschließlich Server Actions.

**Neue Abhängigkeit:** `@dnd-kit/core` + `@dnd-kit/utilities` für Drag & Drop.

### Schema-Änderung

`CommunicationLog` bekommt ein `tags String[]` Feld:

```prisma
model CommunicationLog {
  id            String   @id @default(cuid())
  bookingId     String
  booking       Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  contactPerson String?
  body          String   @db.Text
  tags          String[]
  attachmentUrl String?
  createdAt     DateTime @default(now())

  @@index([bookingId])
}
```

Eine Migration ist erforderlich. SQL für Supabase: `ALTER TABLE "CommunicationLog" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';`

### Dateistruktur

```
src/modules/bookings/
  actions/
    booking.actions.ts       ← getBookings, getBookingById, createBooking, updateBooking,
                                deleteBooking, updateBookingStatus, getProjectsByArtist
    negotiation.actions.ts   ← upsertNegotiation
    log.actions.ts           ← createLog, deleteLog

  components/
    KanbanBoard.tsx          ← Client Component, @dnd-kit, optimistisches Statusupdate
    BookingCard.tsx          ← Client Component, Karte im Kanban
    BookingForm.tsx          ← Client Component, useActionState, dynamic project load
    NegotiationForm.tsx      ← Client Component, useActionState
    CommunicationLog.tsx     ← Server Component, chronologische Log-Liste mit Tag-Filter
    LogForm.tsx              ← Client Component, Notiz + Tags hinzufügen

src/app/(dashboard)/bookings/
  page.tsx                   ← Kanban-Board (Server Component, lädt alle Bookings)
  new/page.tsx               ← Booking anlegen
  [id]/page.tsx              ← Detail-Seite mit Tabs
  [id]/edit/page.tsx         ← Booking bearbeiten
```

**Artist- und Venue-Detailseiten** erhalten je einen "Booking anlegen"-Button:
- `/artists/[id]` → Button → `/bookings/new?artistId=[id]`
- `/venues/[id]` → Button → `/bookings/new?venueId=[id]`

---

## Funktionen

### Kanban-Board (`/bookings`)

Vier Spalten nach Status: **Erstkontakt | In Verhandlung | Bestätigt | Abgesagt**.

- "Abgesagt"-Spalte visuell gedämpft (grauer Hintergrund)
- Jede Spalte zeigt die Anzahl der enthaltenen Bookings
- Booking-Karte zeigt: Artist-Name, Venue-Name, Datum, Projekt-Badge (wenn vorhanden)
- Klick auf Karte (ohne Drag) → `/bookings/[id]`
- Drag & Drop zwischen Spalten → optimistischer Statuswechsel + `updateBookingStatus()` im Hintergrund
- Rollback bei Server-Fehler: Karte springt zurück, kurze Fehlermeldung
- Kein Sortieren innerhalb einer Spalte
- Button "Booking anlegen" oben rechts → `/bookings/new`

**DnD-Implementierung:** `@dnd-kit/core` mit `DndContext`, `useDroppable` pro Spalte, `useDraggable` pro Karte. Kein `@dnd-kit/sortable` (kein Intra-Spalten-Sortieren).

### Booking-Formular (Anlegen & Bearbeiten)

**Felder:**
- Artist (Pflicht) — Select mit allen Artists, alphabetisch
- Projekt (optional) — lädt dynamisch via `getProjectsByArtist(artistId)` wenn Artist gewählt; Select bleibt disabled wenn kein Artist ausgewählt oder keine Projekte vorhanden
- Venue (Pflicht) — Select mit allen Venues, alphabetisch
- Datum (Pflicht) — `<input type="date">`
- Uhrzeit (optional) — `<input type="time">`, wird serverseitig mit Datum zu `DateTime` kombiniert
- Status — Select mit 4 Werten, Default: ERSTKONTAKT
- Ansprechpartner (optional) — Freitext

**URL-Params:** `?artistId=` und `?venueId=` werden server-seitig aus `searchParams` gelesen und als `defaultValues` an das Formular übergeben.

**Validierung via Zod:**
- `artistId`: erforderlich
- `venueId`: erforderlich
- `date`: erforderlich, gültiges Datum
- `status`: nativeEnum BookingStatus

**Gefahrenzone** auf der Bearbeiten-Seite: "Booking löschen" — löscht das Booking inkl. NegotiationDetail und CommunicationLog (Cascade im Schema).

### Booking-Detailseite (`/bookings/[id]`)

**Header:** "← Bookings"-Link, `Artist · Venue` als Titel, Status-Badge (farbkodiert), "Bearbeiten"-Button.

**Tab 1 — Übersicht:**
- Artist (Name, ggf. Projekt-Badge), Venue (Name, Stadt), Datum & Uhrzeit, Ansprechpartner
- Status-Änderung direkt auf der Seite: Select + "Speichern"-Button (Alternative zum Kanban-DnD)

**Tab 2 — Verhandlung:**
- Inline-Formular für `NegotiationDetail`
- Felder: Gage (Float, €), Währung (Text, Default "EUR"), Fahrtkosten (Float, €), Übernachtungskosten (Float, €), Sonstige Konditionen (Textarea)
- Upsert-Logik: erstellt beim ersten Speichern, aktualisiert danach
- Kein separates "Anlegen"-UI

**Tab 3 — Kommunikation:**
- Chronologische Liste aller Log-Einträge, neueste zuerst
- Jeder Eintrag: Zeitstempel, Kontaktperson (optional), Body-Text, Tags als Badges
- Tag-Filter oberhalb der Liste: Klick auf Tag filtert Einträge (OR-Logik, mehrere Tags wählbar). Filter ist client-seitig (State in CommunicationLog als Client Component)
- Löschen eines Eintrags per Button (ohne Bestätigung)
- Formular am Ende: Textarea (Body, Pflicht), Kontaktperson (optional), Tags (optional, kommagetrennt)

---

## Validierung & Fehlerbehandlung

- Zod in allen Server Actions
- `artistId`, `venueId`, `date` sind Pflichtfelder
- `fee`, `travelCosts`, `accommodation`: optionale positive Floats
- `body` im Log: min. 1 Zeichen
- Unbehandelte DB-Fehler propagieren zur Next.js Error Boundary

---

## Offene Fragen / Bewusste Einschränkungen

- Dateianhänge im CommunicationLog werden in Phase 4 ergänzt (benötigt S3-Integration)
- Keine E-Mail-Integration in Phase 3 (offene Frage #3 im PRD)
- Statushistorie (Änderungsprotokoll) wird nicht implementiert — der CommunicationLog dient als informeller Verlauf
- Duplikat-Erkennung bei Bookings (gleicher Artist + Venue + Datum) wird nicht automatisch erkannt
