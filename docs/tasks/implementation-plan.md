# Implementierungsplan – Booker App

**Basis:** PRD v1.0 (24. Mai 2026)  
**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · Auth.js · Cloudflare R2

---

## Aktueller Status (Stand: 27. Mai 2026)

| Phase | Modul | Status |
|---|---|---|
| Phase 0 | Projektinitialisierung | ✅ Abgeschlossen |
| Phase 1 | App-Shell & Auth | ✅ Abgeschlossen |
| Phase 2 | M1 Artist-Datenbank | ✅ Abgeschlossen |
| Phase 3 | M2 Venue-Datenbank | ✅ Abgeschlossen |
| Phase 4 | M3 Booking-CRM | ✅ Abgeschlossen |
| Phase 5 | M4 Dokumentenmanagement | ⏳ Offen (übersprungen) |
| Phase 6 | M5 Tour- & Eventplanung | ✅ Abgeschlossen (vor Phase 5) |

**Deployed:** Vercel (main-Branch) + Supabase PostgreSQL

**Ausstehend:**
- Phase 5 (Dokumentenmanagement / S3-Upload) noch nicht implementiert
- Supabase SQL-Migration für Tour-FK manuell einspielen:
  ```sql
  ALTER TABLE "Tour" ADD CONSTRAINT "Tour_artistId_fkey"
    FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  CREATE INDEX IF NOT EXISTS "Tour_artistId_idx" ON "Tour"("artistId");
  ```

**Implementierte Extras (nicht im ursprünglichen Plan):**
- Dashboard: echte DB-Counts + "Nächste Bookings"-Liste + farbige Stat-Karten
- KanbanBoard: DnD-Sensor-Fix (MouseSensor + TouchSensor mit activationConstraint)
- CSV-Import für Venues (`/venues/import`)
- Ansprechpartner-Verwaltung im Venue-Modul

---

---

## Ordnerstruktur (Zielzustand)

```
Booker App/
├── docs/
│   ├── PRD_Booker_App.md
│   └── tasks/
│       └── implementation-plan.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Shell mit Sidebar
│   │   │   ├── page.tsx               # Dashboard-Übersicht
│   │   │   ├── artists/
│   │   │   │   ├── page.tsx           # Artist-Liste
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Artist-Detail
│   │   │   │       ├── edit/page.tsx
│   │   │   │       └── projects/
│   │   │   │           ├── new/page.tsx
│   │   │   │           └── [projectId]/page.tsx
│   │   │   ├── venues/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── edit/page.tsx
│   │   │   ├── tours/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── events/
│   │   │       ├── page.tsx
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── documents/upload/route.ts
│   │   ├── layout.tsx                 # Root Layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # Button, Input, Select, Badge, Modal, …
│   │   ├── layout/                    # Sidebar, Header, Nav, PageHeader
│   │   └── shared/                    # SearchBar, StatusBadge, EmptyState, …
│   ├── modules/
│   │   ├── artists/
│   │   │   ├── components/            # ArtistCard, ArtistForm, ProjectCard, …
│   │   │   ├── hooks/                 # useArtists, useArtist
│   │   │   └── actions/               # artist.actions.ts, project.actions.ts
│   │   ├── venues/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── actions/
│   │   ├── bookings/
│   │   │   ├── components/            # BookingForm, StatusBadge, CommunicationLog, …
│   │   │   ├── hooks/
│   │   │   └── actions/
│   │   ├── documents/
│   │   │   ├── components/            # DocumentUpload, DocumentList, DocumentCard
│   │   │   ├── hooks/
│   │   │   └── actions/
│   │   └── tours/
│   │       ├── components/            # TourCalendar, StageEditor
│   │       ├── hooks/
│   │       └── actions/
│   ├── lib/
│   │   ├── db.ts                      # Prisma-Client (Singleton)
│   │   ├── auth.ts                    # Auth.js-Konfiguration
│   │   ├── storage.ts                 # S3/R2-Client + Upload-Helfer
│   │   ├── search.ts                  # PostgreSQL tsvector-Helfer
│   │   └── utils.ts
│   └── types/
│       ├── artist.ts
│       ├── venue.ts
│       ├── booking.ts
│       ├── document.ts
│       ├── tour.ts
│       └── common.ts
├── .env.example
├── .env.local               # nicht in Git
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Datenbankschema (Prisma – Überblick)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  // TODO(offene-frage-1): orgId für Multi-User-Zugang ergänzen
}

model Artist {
  id        String    @id @default(cuid())
  name      String
  email     String?
  phone     String?
  rating    Int?      // 1–5
  notes     Note[]
  projects  Project[]
  bookings  Booking[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Project {
  id          String     @id @default(cuid())
  artistId    String
  artist      Artist     @relation(fields: [artistId], references: [id])
  name        String
  genre       String?
  lineup      String?    // Besetzung
  description String?
  rating      Int?
  documents   Document[]
  bookings    Booking[]
}

model Note {
  id        String   @id @default(cuid())
  artistId  String
  artist    Artist   @relation(fields: [artistId], references: [id])
  body      String
  createdAt DateTime @default(now())
}

model Venue {
  id             String          @id @default(cuid())
  name           String
  street         String?
  city           String
  zip            String?
  capacity       Int?
  stageSizeM2    Float?
  type           VenueType
  genreTags      String[]
  contacts       ContactPerson[]
  bookings       Booking[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model ContactPerson {
  id      String  @id @default(cuid())
  venueId String
  venue   Venue   @relation(fields: [venueId], references: [id])
  name    String
  email   String?
  phone   String?
  role    String?
}

model Booking {
  id              String             @id @default(cuid())
  artistId        String
  artist          Artist             @relation(fields: [artistId], references: [id])
  projectId       String?
  project         Project?           @relation(fields: [projectId], references: [id])
  venueId         String
  venue           Venue              @relation(fields: [venueId], references: [id])
  date            DateTime
  status          BookingStatus      @default(ERSTKONTAKT)
  negotiation     NegotiationDetail?
  communications  CommunicationLog[]
  documents       Document[]
  tourId          String?
  tour            Tour?              @relation(fields: [tourId], references: [id])
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

model NegotiationDetail {
  id              String   @id @default(cuid())
  bookingId       String   @unique
  booking         Booking  @relation(fields: [bookingId], references: [id])
  fee             Float?
  currency        String   @default("EUR")
  travelCosts     Float?
  accommodation   Float?
  notes           String?
  updatedAt       DateTime @updatedAt
}

model CommunicationLog {
  id            String   @id @default(cuid())
  bookingId     String
  booking       Booking  @relation(fields: [bookingId], references: [id])
  contactPerson String?
  body          String
  attachmentUrl String?
  createdAt     DateTime @default(now())
}

model Document {
  id          String       @id @default(cuid())
  name        String
  type        DocumentType
  storageKey  String       // S3/R2-Pfad
  mimeType    String
  version     Int          @default(1)
  projectId   String?
  project     Project?     @relation(fields: [projectId], references: [id])
  bookingId   String?
  booking     Booking?     @relation(fields: [bookingId], references: [id])
  createdAt   DateTime     @default(now())
}

model Tour {
  id        String    @id @default(cuid())
  name      String
  artistId  String
  startDate DateTime
  endDate   DateTime
  bookings  Booking[]
  createdAt DateTime  @default(now())
}

model Event {
  id     String  @id @default(cuid())
  name   String
  date   DateTime
  venueId String
  stages Stage[]
}

model Stage {
  id      String @id @default(cuid())
  eventId String
  event   Event  @relation(fields: [eventId], references: [id])
  name    String
  slots   Slot[]
}

model Slot {
  id        String   @id @default(cuid())
  stageId   String
  stage     Stage    @relation(fields: [stageId], references: [id])
  startTime DateTime
  endTime   DateTime
  artistId  String?
  projectId String?
}

enum BookingStatus {
  ERSTKONTAKT
  IN_VERHANDLUNG
  BESTAETIGT
  ABGESAGT
}

enum VenueType {
  CLUB
  THEATER
  FESTIVAL
  OPEN_AIR
  SONSTIGE
}

enum DocumentType {
  TECH_RIDER
  HOSPITALITY_RIDER
  STAGE_PLOT
  PRESSETEXT
      PRESSEFOTO
  VERTRAG
  SONSTIGES
}
```

---

## Routing-Übersicht

| Route | Beschreibung |
|---|---|
| `/login` | Auth-Seite |
| `/` | Dashboard mit Schnellübersicht |
| `/artists` | Artist-Liste + Suche |
| `/artists/new` | Neuen Artist anlegen |
| `/artists/[id]` | Artist-Detailseite mit Projekten |
| `/artists/[id]/edit` | Artist bearbeiten |
| `/artists/[id]/projects/new` | Neues Projekt anlegen |
| `/artists/[id]/projects/[projectId]` | Projekt-Detailseite |
| `/venues` | Venue-Liste + Filter |
| `/venues/new` | Venue anlegen |
| `/venues/[id]` | Venue-Detailseite |
| `/bookings` | Booking-Liste + Statusfilter |
| `/bookings/new` | Booking anlegen (Artist + Venue + Datum) |
| `/bookings/[id]` | Booking-Detail: Status, Kommunikation, Verhandlung |
| `/tours` | Tour-Übersicht |
| `/tours/[id]` | Tour-Detail + Kalenderansicht |
| `/events` | Festival-Events |
| `/events/[id]` | Bühnenplaner |

---

## Implementierungsphasen

### Phase 0 – Projektinitialisierung

**Ziel:** Lauffähiges Next.js-Projekt mit allen Abhängigkeiten.

Schritte:
1. `pnpm create next-app@latest booker-app --typescript --tailwind --app --src-dir`
2. Abhängigkeiten installieren: `prisma`, `@prisma/client`, `next-auth`, `@auth/prisma-adapter`, `zustand`, `@tanstack/react-query`, `date-fns`, `date-fns-tz`, `zod`, `@aws-sdk/client-s3`
3. `tsconfig.json`: `strict: true` sicherstellen
4. `.env.example` anlegen (alle Variablen aus CLAUDE.md)
5. `prisma init` + Schema einfügen
6. Auth.js konfigurieren (`src/lib/auth.ts`)
7. Prisma-Client-Singleton (`src/lib/db.ts`)
8. S3/R2-Client (`src/lib/storage.ts`)

**Ergebnis:** `pnpm dev` läuft, `pnpm prisma migrate dev` läuft durch.

---

### Phase 1 – App-Shell & Auth

**Ziel:** Login/Register + geschütztes Dashboard-Layout.

Komponenten:
- `(auth)/login/page.tsx` – Login-Formular
- `(auth)/register/page.tsx` – Registrierung (falls Multi-User, siehe offene Frage #1)
- `(dashboard)/layout.tsx` – Sidebar + Header
- `components/layout/Sidebar.tsx` – Navigation zu allen Modulen
- `components/layout/Header.tsx` – User-Menü, Suche
- `(dashboard)/page.tsx` – Schnellübersicht: offene Bookings, letzte Änderungen

Basis-UI-Komponenten (alle in `components/ui/`):
`Button`, `Input`, `Textarea`, `Select`, `Badge`, `Card`, `Modal`, `Table`, `Pagination`, `Spinner`

**Ergebnis:** Login funktioniert, Dashboard-Shell steht.

---

### Phase 2 – M1: Artist-Datenbank (Must Have)

**Priorität:** Höchste — Kernproblem des Nutzers.

Server Actions (`modules/artists/actions/`):
- `createArtist`, `updateArtist`, `deleteArtist`, `getArtists`, `getArtistById`
- `createProject`, `updateProject`, `deleteProject`
- `addNote`, `updateRating`

Komponenten (`modules/artists/components/`):
- `ArtistList.tsx` – Tabelle mit Suche + Sortierfunktion
- `ArtistCard.tsx` – kompakte Karte für Listen-/Kachelansicht
- `ArtistForm.tsx` – Create/Edit-Formular mit Zod-Validierung
- `ProjectList.tsx`, `ProjectCard.tsx`, `ProjectForm.tsx`
- `RatingWidget.tsx` – Stern-Bewertung 1–5
- `NoteList.tsx`, `NoteForm.tsx`

Hooks:
- `useArtists.ts` – React Query: Liste mit Filterparametern
- `useArtist.ts` – React Query: einzelner Artist mit Projekten

Suche: PostgreSQL `tsvector` auf `artist.name`, `project.name`, `project.genre`.

CSV-Import (US-101): Upload-Dialog + serverseitiger Parser (`src/lib/csv-import.ts`).

**Ergebnis:** Artist anlegen, bearbeiten, Projekte zuordnen, Notizen und Sterne setzen, suchen.

---

### Phase 3 – M2: Venue-Datenbank (Must Have)

Server Actions:
- `createVenue`, `updateVenue`, `deleteVenue`, `getVenues`, `getVenueById`
- `addContactPerson`, `updateContactPerson`, `deleteContactPerson`

Komponenten:
- `VenueList.tsx` – mit Filter nach Stadt, Typ, Kapazität
- `VenueForm.tsx`
- `ContactPersonForm.tsx` – eingebettet im Venue-Formular
- `VenueCard.tsx`

Offene Frage #2 (externe Venue-Quelle): Placeholder `seed.ts` mit ~50 Beispiel-Venues anlegen. Echte Datenquelle nachliefern, sobald geklärt.

**Ergebnis:** Venues pflegen, Ansprechpartner hinterlegen, filtern und suchen.

---

### Phase 4 – M3: Booking-CRM (Must Have)

Server Actions:
- `createBooking`, `updateBooking`, `updateBookingStatus`, `deleteBooking`
- `saveNegotiationDetails`
- `addCommunicationEntry`

Komponenten:
- `BookingForm.tsx` – Artist + Venue + Datum auswählen, Ansprechpartner
- `BookingList.tsx` – Tabelle mit Statusfilter
- `StatusBadge.tsx` + Status-Workflow-Anzeige
- `NegotiationForm.tsx` – Gage, Fahrtkosten, Unterkunft, Sonstiges
- `CommunicationLog.tsx` – chronologische Liste
- `CommunicationEntry.tsx` – Notiz + optionaler Anhang

**Ergebnis:** Booking anlegen, Status durchlaufen, Verhandlungen und Kommunikation protokollieren.

---

### Phase 5 – M4: Dokumentenmanagement (Should Have)

Upload-Flow: `POST /api/documents/upload` → Datei zu R2/S3 streamen → `Document`-Record in DB anlegen.

Server Actions:
- `createDocument`, `deleteDocument`, `getDocumentsForProject`, `getDocumentsForBooking`
- `getSignedDownloadUrl` – temporäre URL für Direktdownload

Komponenten:
- `DocumentUpload.tsx` – Drag & Drop, Dateitypprüfung (PDF, DOCX, JPG, PNG)
- `DocumentList.tsx` – Tabelle mit Typ, Datum, Download-Link
- `DocumentCard.tsx` – kompakt für Einbettung in Artist-/Booking-Detail

Versionierung: Beim Hochladen gleichen Typs für dasselbe Projekt `version` inkrementieren, altes Dokument behalten (nicht löschen).

**Ergebnis:** Rider, Pressetexte und Fotos hochladen, versioniert abrufen, direkt aus Bookings heraus referenzieren.

---

### Phase 6 – M5: Tour- & Eventplanung (Could Have)

Erst nach Abschluss von Phase 2–5 angehen.

Server Actions:
- `createTour`, `updateTour`, `addBookingToTour`
- `createEvent`, `addStage`, `assignActToSlot`

Komponenten:
- `TourCalendar.tsx` – Kalenderansicht der Tour-Dates (react-calendar oder eigene Implementierung)
- `TourForm.tsx`
- `StageEditor.tsx` – Drag & Drop Slot-Zuweisung
- `ConflictIndicator.tsx` – visuelle Markierung bei Doppelbelegung

Export: PDF-Druck über Browser (`window.print()` + Print-CSS) + iCal-Generierung.

---

## Kritische Querschnittsthemen

### Validierung
Alle Formulardaten werden mit **Zod** validiert — einmal im Server Action (Pflicht), optional auch clientseitig für sofortiges Feedback. Schemas liegen in `src/types/`.

### Fehlerbehandlung
Server Actions geben ein typisiertes `{ success: true, data } | { success: false, error: string }` zurück. Kein unbehandeltes `throw` in UI-Komponenten.

### Sicherheit
- CSRF: Auth.js liefert das Out-of-the-box.
- Uploads: Dateityp serverseitig per Magic Bytes prüfen, nicht nur MIME-Header.
- Presigned URLs: Max. 1h Gültigkeit.
- Alle DB-Abfragen prüfen userId (nach Klärung offene Frage #1: orgId).

### Suche
`tsvector`-Spalten auf `artist.name`, `project.name`, `venue.name`, `venue.city` per Prisma-Migration. Hilfsfunktion in `src/lib/search.ts` abstrahiert die Query.

---

## Abhängigkeiten & Reihenfolge

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
               ↑                                        ↑
           Auth nötig                         Upload-Infrastruktur
           für alles                          nötig für M4
```

Parallelisierbar: M2 (Venues) und M1 (Artists) können gleichzeitig entwickelt werden, sobald Phase 1 steht.

---

## Offene Fragen (vor dem ersten Commit klären)

| # | Frage | Einfluss auf Plan |
|---|---|---|
| 1 | Multi-User-Zugang? | `orgId` an alle Modelle; Auth-Middleware anpassen |
| 2 | Externe Venue-Quelle? | `seed.ts`-Strategie; evtl. Cron-Job für Updates |
| 5 | Import-Formate der 7 Listen? | CSV-Parser-Scope in Phase 2 |

---

*Plan erstellt: 25. Mai 2026*
