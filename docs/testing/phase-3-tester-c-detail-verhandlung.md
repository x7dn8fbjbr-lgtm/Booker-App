# Phase 3 — Tester C: Detail-Seite – Übersicht & Verhandlung

**Modul:** Booking-CRM  
**Fokus:** Detail-Seite, Status-Badge, Verhandlungsdetails

---

## Tab: Übersicht

- [ ] Header zeigt `Artist · Venue` als Titel
- [ ] Status-Badge ist farbkodiert:
  - Erstkontakt = grau
  - In Verhandlung = gelb/amber
  - Bestätigt = grün
  - Abgesagt = rot
- [ ] „Bearbeiten"-Button führt zur Edit-Seite
- [ ] „← Bookings"-Link führt zurück zur Kanban-Seite
- [ ] Alle Felder korrekt angezeigt: Artist, Projekt (mit Badge), Venue + Stadt, Datum, Ansprechpartner
- [ ] Felder ohne Wert zeigen „—"
- [ ] Status-Select + „Speichern" → Status ändert sich; Badge im Header nach Reload korrekt

## Tab: Verhandlung

- [ ] Leeres Formular beim ersten Öffnen (kein Fehler)
- [ ] Gage = `0` eingeben → speichert ohne Fehler
- [ ] Fahrtkosten = `0` → speichert ohne Fehler
- [ ] Übernachtungskosten = `0` → speichert ohne Fehler
- [ ] Alle Felder füllen → speichern → Werte beim erneuten Öffnen des Tabs vorhanden
- [ ] Werte ändern → speichern → neue Werte gespeichert (kein Duplikat)
- [ ] Negativer Wert (z. B. `-100`) → Fehlermeldung unter dem Feld
- [ ] Währung (Standard „EUR") → kann geändert werden, wird gespeichert
