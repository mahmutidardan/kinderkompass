# Engineering Guidelines

## 1. Technische Leitprinzipien

Fieberwache wird als Expo-/React-Native-App für iOS, Android und eine eingeschränkte Web-Vorschau entwickelt.

- **Ein Codepfad, klare Plattformgrenzen:** Gemeinsame Logik teilen; native und Web-Fähigkeiten nur dort trennen, wo das Verhalten tatsächlich abweicht.
- **Typsicherheit vor impliziten Annahmen:** TypeScript bleibt im Strict Mode. `any`, nicht abgesicherte Type Assertions und `@ts-ignore` sind zu vermeiden.
- **Eine Quelle pro Wahrheit:** Persistenter App-Zustand liegt im Store, Designwerte in den Tokens und medizinische Schwellen in den dafür vorgesehenen Fachmodulen.
- **Rückwärtskompatible Daten:** Änderungen an gespeicherten Modellen benötigen Defaults, Normalisierung oder Migration.
- **Fehler sind Produktzustände:** Offline-, Berechtigungs-, Lade-, Leer- und Fehlerzustände werden bewusst gestaltet.

## 2. Projektstruktur

```text
app/                 Screens und Expo-Router-Navigation
components/ui/       Wiederverwendbare UI-Primitives
components/          Domänenspezifische, wiederverwendbare Komponenten
constants/           Design- und Theme-Tokens
hooks/               Plattformübergreifende React Hooks
lib/                 Domänenlogik, Store, Auth, Speicher, Zeit und Benachrichtigungen
supabase/migrations/ Versionierte Backend-Schemaänderungen
docs/                Produkt-, Design- und Engineering-Regeln
```

Screens orchestrieren Daten und Komponenten. Wiederverwendbare Geschäftslogik gehört nicht in Screen-Dateien. Eine neue Abstraktion wird erst erstellt, wenn sie eine erkennbare Domänenverantwortung oder tatsächliche Wiederverwendung besitzt.

## 3. TypeScript und Benennung

- Komponenten und Typen: `PascalCase`
- Funktionen, Variablen und Hooks: `camelCase`
- Hooks beginnen mit `use`.
- Konstanten nur dann in `UPPER_SNAKE_CASE`, wenn sie modulweit unveränderliche Konfiguration darstellen.
- Boolesche Werte beginnen bevorzugt mit `is`, `has`, `can` oder `should`.
- Handler benennen die Aktion: `handleSaveAppointment`, nicht `handleClick`.
- Persistierte IDs sind stabile Strings; Listen verwenden keine Array-Indizes als Keys.

Union Types sind für geschlossene Zustände zu bevorzugen. Datumswerte werden an Systemgrenzen als ISO-Strings gespeichert; Formatierung für Menschen erfolgt erst in der Darstellung.

## 4. React und State

- Abgeleitete Werte mit `useMemo` nur bei messbarem Nutzen oder notwendiger Referenzstabilität.
- Seiteneffekte klein halten und vollständig aufräumen.
- Keine Netzwerk-, Storage- oder Notification-Aufrufe direkt während des Renderns.
- Formulare verwenden lokalen Entwurfszustand; persistiert wird erst nach erfolgreicher Validierung.
- Optimistische UI nur verwenden, wenn ein Fehlschlag sichtbar rückgängig gemacht werden kann.
- Kontextwerte stabil halten und Store-Aktionen mit klaren Domänenverben benennen.

## 5. Daten, Datenschutz und Sicherheit

- Gesundheitsdaten werden nach Datenminimierung behandelt.
- Native lokale Daten bleiben verschlüsselt; Webspeicherung ist ausdrücklich als browserlokal zu kennzeichnen.
- Supabase-Zugriffe müssen nutzergebunden und durch Row Level Security geschützt bleiben.
- Keine sensitiven Werte in `EXPO_PUBLIC_*`, Quellcode, Logs oder Analytics.
- Testdaten müssen eindeutig fiktiv sein.
- Löschvorgänge benötigen eine bestätigte Zielidentität und bei wesentlichen Daten eine Bestätigung im UI.
- Datenexport, Kontolöschung und Aufbewahrung sind vor öffentlichem Release zu spezifizieren.

## 6. Medizinische Produktgrenzen

- Die App dokumentiert Nutzereingaben und selbst konfigurierte Erinnerungen.
- Sie bestätigt weder Dosierung noch frühestmögliche sichere Einnahme.
- Neue medizinische Inhalte benötigen Quelle, Zielalter, Messmethode, Stand der Prüfung und fachliche Freigabe.
- Kritische Symptome dürfen nicht ausschließlich über Temperaturwerte bewertet werden.
- Formulierungen sollen konkrete nächste Schritte ermöglichen, ohne Sicherheit vorzutäuschen.

## 7. Fehlerbehandlung

- Erwartbare Fehler erhalten verständliche, handlungsorientierte Meldungen.
- Technische Details werden nicht ungefiltert angezeigt.
- Benachrichtigungs- und Berechtigungsfehler dürfen gespeicherte Gesundheitsdaten nicht verwerfen.
- Asynchrone Aktionen schützen gegen Doppelausführung.
- Nach einem Fehler bleiben Eingaben erhalten, sofern Datenschutz oder Sicherheit nicht entgegenstehen.

## 8. Tests und Qualität

Aktuelle Baseline:

```bash
npm run lint
npm run typecheck
npm run build:web
```

`npm run check` führt diese Prüfungen zusammen.

Nächste Teststufe:

- Unit-Tests für Temperaturklassifikation, U-Untersuchungszeiträume, Nachtplanung und Datumshilfen
- Store-Tests für Erstellen, Bearbeiten, Löschen und Datenmigration
- Komponenten-Tests für Dialoge, Datum-/Zeitauswahl und Validierung
- wenige, kritische End-to-End-Flows für Messung, Medikamentengabe, Termin und Nachtalarm

Tests sollen Verhalten prüfen, nicht Implementierungsdetails. Für zeitabhängige Tests werden Zeit und Zeitzone kontrolliert.

## 9. Performance und Barrierefreiheit

- Lange Listen virtualisieren; unnötige Re-Renders nicht durch vorschnelle Memoisierung, sondern durch klare Zustandsgrenzen vermeiden.
- Touch-Ziele sind mindestens 44 × 44 Punkte groß.
- Interaktive Elemente besitzen Rolle, verständlichen Namen und gegebenenfalls Zustandswert.
- Farbe ist nie das einzige Statussignal.
- Dynamische Schriftgrößen, Screenreader-Reihenfolge, Tastatur und reduzierte Bewegung werden berücksichtigt.

## 10. Abhängigkeiten

Neue Pakete benötigen einen klaren Produktnutzen, aktive Wartung, passende Lizenz und vertretbare Bundle-/Datenschutzkosten. Bestehende Expo- oder React-Native-Funktionen sind zu bevorzugen. Abhängigkeiten werden nicht allein für geringfügige optische Effekte ergänzt.
