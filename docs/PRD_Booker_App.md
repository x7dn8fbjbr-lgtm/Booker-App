# Product Requirements Document – Booker App

**Version:** 1.0  
**Datum:** 24. Mai 2026  
**Status:** Entwurf  
**Autor:** (Auftraggeber: Jan)

---

## 1. Produktübersicht

### 1.1 Vision
Eine webbasierte Booking-Management-Applikation für professionelle Booker und Tourmanager, die den gesamten Prozess der Künstlervermittlung – von der Artist-Verwaltung über die Venue-Recherche bis hin zur Tourplanung – in einer zentralen Plattform abbildet.

### 1.2 Zielgruppe
- Professionelle Booker und Booking-Agenturen
- Tourmanager
- Veranstalter von Festivals und Mehrfach-Events

### 1.3 Kernproblem
Booker verwalten aktuell Künstler-Informationen und Bewertungen aus **sieben verschiedenen Listen** in unterschiedlichen Quellen. Es gibt keine zentrale Datenbank, die Artists, Venues, Verhandlungsstände und Dokumente miteinander verbindet.

---

## 2. Module & Funktionsbereiche

### Modul 1: Artist-Datenbank
### Modul 2: Venue-Datenbank
### Modul 3: Booking-CRM (Verhandlung & Kommunikation)
### Modul 4: Dokumentenmanagement (Rider, Pressetexte, Fotos)
### Modul 5: Event- & Tourplanung

---

## 3. User Stories & Akzeptanzkriterien

---

### Modul 1: Artist-Datenbank

#### US-101 – Artist-Stammdaten zusammenführen
**Als** Booker  
**möchte ich** alle vorhandenen Künstler-Informationen aus meinen bisherigen Listen in eine zentrale Datenbank importieren,  
**damit** ich alle Künstler an einem Ort verwalten kann.

**Akzeptanzkriterien:**
- Der Nutzer kann Daten aus CSV/Excel importieren
- Duplikate werden erkannt und können manuell zusammengeführt werden
- Bewertungen und Notizen aus bestehenden Listen bleiben erhalten

---

#### US-102 – Artist-Profile mit mehreren Projekten
**Als** Booker  
**möchte ich** einem Artist mehrere Projekte (z. B. Bandprojekt, Solo-Projekt) zuordnen können,  
**damit** ich projektspezifische Informationen getrennt hinterlegen kann.

**Akzeptanzkriterien:**
- Ein Artist kann 1–n Projekte besitzen
- Jedes Projekt hat eigene Felder: Name, Genre, Besetzung, Beschreibung
- Dokumente (Rider, Pressetexte) sind pro Projekt hinterlegbar
- In der Übersicht ist erkennbar, zu welchem Artist ein Projekt gehört

---

#### US-103 – Bewertungen & Notizen
**Als** Booker  
**möchte ich** Künstler und Projekte mit eigenen Bewertungen und Freitext-Notizen versehen,  
**damit** ich meine persönliche Einschätzung dokumentieren kann.

**Akzeptanzkriterien:**
- Bewertungssystem (z. B. 1–5 Sterne) pro Artist und pro Projekt
- Freitext-Notizfeld mit Zeitstempel
- Notizen sind durchsuchbar

---

### Modul 2: Venue-Datenbank

#### US-201 – Venue-Liste aus dem Internet befüllen
**Als** Booker  
**möchte ich** eine aus dem Internet befüllte Liste aller Live-Clubs und Venues in Deutschland abrufen können,  
**damit** ich nicht manuell recherchieren muss.

**Akzeptanzkriterien:**
- Die App enthält eine vorbespielte oder regelmäßig aktualisierte Venue-Datenbank für Deutschland
- Felder: Name, Adresse, Stadt, Kapazität, Raumgröße, Venue-Typ (Club, Festival, Theater …)
- Neue Venues können manuell hinzugefügt werden

---

#### US-202 – Venue-Detaildaten pflegen
**Als** Booker  
**möchte ich** zu jeder Venue Ansprechpartner, Raumgröße und typisches Musikprogramm hinterlegen,  
**damit** ich schnell einschätzen kann, ob ein Künstler zur Venue passt.

**Akzeptanzkriterien:**
- Felder: Ansprechpartner (Name, E-Mail, Telefon, Rolle)
- Felder: Raumkapazität, Bühnenmaße
- Felder: Typisches Genre / übliche Acts (Freitext oder Tags)
- Mehrere Ansprechpartner pro Venue möglich

---

### Modul 3: Booking-CRM

#### US-301 – Artist und Venue verknüpfen
**Als** Booker  
**möchte ich** einen Artist (bzw. ein Projekt) mit einer Venue für ein konkretes Datum und eine Uhrzeit verbinden,  
**damit** ich einen Booking-Vorgang anlegen kann.

**Akzeptanzkriterien:**
- Booking-Datensatz enthält: Artist/Projekt, Venue, Datum, Uhrzeit, Ansprechpartner
- Status-Workflow: Erstkontakt → In Verhandlung → Bestätigt → Abgesagt
- Mehrere Bookings pro Artist und pro Venue möglich

---

#### US-302 – Kommunikation & E-Mails dokumentieren
**Als** Booker  
**möchte ich** E-Mails und Gesprächsnotizen an einen Booking-Vorgang anhängen,  
**damit** ich den Kommunikationsverlauf nachvollziehen kann.

**Akzeptanzkriterien:**
- Freitextfeld für Gesprächsnotizen mit Zeitstempel und Kontaktperson
- Möglichkeit, E-Mails als Dateianhang hochzuladen oder einzufügen
- Chronologische Ansicht aller Kommunikationseinträge pro Booking

---

#### US-303 – Verhandlungsdetails festhalten
**Als** Booker  
**möchte ich** Gagenverhandlungen, Rahmenbedingungen und Sonderkonditionen dokumentieren,  
**damit** alle Vereinbarungen verbindlich nachvollziehbar sind.

**Akzeptanzkriterien:**
- Felder: Verhandelte Gage, Währung
- Felder: Fahrtkosten / Benzingeld, Übernachtungskosten
- Felder: Sonstige Konditionen (Freitext)
- Änderungshistorie: Jede Anpassung wird mit Zeitstempel gespeichert

---

### Modul 4: Dokumentenmanagement

#### US-401 – Stage Plot & Technical Rider hinterlegen
**Als** Booker  
**möchte ich** für jeden Artist bzw. jedes Projekt einen Stage Plot und einen Technical Rider hochladen,  
**damit** ich diese Dokumente bei Buchungen direkt zur Verfügung habe.

**Akzeptanzkriterien:**
- Upload von PDF, DOCX, JPG/PNG
- Dokumente sind dem Artist-Profil oder einem Projekt zugeordnet
- Dokumente können beim Booking direkt referenziert oder versendet werden

---

#### US-402 – Hospitality Rider & Sonderwünsche
**Als** Booker  
**möchte ich** Hospitality-Anforderungen (Catering, Getränke, Ernährungsbesonderheiten) pro Artist hinterlegen,  
**damit** Venues diese Informationen rechtzeitig erhalten.

**Akzeptanzkriterien:**
- Strukturiertes Formular: Ernährung, Getränke, sonstige Wünsche
- Alternativ: Upload als Datei
- Verknüpfung mit dem Booking für einfaches Weiterleiten

---

#### US-403 – Pressetexte & Pressefotos verwalten
**Als** Booker  
**möchte ich** aktuelle Pressetexte und Pressefotos pro Artist/Projekt speichern,  
**damit** ich diese bei Anfragen schnell bereitstellen kann.

**Akzeptanzkriterien:**
- Upload von Pressetexten (PDF, DOCX, TXT)
- Upload von Pressefotos (JPG, PNG, min. 300 dpi-Hinweis)
- Versionierung: Ältere Versionen bleiben erhalten und sind abrufbar
- Direkt-Download-Link für externen Versand

---

### Modul 5: Event- & Tourplanung

#### US-501 – Tournee anlegen & managen
**Als** Booker  
**möchte ich** mehrere Bookings zu einer Tournee zusammenfassen,  
**damit** ich den Überblick über Reiselogistik und Auftrittsfolge behalte.

**Akzeptanzkriterien:**
- Tour-Datensatz mit Name, Zeitraum, Artist/Projekt
- Bookings können einer Tour zugeordnet werden
- Kalenderansicht aller Tour-Termine
- Export als PDF oder iCal

---

#### US-502 – Mehrere Bühnen bei Festival/Großveranstaltung verplanen
**Als** Veranstalter  
**möchte ich** bei einem Festival mehrere Bühnen mit eigenen Zeitplänen anlegen und unterschiedliche Acts zuweisen,  
**damit** ich den gesamten Ablauf strukturiert planen kann.

**Akzeptanzkriterien:**
- Veranstaltung kann mehrere Bühnen/Stages enthalten
- Jeder Stage kann ein eigenes Zeitraster (Slots) zugewiesen werden
- Acts (Artists/Projekte) werden per Drag & Drop oder Auswahl in Slots eingetragen
- Konflikte (doppelte Belegung) werden visuell markiert
- Übersichtsplan exportierbar (PDF / Druckansicht)

---

## 4. Nicht-funktionale Anforderungen

| Kategorie | Anforderung |
|---|---|
| **Plattform** | Web-App (Browser-basiert, responsiv) |
| **Datenspeicherung** | Cloud-basiert, Online-Speicherplatz für Dokumente |
| **Datenschutz** | DSGVO-konform (Daten in der EU) |
| **Zugriffsschutz** | Login mit Benutzerauthentifizierung |
| **Suche** | Volltextsuche über Artists, Venues und Bookings |
| **Performance** | Seitenaufbau < 2 Sekunden bei normaler Internetverbindung |

---

## 5. Offene Fragen

| # | Frage | Priorität |
|---|---|---|
| 1 | Soll die App Multi-User-fähig sein (Teamzugang für mehrere Booker)? | Hoch |
| 2 | Welche externe Quelle / API soll für die Venue-Datenbank genutzt werden? | Hoch |
| 3 | Ist eine E-Mail-Integration (direktes Senden aus der App) gewünscht? | Mittel |
| 4 | Soll es eine mobile App (iOS/Android) geben oder reicht die Web-App? | Mittel |
| 5 | Welche Import-Formate sind für die bestehenden 7 Listen vorhanden? | Hoch |
| 6 | Ist eine Rechnungsstellung / Vertragsmanagement-Funktion geplant? | Niedrig |

---

## 6. Priorisierung (MoSCoW)

| Priorität | Features |
|---|---|
| **Must Have** | Artist-DB, Venue-DB, Booking-CRM (Verknüpfung + Status), Dokumenten-Upload |
| **Should Have** | Hospitality Rider, Kommunikations-Log, Tourplanung |
| **Could Have** | Festival-Bühnenplaner, Versionierung Pressetexte, iCal-Export |
| **Won't Have (v1)** | Rechnungsstellung, Mobile App, öffentliches Künstler-Portfolio |

---

*Dieses Dokument basiert auf einem Kundeninterview (Tonaufnahme) vom 24. Mai 2026. Alle Anforderungen sind als Ausgangsbasis zu verstehen und bedürfen der Validierung mit dem Auftraggeber.*
