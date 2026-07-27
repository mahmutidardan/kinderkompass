# Sicherheitsrichtlinie

Fieberwache verarbeitet potenziell sensible Gesundheits- und Familiendaten. Sicherheitsprobleme sollen daher nicht in einem öffentlichen Issue mit echten Daten beschrieben werden.

## Melden einer Schwachstelle

Nach Einrichtung des GitHub-Repositorys soll für vertrauliche Meldungen „Private vulnerability reporting“ beziehungsweise ein privater Security Advisory verwendet werden. Bis dahin bitte keine personenbezogenen Daten, Zugangsdaten oder vollständigen Datensätze weitergeben.

Eine gute Meldung enthält:

- betroffene App-Version und Plattform
- reproduzierbare Schritte mit ausschließlich fiktiven Daten
- mögliche Auswirkung
- vorgeschlagene Abhilfe, falls bekannt

## Unterstützte Versionen

Während der MVP-Phase wird nur der aktuelle Stand von `main` aktiv gepflegt. Mit dem ersten öffentlichen Release wird hier eine konkrete Support-Matrix ergänzt.

## Geheimnisse

Secrets gehören weder in Git noch in `EXPO_PUBLIC_*`-Variablen. Falls ein Secret versehentlich veröffentlicht wurde, muss es widerrufen und ersetzt werden; das bloße Entfernen aus einem späteren Commit reicht nicht.
