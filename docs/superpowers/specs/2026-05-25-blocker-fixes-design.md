# Design: Blocker-Fixes — Middleware & cn()

**Datum:** 2026-05-25  
**Status:** Approved  

---

## Kontext

Zwei kritische Bugs blockieren jede weitere Feature-Entwicklung:

1. Die Next.js-Middleware hat den falschen Dateinamen und wird nicht erkannt — Auth-Schutz ist deaktiviert.
2. Die `cn()`-Hilfsfunktion importiert `clsx`, ruft es aber nicht auf — Object-Syntax-Klassen werden nicht verarbeitet.

---

## Fix 1: Middleware-Dateiname

**Datei:** `src/proxy.ts` → `src/middleware.ts`

Next.js erkennt eine Middleware-Datei ausschließlich über ihren Pfad (`src/middleware.ts` oder `middleware.ts` im Root). Die Datei `src/proxy.ts` wird ignoriert, der `config.matcher` greift nicht.

**Änderung:** Datei umbenennen. Inhalt bleibt unverändert.

**Auswirkung:** Alle Routen außer `/login`, `/api/auth/**`, `_next/static/**`, `_next/image/**` und `favicon.ico` werden durch `withAuth` geschützt. Nicht-eingeloggte Nutzer werden auf `/login` weitergeleitet.

**Risiko:** Keines. Die Datei wird nirgendwo importiert.

---

## Fix 2: `cn()` in `src/lib/utils.ts`

**Problem:** `clsx` wird importiert aber nicht aufgerufen.

```typescript
// vorher (fehlerhaft)
return inputs.filter(Boolean).join(" ");

// nachher (korrekt)
return clsx(inputs);
```

**Auswirkung:** Alle bestehenden Aufrufe verhalten sich identisch. Zusätzlich werden Object-Syntax-Aufrufe (`{ 'bg-red-500': hasError }`) korrekt verarbeitet — bisher nicht genutzt, aber ab sofort möglich.

**Keine neue Dependency.** `clsx` ist bereits in `package.json` vorhanden.  
`tailwind-merge` wird bewusst nicht hinzugefügt (YAGNI — keine kollidierenden Klassen im Codebase).

---

## Scope

Genau zwei Dateien, je eine Zeile Änderung. Kein Refactor, keine neuen Abhängigkeiten, keine API-Änderungen.
