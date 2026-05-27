# Booker App – Stand der Dinge, 27. Mai 2026

Hey,

hier ein kurzer Überblick, wo wir gerade stehen. Die App macht richtig Fortschritte – lass mich dir erzählen, was seit dem letzten Mal passiert ist.

---

## Was läuft schon

### Artists & Venues
Die Datenbanken für Künstler und Spielstätten stehen komplett. Du kannst Artists anlegen, ihnen Projekte zuordnen (also z. B. verschiedene Bandprojekte oder Solo-Sachen), Bewertungen vergeben und Notizen hinterlegen. Bei den Venues gibt's Ansprechpartner, Kapazitäten, Bühnenmaße, Genre-Tags – alles. Und falls du bestehende Listen hast, gibt's einen CSV-Import, der dir die Tipparbeit spart.

### Booking-CRM
Das Herzstück. Du siehst alle Bookings auf einem Kanban-Board – also in vier Spalten: Erstkontakt, In Verhandlung, Bestätigt, Abgesagt. Karten einfach rüberziehen, Status ist gesetzt. Für jedes Booking gibt's eine Detailseite mit drei Tabs:

- **Übersicht** – wer, wo, wann
- **Verhandlung** – Gage, Fahrtkosten, Übernachtung, Notizen
- **Kommunikation** – ein Protokoll für alle Mails, Anrufe und Gespräche, chronologisch

### Tourplanung
Du kannst Bookings zu Touren zusammenfassen. Die Tour-Detailseite zeigt dir alle Gigs in einer sauberen Timeline, gruppiert nach Monat. Und es gibt einen iCal-Export – du schickst deinem Künstler einfach die .ics-Datei, und alle Tourdaten landen direkt im Kalender.

### Festival-Planer
Für Festivals gibt's einen eigenen Bühnenplaner. Du legst Bühnen an, ziehst Künstler per Drag & Drop in die Zeitslots – und siehst sofort, ob sich etwas überschneidet.

### Dashboard
Die Startseite zeigt dir auf einen Blick: wie viele Artists und Venues du hast, wie viele Bookings offen oder bestätigt sind – und direkt darunter deine nächsten fünf bestätigten Termine.

---

## Was noch fehlt

Eins noch auf der Liste: das **Dokumentenmanagement**. Also Rider, Pressetexte und Fotos direkt in der App ablegen und mit Artists oder Bookings verknüpfen. Das ist der nächste Schritt.

---

## Wo läuft das Ganze

Die App ist live auf Vercel, automatischer Deploy sobald was geändert wird. Datenbank läuft auf Supabase. Kannst du dir also jederzeit anschauen.

Meld dich, wenn du Feedback hast oder was anders aussehen soll – wir bauen das ja für dich.

Bis bald!
