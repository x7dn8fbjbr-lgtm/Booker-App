# Festival-Planer (Phase 5 / US-502) — Design Spec

**Datum:** 2026-05-26  
**Status:** Approved  
**PRD-Referenz:** US-502

---

## Ziel

Visueller Bühnenplaner für Festivals und Großveranstaltungen: mehrere Stages als Spalten, Zeitachse als Raster, Acts per Drag & Drop aus einer Sidebar zuweisen. Jeder Act erzeugt automatisch ein Booking im CRM.

## Architektur

Folgt dem bestehenden Muster: Server Components für Datenabruf, Server Actions für Mutationen, Client Components für Planer-UI und DnD. Kein API-Layer. `@dnd-kit/core` (bereits installiert) wird wie im Kanban-Board eingesetzt — `useDraggable` für Artist-Karten in der Sidebar, `useDroppable` für Grid-Zellen.

---

## Schema-Änderungen

Migration erforderlich. Supabase-SQL am Ende dieses Dokuments.

```prisma
model Event {
  id           String   @id @default(cuid())
  name         String
  date         DateTime
  venueId      String
  venue        Venue    @relation(fields: [venueId], references: [id])
  gridInterval Int      @default(30)   // Minuten: 15, 30 oder 60
  startTime    String   @default("14:00")
  endTime      String   @default("22:00")
  stages       Stage[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Stage {
  id      String @id @default(cuid())
  eventId String
  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name    String
  color   String @default("#6366f1")
  order   Int    @default(0)
  slots   Slot[]
}

model Slot {
  id        String   @id @default(cuid())
  stageId   String
  stage     Stage    @relation(fields: [stageId], references: [id], onDelete: Cascade)
  startTime DateTime
  endTime   DateTime
  bookingId String?
  booking   Booking? @relation(fields: [bookingId], references: [id])

  @@index([stageId])
  @@index([bookingId])
}
```

`Booking` erhält Rückrelation `slots Slot[]`.  
`Venue` erhält Rückrelation `events Event[]`.  
`Slot` verliert die bisherigen Felder `artistId` und `projectId` (Artist/Projekt kommen über das verknüpfte Booking).

**Supabase-SQL für Migration:**
```sql
-- Event: venueId-Spalte existiert bereits; nur neue Spalten hinzufügen
ALTER TABLE "Event" ADD COLUMN "gridInterval" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Event" ADD COLUMN "startTime" TEXT NOT NULL DEFAULT '14:00';
ALTER TABLE "Event" ADD COLUMN "endTime" TEXT NOT NULL DEFAULT '22:00';
ALTER TABLE "Event" ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW();

-- Stage: neue Spalten
ALTER TABLE "Stage" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE "Stage" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Slot: bookingId ergänzen, alte Felder entfernen
ALTER TABLE "Slot" ADD COLUMN "bookingId" TEXT REFERENCES "Booking"("id");
ALTER TABLE "Slot" DROP COLUMN IF EXISTS "artistId";
ALTER TABLE "Slot" DROP COLUMN IF EXISTS "projectId";
```

---

## Dateistruktur

```
src/modules/events/
  actions/
    event.actions.ts     ← getEvents, getEventById, createEvent, updateEvent, deleteEvent,
                            createStage, updateStage, deleteStage
    slot.actions.ts      ← upsertSlot, deleteSlot
  components/
    FestivalPlanner.tsx  ← Client Component, DndContext, Grid + Sidebar
    StageGrid.tsx        ← Client Component, useDroppable pro Zelle, Konflikt-Markierung
    ArtistSidebar.tsx    ← Client Component, useDraggable pro Artist-Karte, Suchfeld
    SlotCard.tsx         ← Client Component, Slot-Anzeige + Klick-Edit (Popover)
    EventForm.tsx        ← Client Component, useActionState, Stage-Verwaltung inline

src/app/(dashboard)/events/
  page.tsx               ← Event-Liste (Server Component)
  new/page.tsx           ← Event anlegen
  [id]/page.tsx          ← Festival-Planer
  [id]/edit/page.tsx     ← Event bearbeiten
```

---

## Funktionen

### Event-Liste (`/events`)

Tabelle mit: Name, Datum (deutsch formatiert), Venue + Stadt, Anzahl Stages, Link zum Planer.  
Button „Event anlegen" oben rechts → `/events/new`.  
Link „Events" in der linken Sidebar-Navigation (nach „Bookings").

### Event anlegen & bearbeiten

**Felder:**
- Name (Pflicht)
- Venue (Pflicht, Dropdown aller Venues alphabetisch)
- Datum (Pflicht, `<input type="date">`)
- Rasterintervall (Select: 15 / 30 / 60 Minuten, Default 30)
- Startzeit (Select auf Stundenbasis, Default 14:00)
- Endzeit (Select auf Stundenbasis, Default 22:00)
- Stages: beliebig viele, je Name + Farbe (Hex-Input). Reihenfolge per `order`-Feld (numerisches Input).

**Gefahrenzone** auf Edit-Seite: „Event löschen" — löscht Event inkl. Stages und Slots (Cascade).

**Validierung (Zod):**
- `name`: Pflicht
- `venueId`: Pflicht
- `date`: Pflicht, gültiges Datum
- `gridInterval`: muss 15, 30 oder 60 sein
- `startTime` < `endTime`
- `stages`: mindestens 1, jeder Stage braucht einen Namen

### Festival-Planer (`/events/[id]`)

**Layout:** Zweispaltig. Links: schmale Artist-Sidebar. Rechts: das Stage-Grid.

**Artist-Sidebar:**
- Suchfeld (Filtert Artist-Namen client-seitig)
- Alle Artists alphabetisch als `useDraggable`-Karten
- Karten zeigen: Artist-Name, ggf. Projekt-Badge
- Wenn ein Artist bereits in einem Slot des Events vorkommt: Karte ist grau und nicht draggable (verhindert Doppelzuweisung)

**Stage-Grid:**
- Kopfzeile: Stage-Namen farbig (entsprechend `stage.color`)
- Linke Spalte: Zeitachse im konfigurierten Intervall
- Jede Zelle = `useDroppable` mit ID `${stageId}::${timeSlot}`
- Leere Zelle: zeigt „+" beim Hover
- Belegte Zelle: zeigt `<SlotCard>` mit Artist-Name und Uhrzeit

**Drop-Interaktion:**
1. Artist wird auf eine Zelle gezogen
2. `startTime` = Zellenzeit, `endTime` = `startTime + gridInterval`
3. System prüft: existiert bereits ein Booking für diesen Artist + `event.venueId` + `event.date`?
   - Ja → vorhandenes Booking wird mit dem Slot verknüpft
   - Nein → neues Booking wird angelegt (Status ERSTKONTAKT, Artist, Venue und Datum aus dem Event)
4. Slot wird in der DB gespeichert
5. Optimistisches State-Update: Karte erscheint sofort im Grid; Rollback bei Server-Fehler

**Klick auf Slot (`SlotCard`-Popover):**
- Zeigt Start- und Endzeit als Dropdowns (alle Raster-Zeitpunkte als Optionen)
- „Speichern" → `upsertSlot()` mit neuen Zeiten
- „Entfernen" → `deleteSlot()`, Slot und Zelle werden geleert (Booking bleibt erhalten)

**Konflikt-Markierung:**
- Ein Konflikt liegt vor, wenn derselbe Artist zwei zeitlich überlappende Slots im selben Event hat
- Konflikt-Erkennung: client-seitig, berechnet aus den Slot-Daten beim Render
- Betroffene `SlotCards` erhalten einen roten Ring (`ring-2 ring-red-500`) und ein Warn-Icon

**Druck/Export:**
- Button „Drucken" → `window.print()`
- `@media print` CSS: Sidebar und Buttons ausblenden, Grid auf volle Breite, Farben erhalten

---

## Validierung & Fehlerbehandlung

- Zod in allen Server Actions
- Drop auf belegten Slot: kein Überschreiben — optimistisches Update wird nicht angewendet, Slot bleibt unverändert
- Booking-Erstellung schlägt fehl → Slot wird nicht gespeichert, kurze Fehlermeldung im Planer
- Unbehandelte DB-Fehler → Next.js Error Boundary

---

## Bewusste Einschränkungen

- Kein Resize-Handle per DnD (Endzeit nur über Klick-Edit im Popover)
- Nur eintägige Events (kein Multi-Day)
- Kein Sortieren der Stages per DnD (Reihenfolge über `order`-Feld im Edit-Formular)
- US-501 (Tournee-Verwaltung) ist nicht Teil dieses Specs — wird separat gebaut
- Dateianhänge (Rider etc.) folgen in Phase 4 (übersprungen, kommt später)
