# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Dieses Projekt ist ein Greenfield-Projekt. Stand 24. Mai 2026 gibt es noch keinen Code – nur PRD und Planungsdokumente. Das vollständige PRD liegt unter `docs/PRD_Booker_App.md`.

---

## Tech Stack

| Schicht | Technologie |
|---|---|
| Framework | Next.js (App Router) mit TypeScript |
| Styling | Tailwind CSS |
| State (Client) | Zustand |
| State (Server) | React Query (TanStack Query) |
| API | Server Actions + Route Handlers |
| Datenbank | PostgreSQL via Prisma ORM |
| Dateispeicher | S3-kompatibles Object Storage (EU-Region, z. B. Cloudflare R2) |
| Auth | Auth.js (E-Mail/Passwort + OAuth) |
| Hosting | Vercel (Frontend) + Railway oder Fly.io (Backend/DB) |

**Vor dem ersten Commit klären:** Multi-User/Team-Zugang (offene Frage #1) – das beeinflusst, ob alle Entitäten von Anfang an `orgId` / `userId` bekommen.

---

## Anwendungsmodule & Routen

| Modul | Route-Präfix | Kern |
|---|---|---|
| M1 – Artist-Datenbank | `/artists` | Profile, Projekte (1:n), Bewertungen, Notizen |
| M2 – Venue-Datenbank | `/venues` | Deutsche Venues, Ansprechpartner, Kapazität |
| M3 – Booking-CRM | `/bookings` | Artist ↔ Venue, Status-Workflow, Verhandlungen |
| M4 – Dokumentenmanagement | `/documents` | Rider, Pressetexte, Fotos – via M1/M3 erreichbar |
| M5 – Event- & Tourplanung | `/tours` + `/events` | Bookings bündeln, Festival-Bühnenplaner |

**MoSCoW:** M1–M4 (Must/Should Have) vor M5 (Could Have). Details im PRD Abschnitt 6.

---

## Datenmodell

```
Artist
  ├── id, name, Kontaktdaten, Bewertungen, Notizen
  └── Project[]
        ├── id, name, Genre, Besetzung, Beschreibung
        └── Document[]  (Rider, Pressetext, Pressefoto)

Venue
  ├── id, name, Adresse, Stadt, Kapazität, Bühnenmaße, Typ, Genre-Tags
  └── ContactPerson[]

Booking
  ├── id, artistId, projectId, venueId, Datum, Uhrzeit
  ├── status: ERSTKONTAKT | IN_VERHANDLUNG | BESTAETIGT | ABGESAGT
  ├── NegotiationDetails (Gage, Währung, Fahrtkosten, Übernachtung, Sonstiges)
  ├── CommunicationLog[]  (Notizen + Dateianhänge, mit Zeitstempel)
  └── Document[]  (aus Projekt verknüpft oder direkt hochgeladen)

Tour
  ├── id, name, Zeitraum, artistId/projectId
  └── Booking[]

Event (Festival)
  ├── id, name, Datum, venueId
  └── Stage[]
        └── Slot[]  (Startzeit, Endzeit, artistId/projectId)
```

---

## Lokale Entwicklung

```bash
pnpm install
cp .env.example .env.local
pnpm prisma migrate dev
pnpm prisma db seed      # Venue-Daten einspielen
pnpm dev
```

Tests und Lint:

```bash
pnpm test              # alle Tests
pnpm test -- --testPathPattern=artists   # einzelne Test-Suite
pnpm lint
pnpm typecheck
```

---

## Umgebungsvariablen

```
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
STORAGE_BUCKET=
STORAGE_REGION=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_ENDPOINT=       # für S3-kompatible Anbieter (kein AWS)
```

---

## Konventionen

### Verzeichnisstruktur
```
src/
  app/           # Next.js App Router Pages & Layouts
  components/    # Gemeinsam genutzte UI-Komponenten
  modules/       # Feature-Module (artists/, venues/, bookings/, tours/, events/)
    artists/
      components/
      hooks/
      actions/   # Server Actions
  lib/           # DB-Client, Auth-Konfiguration, Hilfsfunktionen
  types/         # Gemeinsam genutzte TypeScript-Typen
prisma/
  schema.prisma
  seed.ts
```

### Namensgebung
- Komponenten: `PascalCase`
- Hooks: `useCamelCase`
- Server Actions / Route Handlers: `camelCase`
- Datenbanktabellen: `snake_case` (Prisma-Standard)
- Dateinamen: `kebab-case` für Pages und Hilfsdateien

### Kritische Regeln
- TypeScript Strict Mode. Kein `any` ohne `// eslint-disable`-Kommentar mit Begründung.
- Datenabruf ausschließlich serverseitig (Server Components oder Server Actions). Keine Business-Logik in UI-Komponenten.
- Alle Datei-Uploads laufen über `lib/storage.ts`. Nie direkt auf die Festplatte schreiben.
- Alle Datumsangaben als UTC speichern; Anzeige über `date-fns-tz` in die Nutzer-Zeitzone konvertieren.
- Volltextsuche über PostgreSQL `tsvector` – kein externer Suchindex für v1.
- Alle Dokumente im Object Storage (S3), nie in der Datenbank als Blob.

### Offene Fragen (blockieren nicht, aber kommentieren)
Sobald eine dieser Fragen im Code relevant wird: `TODO(offene-frage-N):` setzen.

| # | Frage | Auswirkung |
|---|---|---|
| 1 | Multi-User / Team-Zugang? | `orgId` / `userId` an alle Entitäten |
| 2 | Venue-DB-Quelle / externe API? | Seed-Strategie für M2 |
| 3 | Direktes E-Mail-Versenden? | Provider-Integration (z. B. Resend) |
| 5 | Import-Formate der 7 bestehenden Listen? | Scope des CSV-Parsers |

---

*Basiert auf PRD v1.0 – 24. Mai 2026. Bei Stack-Entscheidungen oder neuen Architekturentschieden diese Datei aktualisieren.*

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
