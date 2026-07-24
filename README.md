# Fieberwache

Ein familienorientiertes Gesundheitstagebuch für iOS, Android und eine eingeschränkte Browser-Vorschau. Eltern können Temperaturmessungen, selbst vorgenommene Medikamentengaben, Erinnerungen und Arzttermine für mehrere Kinder dokumentieren.

## Enthalten

- mehrere lokale Kinderprofile
- gezeichneter Avatar pro Kinderprofil mit Hautton, Frisur, Haarfarbe, Kleidung, Accessoire und Hintergrund
- Tagesansicht mit interaktiver Wochenleiste und nach Uhrzeit gruppierter Ereignis-Timeline
- zentrales UI-System für Karten, Buttons, Formulare, Abstände und Abschnittsüberschriften
- Loginbereich mit vorbereitetem Google-OAuth, lokalem Testmodus und Abmeldebestätigung
- getrennte lokale Datenspeicher für Gastmodus und öffentliches Testkonto
- verschlüsselte lokale Gesundheitsdaten auf iPhone und Android
- optionale kontogebundene Synchronisierung über Supabase
- Temperaturmessungen per 0,1-°C-Slider mit Messmethode und Notiz
- animierte, altersabhängige Farb- und Statusorientierung von normaler Temperatur bis hohem Fieber
- korrigier- und löschbare Messungen und Medikamentengaben inklusive nachträglicher Zeitangabe
- moderner Temperaturverlauf mit Zeitfiltern, antippbaren Messpunkten und altersabhängigen Temperaturzonen
- Medikamentenverlauf als übersichtliche Zeitleiste mit Uhrzeit, Mittel und Menge
- Medikamentendokumentation mit frei eingegebenem Namen und Menge
- Medikamenteninventar mit wiederverwendbaren Präparaten, eigener Mengenangabe und eigenem Erinnerungsintervall
- Kinderarzt-Kontakt pro Kinderprofil mit Telefon und Adresse
- automatisch aus dem Geburtsdatum berechnete Übersicht der U1–U9-Zeiträume
- lokaler Arztterminkalender mit Notizen und frei wählbarer Vorab-Erinnerung
- zentrale Übersicht aller aktiven Geräteerinnerungen mit Ausschaltmöglichkeit
- ersetzbare statt sich stapelnde Mess-, Medikamenten-, Nacht- und Terminerinnerungen
- separater Nachtalarm mit Intervall- und manueller Planung
- eindeutige Offline-, Berechtigungs-, Fehler- und Erfolgszustände

Die App gibt keine Diagnose, berechnet keine Dosierung und bestätigt nicht, ob eine weitere Medikamentengabe erlaubt ist. Medikamentenerinnerungen geben ausschließlich den von der nutzenden Person eingestellten Zeitpunkt wieder.

Medikamente werden einmalig im Tab „Inventar“ angelegt. Beim Dokumentieren einer Gabe kann ein Inventarpräparat ausgewählt werden; Name, Mengenangabe und Erinnerungsintervall werden übernommen und bleiben für die jeweilige Gabe anpassbar.

## Entwicklungsstandard

Die Entwicklung folgt einem geschützten GitHub-Flow mit kurzlebigen Branches, Pull Requests und automatischer Qualitätsprüfung. Die verbindlichen Regeln stehen hier:

- [Engineering Guidelines](docs/ENGINEERING_GUIDELINES.md)
- [Design Guidelines](docs/DESIGN_GUIDELINES.md)
- [Architektur](docs/ARCHITECTURE.md)
- [Branching und Releases](docs/BRANCHING_AND_RELEASES.md)
- [GitHub-Einrichtung](docs/GITHUB_SETUP.md)
- [Beitragen und Definition of Done](CONTRIBUTING.md)
- [Sicherheitsrichtlinie](SECURITY.md)

Für neue Screens, Redesigns und UX-Reviews gilt zusätzlich der persönliche Skill `$craft-premium-mobile-ux`. Er unterstützt konsistente Designentscheidungen, vollständige Interaktionszustände, Accessibility, Health-UX und mobile Darstellungsqualität.

## Lokal starten

Voraussetzung ist Node.js 20 oder neuer.

```bash
npm ci
npm start
```

Danach kann die App mit Expo Go auf einem iPhone oder Android-Gerät geöffnet werden. Alternativ startet `npm run web` die Browser-Vorschau. Die Browser-Version speichert nur im jeweiligen Browserprofil und kann keine zuverlässigen Geräte- oder Nachtalarme auslösen.

### Dauerhafter Zugriff im eigenen WLAN

Der lokale Webserver startet nach der Windows-Anmeldung automatisch im Hintergrund auf Port `8083`.
Auf einem Handy im selben WLAN ist die App bevorzugt über den lokalen Rechnernamen erreichbar:

```text
http://dardan.local:8083
```

Falls ein Gerät lokale Rechnernamen nicht auflöst, dient `http://192.168.178.172:8083` als aktuelle
IP-Alternative. Der PC muss eingeschaltet und mit dem WLAN verbunden sein. `localhost` funktioniert nur direkt auf dem PC,
weil es auf einem Handy immer auf das Handy selbst zeigt. Der Server kann bei Bedarf auch manuell gestartet werden:

```bash
npm run start:lan -- --port 8083
```

Protokolle liegen unter `%LOCALAPPDATA%\Fieberwache`.

## Google-Anmeldung und Synchronisierung

1. `.env.example` nach `.env.local` kopieren und die Supabase-Projektwerte eintragen.
2. In Supabase Google als Auth-Provider aktivieren und die Web- sowie App-Redirect-URLs erlauben.
3. Die Migration `supabase/migrations/20260723_user_states.sql` im Supabase-Projekt ausführen.

Die Tabelle ist durch Row Level Security geschützt; ein Konto kann ausschließlich seinen eigenen App-Datensatz lesen und ändern.

## Qualitätsprüfung

```bash
npm run check
```

Der gleiche Check läuft künftig in GitHub Actions bei jedem Pull Request und bei Änderungen an `main`.

## Vor einer Veröffentlichung

Die medizinischen Inhalte und die genaue Zweckbestimmung müssen fachlich und regulatorisch geprüft werden. Zusätzlich sind ein vollständiges Datenschutzkonzept, Datenexport, native VoiceOver-/TalkBack-Tests, Geräte-Tests der Alarme und App-Store-Texte vor Veröffentlichung abzuschließen.
