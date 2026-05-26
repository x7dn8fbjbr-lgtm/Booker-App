# Phase 3 — Tester D: Detail-Seite – Kommunikation

**Modul:** Booking-CRM  
**Fokus:** Kommunikations-Log, Tag-Filter, Einträge erstellen & löschen

---

## Tab: Kommunikation

### Einträge anzeigen

- [ ] Tab öffnet ohne Fehler
- [ ] Leere Liste zeigt Hinweis (kein Fehler, kein Absturz)
- [ ] Einträge werden chronologisch angezeigt (neueste zuerst)
- [ ] Jeder Eintrag zeigt: Zeitstempel, Body-Text, Kontaktperson (wenn vorhanden), Tags als Badges

### Eintrag erstellen

- [ ] Formular am Ende der Seite sichtbar
- [ ] Body (Pflichtfeld) leer lassen → Fehlermeldung erscheint, kein Eintrag wird gespeichert
- [ ] Nur Body eingeben → Eintrag erscheint in der Liste (Kontaktperson und Tags leer/fehlen)
- [ ] Body + Kontaktperson eingeben → beides erscheint im Eintrag
- [ ] Tags kommagetrennt eingeben (z. B. `Angebot, Follow-up`) → Tags erscheinen als Badges am Eintrag
- [ ] Leerzeichen um Komma werden ignoriert (Tags werden sauber getrimmt)
- [ ] Nach dem Speichern: Formular ist geleert, Eintrag erscheint oben in der Liste

### Eintrag löschen

- [ ] Löschen-Button am Eintrag vorhanden
- [ ] Klick löscht den Eintrag sofort (kein Bestätigungs-Dialog)
- [ ] Eintrag verschwindet aus der Liste ohne Seiten-Reload

### Tag-Filter

- [ ] Tag-Filter erscheint nur, wenn mindestens ein Eintrag Tags hat
- [ ] Alle vorhandenen Tags werden als klickbare Buttons oberhalb der Liste angezeigt
- [ ] Klick auf einen Tag → nur Einträge mit diesem Tag werden angezeigt
- [ ] Erneuter Klick auf denselben Tag → Filter wird aufgehoben, alle Einträge wieder sichtbar
- [ ] Mehrere Tags gleichzeitig auswählen → OR-Logik: Einträge mit *mindestens einem* der gewählten Tags werden angezeigt
- [ ] „Filter zurücksetzen"-Button erscheint, wenn Filter aktiv ist
- [ ] „Filter zurücksetzen" → alle Einträge wieder sichtbar, alle Tag-Buttons inaktiv
