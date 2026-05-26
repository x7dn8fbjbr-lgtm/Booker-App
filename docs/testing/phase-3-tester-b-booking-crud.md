# Phase 3 — Tester B: Booking anlegen & bearbeiten

**Modul:** Booking-CRM  
**Fokus:** Formulare, Validierung, CRUD

---

## Booking anlegen

- [ ] `/bookings/new` lädt ohne Fehler
- [ ] Artist-Dropdown zeigt alle Artists alphabetisch
- [ ] Projekt-Dropdown ist deaktiviert solange kein Artist gewählt
- [ ] Artist wählen → Projekt-Dropdown lädt dynamisch (ohne Seiten-Reload)
- [ ] Artist ohne Projekte → Projekt-Dropdown bleibt deaktiviert
- [ ] Venue-Dropdown zeigt alle Venues alphabetisch, mit Stadtname in Klammern
- [ ] Formular ohne Datum absenden → Fehlermeldung unter Datumsfeld
- [ ] Formular ohne Artist absenden → Fehlermeldung unter Artist-Feld
- [ ] Formular ohne Venue absenden → Fehlermeldung unter Venue-Feld
- [ ] Vollständiges Formular absenden → Weiterleitung auf Detail-Seite

## Einstieg von Artist / Venue

- [ ] Artist-Detailseite → Tab „Bookings" → „Booking anlegen"-Button → `/bookings/new` mit Artist vorausgewählt
- [ ] Venue-Detailseite → Tab „Bookings" → „Booking anlegen"-Button → `/bookings/new` mit Venue vorausgewählt

## Booking bearbeiten

- [ ] Bearbeiten-Button auf Detail-Seite → öffnet Edit-Seite
- [ ] Alle Felder sind vorausgefüllt (Artist, Projekt, Venue, Datum, Uhrzeit, Status, Ansprechpartner)
- [ ] Projekt des bestehenden Bookings ist im Dropdown ausgewählt
- [ ] Änderung speichern → Weiterleitung auf Detail-Seite, Werte korrekt aktualisiert

## Booking löschen

- [ ] Edit-Seite → Gefahrenzone → „Booking löschen" → Booking verschwindet, Weiterleitung auf Kanban
