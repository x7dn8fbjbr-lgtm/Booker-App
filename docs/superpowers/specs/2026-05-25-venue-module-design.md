# Venue-Modul (Phase 2) — Design Spec

**Datum:** 2026-05-25  
**Status:** Approved  
**PRD-Referenz:** US-201, US-202

---

## Ziel

Venue-Datenbank mit vollständigem CRUD, Ansprechpartner-Verwaltung und CSV-Import aus bestehenden Venue-Listen.

## Architektur

Folgt exakt dem Artist-Modul (Server Components für Datenabruf, Server Actions für Mutationen, Client Components für Formulare).

### Datenbankschema

Das Venue-Schema ist bereits in `prisma/schema.prisma` definiert. Eine Änderung ist erforderlich:

- `Venue.city` wird von `String` auf `String?` geändert (nullable), damit CSV-Imports ohne Stadtangabe möglich sind.

Eine neue Migration wird benötigt.

### Dateistruktur

```
src/modules/venues/
  actions/
    venue.actions.ts        ← getVenues, getVenueById, createVenue, updateVenue, deleteVenue
    contact.actions.ts      ← createContact, updateContact, deleteContact
  components/
    VenueTable.tsx          ← Client Component, Klick navigiert zu Venue-Detail
    VenueForm.tsx           ← Client Component, useActionState (React 19)
    ContactList.tsx         ← Server Component
    ContactForm.tsx         ← Client Component, useActionState
    CsvImport.tsx           ← Client Component, CSV-Parsing + Vorschau + Bestätigung

src/app/(dashboard)/venues/
  page.tsx                  ← Venue-Liste
  new/page.tsx              ← Venue anlegen
  import/page.tsx           ← CSV-Import
  [id]/page.tsx             ← Venue-Detail (Tabs)
  [id]/edit/page.tsx        ← Venue bearbeiten
  [id]/contacts/new/page.tsx
  [id]/contacts/[contactId]/edit/page.tsx
```

---

## Funktionen

### Venue-Liste (`/venues`)

- Tabelle mit Spalten: Name, Stadt, Typ, Kapazität, Ansprechpartner (Anzahl)
- Klick auf Zeile navigiert zu `/venues/[id]`
- Buttons oben rechts: "Venue anlegen" → `/venues/new`, "CSV importieren" → `/venues/import`
- Leerzustand: EmptyState-Komponente mit Hinweis und "Venue anlegen"-Button

### Venue-Detail (`/venues/[id]`)

Drei Tabs:

**Übersicht:** Name, Stadt, Straße, PLZ, Typ, Kapazität, Bühnengröße (m²), Genre-Tags.

**Ansprechpartner:** Liste aller ContactPersons mit Name, E-Mail, Telefon, Rolle. "Ansprechpartner hinzufügen"-Button → `/venues/[id]/contacts/new`. Bearbeiten- und Löschen-Aktion pro Eintrag.

**Bookings:** Empty State ("Bookings werden in Phase 3 implementiert.").

Header: Venue-Name, "← Venues"-Link, "Bearbeiten"-Button → `/venues/[id]/edit`.

### Venue-Formular (Anlegen & Bearbeiten)

Felder:
- Name (Pflicht, Text)
- Stadt (optional, Text)
- Straße (optional, Text)
- PLZ (optional, Text)
- Kapazität (optional, Zahl, positiver Integer)
- Bühnengröße in m² (optional, Zahl, positiver Float)
- Typ (Dropdown: Club / Theater / Festival / Open Air / Sonstige)
- Genre-Tags (optional, Freitext, kommagetrennt — wird als `String[]` gespeichert)

Validierung via Zod in `venue.actions.ts`. Fehler werden inline unter dem jeweiligen Feld angezeigt.

Gefahrenzone auf der Bearbeiten-Seite: "Venue löschen" löscht die Venue und alle Ansprechpartner (Cascade im Schema).

### Ansprechpartner-Formular

Felder:
- Name (Pflicht, Text)
- E-Mail (optional, E-Mail-Format)
- Telefon (optional, Text)
- Rolle (optional, Text, z. B. "Booking", "Technik")

### CSV-Import (`/venues/import`)

**Technischer Ablauf:**

1. Nutzer wählt CSV-Datei (Drag & Drop oder Klick) und Trennzeichen (Komma / Tab / Semikolon).
2. CSV wird client-seitig in `CsvImport.tsx` geparst (kein Server-Upload für Preview).
3. Vorschau-Tabelle zeigt gemappte Felder: Name, Kategorie → Typ, Adresse → Straße.
4. Zeilen ohne Name werden rot markiert und beim Import übersprungen.
5. Nutzer klickt "X Venues importieren" → Server Action `importVenues(rows)`.
6. Redirect zu `/venues` mit Flash-Meldung (Anzahl importierter Venues).

**CSV-Spalten-Mapping:**

| CSV-Spalte | Venue-Feld | Anmerkung |
|---|---|---|
| Name | `name` | Pflicht; leere Zeilen werden übersprungen |
| Kategorie | `type` | Mapping: Club→CLUB, Theater→THEATER, Festival→FESTIVAL, Open Air→OPEN_AIR, alles andere→SONSTIGE |
| Adresse | `street` | Wird als Straße + Hausnummer übernommen |
| Bewertung | — | Wird ignoriert (kein Venue-Rating in Phase 2) |
| Anzahl_Bewertungen | — | Wird ignoriert |
| Preis | — | Wird ignoriert |
| Status | — | Wird ignoriert |

`city` bleibt beim Import leer. Der Nutzer kann die Stadt nachträglich per Bearbeiten-Formular ergänzen.

Duplikate (gleicher Name) werden nicht automatisch erkannt — bewusster Trade-off für MVP.

---

## Validierung & Fehlerbehandlung

- Zod-Schemas in `venue.actions.ts` und `contact.actions.ts`
- `name` Pflichtfeld (min. 1 Zeichen)
- `email` optionales E-Mail-Format
- `capacity` optionaler positiver Integer
- `stageSizeM2` optionaler positiver Float
- Unbehandelte DB-Fehler propagieren zu Next.js Error Boundary (wie im Artist-Modul)

---

## Offene Fragen / Bewusste Einschränkungen

- Genre-Tags sind Freitext (String[]), kein kontrolliertes Vokabular — wird in einer späteren Phase ggf. zu einem Tag-System ausgebaut.
- Kein Duplikat-Erkennung beim CSV-Import.
- Bookings-Tab ist Placeholder für Phase 3.
- `city` beim Import leer — Nutzer füllt manuell nach.
