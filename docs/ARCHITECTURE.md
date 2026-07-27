# Architekturüberblick

## Laufzeit

Fieberwache verwendet Expo und React Native mit Expo Router. Die Anwendung läuft nativ auf iOS und Android; die Web-Ausgabe dient zusätzlich als lokale Vorschau.

## Schichten

```text
Screens in app/
    ↓
UI-Primitives und Fachkomponenten in components/
    ↓
Store, Fachlogik und Plattformdienste in lib/
    ↓
Secure Store / AsyncStorage / Supabase / Betriebssystem-Benachrichtigungen
```

### Präsentation

`app/` enthält Navigation und Screen-Komposition. `components/ui/` bildet das Designsystem. Fachkomponenten wie Avatar, Reminder Center oder App Shell bleiben außerhalb einzelner Screens wiederverwendbar.

### Domäne und Zustand

`lib/store.tsx` hält Kinder, Temperaturmessungen, Medikamentengaben, Inventar, Arztkontakt und Termine. Fachberechnungen sind in eigenständige Module ausgelagert:

- `temperature-guidance.ts`
- `u-checkups.ts`
- `night-schedule.ts`
- `date-time.ts`

### Plattformdienste

- `notifications.ts`: Gerätegerichtete Erinnerungen und Berechtigungen
- `secure-storage.ts`: verschlüsselte native Speicherung und browserlokale Alternative
- `auth.tsx` / `supabase.ts`: Sitzung, Google OAuth und optionale Cloud-Synchronisierung
- `use-connectivity.*`: plattformspezifische Verbindungszustände

## Datenfluss

Screens lesen und ändern Zustand ausschließlich über die öffentlich vorgesehenen Store-Aktionen. Persistierung und optionale Synchronisierung bleiben hinter der Store-Grenze. Benachrichtigungen sind abgeleitete Betriebssystemaktionen; ein Fehler beim Planen darf den fachlichen Eintrag nicht unbemerkt verlieren.

## Architekturregeln

- UI kennt keine Supabase-Tabellenstruktur.
- Domänenberechnungen bleiben unabhängig von React, wenn kein React-Zustand benötigt wird.
- Plattformvarianten verwenden `.web.ts` beziehungsweise native Implementierung mit gleicher öffentlicher Schnittstelle.
- Persistierte Schemaänderungen erhalten eine explizite Normalisierung oder Migration.
- Medizinische Regeln werden nicht in JSX oder Styling versteckt.
- Wiederverwendbare Designentscheidungen wandern in Tokens oder UI-Primitives.

## Geplante Härtung

Vor einem öffentlichen Release sind besonders wichtig:

- versioniertes Schema für lokal persistierte Daten
- automatisierte Tests der Fachmodule und Store-Migrationen
- Datenexport und vollständige Kontolöschung
- Monitoring ohne Gesundheitsdaten in Telemetrie
- fachlich-regulatorische Freigabe medizinischer Inhalte
- native End-to-End-Tests für Benachrichtigungen, Zeitzonen und Sommerzeit
