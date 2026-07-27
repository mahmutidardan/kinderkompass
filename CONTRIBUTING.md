# Zu Fieberwache beitragen

## Lokales Setup

Voraussetzungen:

- Node.js 20 oder neuer
- npm
- für native Tests: eine aktuelle Expo-kompatible iOS- oder Android-Umgebung

```bash
npm ci
npm start
```

Die Browser-Vorschau startet mit `npm run web`. Sie ersetzt keine Tests nativer Alarme, Berechtigungen oder sicherer Gerätespeicherung.

## Workflow

1. Aktuellen Stand von `main` holen.
2. Einen kurzlebigen Branch anlegen, zum Beispiel `feat/termin-erinnerung` oder `fix/nachtalarm-status`.
3. Eine fachlich zusammenhängende Änderung umsetzen.
4. `npm run check` ausführen.
5. Pull Request mit Screenshots bei UI-Änderungen und ausgefüllter Prüfliste öffnen.
6. Erst nach erfolgreicher CI, gelösten Kommentaren und Review mergen.

Direkte Pushes auf `main`, Force-Pushes auf gemeinsam genutzte Branches und Commits von generierten Builds sind nicht vorgesehen.

## Commit-Nachrichten

Wir verwenden Conventional Commits:

```text
feat: vergangene Temperaturmessung ergänzen
fix: Nachtalarm-Status sichtbar halten
docs: Designrichtlinien ergänzen
refactor: Terminformular vereinheitlichen
chore: CI-Prüfung aktualisieren
```

Ein Commit soll genau einen verständlichen Zweck haben. Große Formatierungsänderungen nicht mit fachlichen Änderungen mischen.

## Code-Review

Reviewer prüfen insbesondere:

- erfüllt die Änderung die beschriebene Nutzeraufgabe?
- sind Lade-, Leer-, Fehler-, Offline-, Berechtigungs- und Erfolgszustände berücksichtigt?
- bleiben persistierte Daten kompatibel?
- werden sensible Daten geschützt?
- nutzt die UI das bestehende Designsystem und ist sie per Screenreader bedienbar?
- entstehen medizinische Aussagen, die fachliche Freigabe benötigen?
- sind Rücknahme und Fehlerkorrektur möglich?

## Definition of Done

Eine Änderung ist fertig, wenn:

- Akzeptanzkriterien erfüllt und nachvollziehbar dokumentiert sind,
- Linting, TypeScript-Prüfung und Web-Export erfolgreich sind,
- relevante Grenzfälle geprüft wurden,
- UI-Änderungen auf kleinem iOS- und Android-Viewport visuell geprüft wurden,
- neue Texte verständlich und nicht alarmistisch formuliert sind,
- keine Secrets, personenbezogenen Daten, Logs oder Build-Artefakte enthalten sind,
- Dokumentation und Changelog-Bedarf geprüft wurden.

Medizinische Schwellenwerte, Sicherheitshinweise, Datenschutz- oder Speicheränderungen benötigen vor Veröffentlichung eine gesonderte fachliche Prüfung.
