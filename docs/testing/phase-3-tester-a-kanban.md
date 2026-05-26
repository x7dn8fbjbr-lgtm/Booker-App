# Phase 3 — Tester A: Kanban & Navigation

**Modul:** Booking-CRM  
**Fokus:** Kanban-Board, Drag & Drop, Navigation

**Vorbedingung:** Mindestens 2 Artists und 2 Venues müssen in der Datenbank existieren.

---

- [ ] `/bookings` lädt ohne Fehler
- [ ] Vier Spalten sichtbar: Erstkontakt, In Verhandlung, Bestätigt, Abgesagt
- [ ] „Abgesagt"-Spalte ist optisch gedämpft (grauer Hintergrund)
- [ ] Leere Spalten zeigen Anzahl „0"
- [ ] „Booking anlegen"-Button oben rechts → führt zu `/bookings/new`
- [ ] Booking anlegen (Artist + Venue + Datum) → Karte erscheint im Kanban
- [ ] Karte von „Erstkontakt" nach „In Verhandlung" ziehen → Spalte wechselt sofort (optimistisch)
- [ ] Karte wieder zurückziehen → funktioniert
- [ ] Klick auf Karte (ohne Ziehen) → öffnet Detail-Seite `/bookings/[id]`
- [ ] Karte zeigt: Artist-Name, Venue-Name + Stadt, Datum (deutsch formatiert)
- [ ] Karte zeigt Projekt-Badge, wenn Projekt ausgewählt ist
- [ ] Nach Seiten-Reload: Status der verschobenen Karte ist korrekt gespeichert
