# Fieberwache – Repository-Anweisungen

Diese Regeln gelten für automatisierte und menschliche Änderungen im gesamten Repository.

## Ziel und Sicherheitsrahmen

Fieberwache ist ein familienorientiertes Gesundheitstagebuch, kein Diagnose- oder Dosierungswerkzeug.

- Keine Diagnose, Dosierung oder Freigabe einer Medikamentengabe aus App-Daten ableiten.
- Medizinische Hinweise müssen vorsichtig formuliert, fachlich belegt und als Orientierung gekennzeichnet sein.
- Gesundheits- und Profildaten niemals in Logs, Screenshots, Analytics oder Fehlermeldungen ausgeben.
- Keine Secrets oder echten Kontodaten committen. Nur `EXPO_PUBLIC_*`-Werte verwenden, die bewusst öffentlich sein dürfen.
- Keine APK oder andere Binärdatei erzeugen, sofern der Nutzer dies nicht ausdrücklich für den aktuellen Auftrag verlangt.

## Arbeitsweise

- Änderungen erfolgen in einem kurzlebigen Branch; keine direkte Arbeit auf `main`.
- Bestehende, nicht zum Auftrag gehörende Änderungen bleiben unangetastet.
- Kleine, fokussierte Diffs bevorzugen. Duplizierte UI oder Geschäftslogik vermeiden.
- Designwerte ausschließlich aus `constants/design.ts` beziehen.
- Vor neuen UI-Bausteinen prüfen, ob `components/ui/` bereits eine passende Primitive enthält.
- Datum und Uhrzeit über `lib/date-time.ts` beziehungsweise `AppDateTimeInput` behandeln.
- Plattformunterschiede explizit berücksichtigen; Browser-Benachrichtigungen niemals wie native Alarme darstellen.
- Öffentliche Typen und persistierte Datenmodelle in `lib/store.tsx` rückwärtskompatibel ändern oder migrieren.

## Verbindliche Prüfung

Vor Abschluss einer Codeänderung:

```bash
npm run check
```

Bei geänderter nativer Interaktion zusätzlich auf kleinem iPhone- und Android-Viewport prüfen. Für gesundheitskritische Logik sind gezielte Tests oder mindestens dokumentierte Grenzfallprüfungen erforderlich.

## Relevante Leitlinien

- Engineering: `docs/ENGINEERING_GUIDELINES.md`
- Design: `docs/DESIGN_GUIDELINES.md`
- Architektur: `docs/ARCHITECTURE.md`
- Branching und Releases: `docs/BRANCHING_AND_RELEASES.md`
- Beiträge und Definition of Done: `CONTRIBUTING.md`
