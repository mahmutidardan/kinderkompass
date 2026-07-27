# Branching und Releases

## Branching-Modell

Fieberwache verwendet einen schlanken GitHub-Flow. `main` ist jederzeit prüfbar und grundsätzlich releasefähig. Ein zusätzlicher dauerhafter `develop`-Branch ist für die aktuelle Teamgröße nicht vorgesehen.

Kurzlebige Branches:

```text
feat/kurze-beschreibung
fix/kurze-beschreibung
refactor/kurze-beschreibung
docs/kurze-beschreibung
chore/kurze-beschreibung
hotfix/kurze-beschreibung
```

Branches werden aus aktuellem `main` erstellt, behandeln ein zusammenhängendes Thema und nach dem Merge gelöscht.

## Pull Requests

- kein direkter Push auf `main`
- mindestens eine Freigabe, sobald ein zweiter Reviewer verfügbar ist
- alle Review-Kommentare gelöst
- CI-Job `quality` erfolgreich
- UI-Änderungen mit Vorher-/Nachher-Bild
- medizinische oder datenschutzrelevante Änderungen gesondert markiert
- bevorzugt Squash Merge mit sauberer Conventional-Commit-Nachricht

## Empfohlener Schutz für `main`

Im GitHub-Ruleset:

- Pull Request vor Merge verlangen
- erfolgreiche Statusprüfung `quality` verlangen
- offene Review-Konversationen blockieren
- lineare Historie verlangen
- Force-Push und Löschen verbieten
- Regeln auch für Administratoren anwenden
- bei Teamarbeit eine Freigabe und erneute Freigabe nach wesentlichen Änderungen verlangen

Für ein Ein-Personen-Projekt kann die Review-Pflicht vorübergehend entfallen; CI und Pull Request bleiben trotzdem verbindlich, damit Änderungen nachvollziehbar bleiben.

## Versionierung

Releases verwenden Semantic Versioning:

- `MAJOR`: inkompatible Daten- oder Verhaltensänderung
- `MINOR`: neue rückwärtskompatible Funktion
- `PATCH`: rückwärtskompatible Fehlerkorrektur

Vor stabilem Produktstatus können Vorabversionen wie `0.2.0-beta.1` verwendet werden. App-Version, native Buildnummern und Git-Tag werden in einem Release Pull Request gemeinsam aktualisiert.

## Release-Checkliste

- CI erfolgreich
- relevante native Tests auf iOS und Android
- Datenmigration und Rückwärtskompatibilität geprüft
- Benachrichtigungen inklusive Zeitzone/Sommerzeit geprüft
- Datenschutz- und medizinische Änderungen freigegeben
- Release Notes in verständlicher Sprache
- keine Testkonten, Secrets, Logs oder Build-Artefakte im Commit
- reproduzierbarer Build aus dem getaggten Commit

Eine APK oder Store-Datei wird erst als eigener, ausdrücklich beauftragter Release-Schritt erzeugt.
