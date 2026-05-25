# Design: Artist-Modul (Phase 2 Lean MVP)

**Datum:** 2026-05-25  
**Status:** Approved  
**Scope:** Lean MVP — Artist CRUD + Project CRUD. Bewertungen, Notizen, Volltextsuche und CSV-Import kommen in einem späteren Sprint.

---

## Architektur-Anforderungen

- **Kein Vercel Lock-in:** Keine Vercel-spezifischen APIs (`@vercel/kv`, `@vercel/blob`, etc.) im Code. Next.js wird als Standard-Node.js-App betrieben.
- **EU-Hosting:** Zielinfrastruktur für Produktion ist Fly.io Frankfurt oder Railway EU — der Kunde ist datenschutzsensibel. Vercel darf für frühe Demo-/Staging-Zwecke genutzt werden (Testdaten, kein echter Kundendatensatz).
- **S3-kompatibler Storage:** `src/lib/storage.ts` nutzt AWS SDK v3 generisch — kompatibel mit Cloudflare R2, Hetzner Object Storage, IONOS oder jedem anderen S3-kompatiblen Anbieter in EU-Regionen.
- **Datenabruf serverseitig:** Keine Business-Logik in Client Components. Alle DB-Abfragen in Server Components oder Server Actions.

---

## Routen

| Route | Beschreibung |
|---|---|
| `/artists` | Artist-Liste (Server Component, Tabellenansicht) |
| `/artists/new` | Artist anlegen (eigene Seite) |
| `/artists/[id]` | Artist-Detail mit Tabs |
| `/artists/[id]/edit` | Artist bearbeiten (eigene Seite) |
| `/artists/[id]/projects/new` | Projekt anlegen |
| `/artists/[id]/projects/[projectId]/edit` | Projekt bearbeiten |

---

## Dateistruktur

```
src/
  app/(dashboard)/
    artists/
      page.tsx                              # Artist-Liste
      new/page.tsx                          # Artist anlegen
      [id]/
        page.tsx                            # Artist-Detail (Tabs)
        edit/page.tsx                       # Artist bearbeiten
        projects/
          new/page.tsx                      # Projekt anlegen
          [projectId]/
            edit/page.tsx                   # Projekt bearbeiten

  modules/artists/
    actions/
      artist.actions.ts                     # CRUD für Artists
      project.actions.ts                    # CRUD für Projects
    components/
      ArtistTable.tsx                       # Tabelle (Client Component)
      ArtistForm.tsx                        # Create/Edit-Formular (Client Component)
      ProjectList.tsx                       # Projektliste im Tab (Server Component)
      ProjectForm.tsx                       # Projekt-Formular (Client Component)
```

---

## Datenfluss

**Pattern:** Server Component → liest Daten direkt via Prisma → rendert HTML  
**Mutation:** Client Component → ruft Server Action auf → `redirect()` nach Erfolg

### Return-Typ aller Server Actions (erstes Auftreten dieses Patterns im Projekt)

```typescript
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }
```

### Artist Actions (`modules/artists/actions/artist.actions.ts`)

```typescript
getArtists(): Promise<Artist[]>
getArtistById(id: string): Promise<Artist & { projects: Project[] } | null>
createArtist(formData: FormData): Promise<ActionResult>   // redirectet zu /artists/[id]
updateArtist(id: string, formData: FormData): Promise<ActionResult>  // redirectet zu /artists/[id]
deleteArtist(id: string): Promise<ActionResult>            // redirectet zu /artists
```

### Project Actions (`modules/artists/actions/project.actions.ts`)

```typescript
createProject(artistId: string, formData: FormData): Promise<ActionResult>          // redirectet zu /artists/[artistId]
updateProject(id: string, artistId: string, formData: FormData): Promise<ActionResult>  // redirectet zu /artists/[artistId]
deleteProject(id: string, artistId: string): Promise<ActionResult>                  // redirectet zu /artists/[artistId]
```

### Zod-Validierung (inline in den Action-Dateien)

```typescript
const ArtistSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Ungültige E-Mail").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Ungültige URL").optional().or(z.literal("")),
})

const ProjectSchema = z.object({
  name: z.string().min(1, "Projektname ist erforderlich"),
  genre: z.string().optional(),
  lineup: z.string().optional(),
  description: z.string().optional(),
})
```

---

## Komponenten

### `ArtistTable.tsx` (Client Component)
- Tabellenspalten: Name, E-Mail, Telefon, Anzahl Projekte, Angelegt
- Jede Zeile klickbar → `/artists/[id]`
- Button "Artist anlegen" → `/artists/new`
- Leerer Zustand: bestehende `EmptyState`-Komponente

### `ArtistForm.tsx` (Client Component)
- Felder: Name (Pflicht), E-Mail, Telefon, Website
- Nutzt bestehende UI-Komponenten: `Input`, `Button`, `Card`
- Fehler inline unter jedem Feld via `error`-Prop von `Input`
- Submit via `useActionState` (React 19) — kein Page-Reload bei Validierungsfehler

### Artist-Detailseite `/artists/[id]/page.tsx` (Server Component)
- Header: Artist-Name + "Bearbeiten"-Button
- Drei Tabs, gesteuert via URL-Param `?tab=projekte`:
  - **Übersicht:** Kontaktdaten in einem `Card`
  - **Projekte:** `ProjectList` + "Projekt anlegen"-Button
  - **Bookings:** `EmptyState` mit Hinweis "verfügbar ab Phase 4"

### `ProjectList.tsx` (Server Component)
- Liste der Projekte: Name, Genre, Besetzung
- Pro Zeile: "Bearbeiten"- und "Löschen"-Button
- Löschen via Server Action direkt (kein Confirm-Dialog für MVP)

### `ProjectForm.tsx` (Client Component)
- Felder: Name (Pflicht), Genre, Besetzung, Beschreibung (`Textarea`)
- Gleiche Patterns wie `ArtistForm`

---

## Fehlerbehandlung

- **Validierungsfehler:** Per `useActionState` zurück ans Formular, Fehlertext inline unter dem Feld
- **DB-Fehler:** Generische Meldung "Speichern fehlgeschlagen, bitte erneut versuchen"
- **Löschen mit abhängigen Bookings:** Prisma wirft FK-Constraint-Fehler → wird als Fehlermeldung zurückgegeben ("Artist kann nicht gelöscht werden, da noch Bookings vorhanden sind")

---

## Verifikation

Da kein Testframework installiert ist, erfolgt Verifikation manuell:

1. `pnpm typecheck` — nach jeder neuen Datei
2. Manuelle Durchklickstrecke:
   - Artist anlegen → in Liste sichtbar
   - Artist-Detailseite öffnen → Tabs wechseln
   - Projekt anlegen → im Projekte-Tab sichtbar
   - Artist bearbeiten → Änderungen gespeichert
   - Projekt bearbeiten → Änderungen gespeichert
   - Artist löschen → nicht mehr in Liste
3. `pnpm build` am Ende — prüft Server Components auf Fehler

---

## Bewusste Nicht-Scope (kommen später)

- Bewertungen (Sterne 1–5)
- Notizen pro Artist
- Volltextsuche (PostgreSQL tsvector)
- CSV-Import
- React Query / optimistisches Update
