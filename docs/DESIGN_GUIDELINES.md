# Design Guidelines

## 1. Produkterlebnis

Fieberwache richtet sich an Eltern, die in einer belastenden Situation schnell Sicherheit und Überblick benötigen. Die Gestaltung wirkt warm, ruhig und hochwertig – niemals klinisch kalt, verspielt-chaotisch oder alarmistisch.

Jeder Screen beantwortet zuerst:

1. Welches Kind und welcher Zeitraum sind aktiv?
2. Was ist gerade wichtig?
3. Was ist die nächste sinnvolle Aktion?

Pro Viewport gibt es eine klare Hauptaktion. Sekundäre Funktionen bleiben erreichbar, konkurrieren aber nicht visuell mit ihr.

## 2. Visuelle Sprache

Die verbindliche Quelle ist `constants/design.ts`.

### Terra-Referenz

Die in `docs/stitch/gentle-child-health-tracker/` hinterlegten Stitch-Screens sind die verbindliche Stilreferenz für neue und überarbeitete Produktoberflächen. Übernommen werden ihre Prinzipien, nicht ihr HTML: warme Cremeflächen, gedämpfte Grün- und Pfirsichtöne, klar gegliederte Karten, großzügiger Weißraum und eine ruhige, handlungsorientierte Hierarchie.

Neue Funktionen nutzen zuerst die vorhandenen Primitives aus `components/ui/` und Werte aus `constants/design.ts`. Neue, visuell ähnliche Bausteine werden als wiederverwendbare Primitive ergänzt, statt pro Screen nachgebaut zu werden.

### Farben

- `background` und `surface` bilden die warme, ruhige Basis.
- `primary` ist die führende Interaktionsfarbe.
- `peach`, `sage`, `yellow` und `lavender` dienen als zurückhaltende semantische Flächen.
- `danger` ist Warnung, Fehler oder destruktiven Aktionen vorbehalten.
- Medizinische Zustände verwenden zusätzlich immer Text und/oder Icon; niemals nur Farbe.

Keine Hexwerte direkt in Screens hinzufügen, wenn ein semantisches Token existiert. Neue Farben benötigen einen benannten Zweck und müssen Kontrast sowie Zusammenspiel mit bestehenden Flächen bestehen.

### Typografie

Manrope ist die Produktschrift. Verbindliche Stufen:

- `display`: zentrale Screen- oder Hero-Aussage
- `title`: Screen- und Dialogtitel
- `section`: Abschnittstitel
- `body`: Standardinhalt und Eingaben
- `bodySmall`: Metadaten und Hilfstexte
- `caption`: kurze Labels; nicht für wesentliche Informationen

Gewicht ersetzt keine Hierarchie. Pro Screen werden möglichst wenige Größen und Gewichte kombiniert. Fließtext bleibt linksbündig und gut scannbar.

### Raum, Radius und Schatten

Abstände folgen den Tokens von 4 bis 32 Punkten. Zusammengehörige Elemente stehen enger als getrennte Abschnitte. Karten verwenden die vorhandenen Radien und sehr zurückhaltende Schatten; Kontur, Fläche und Abstand erzeugen die Hierarchie, nicht starke Schlagschatten.

## 3. Verbindliche Komponenten

Vor eigener Gestaltung sind diese Primitives zu verwenden:

- `AppShell` für Screen-Rahmen und Titel
- `AppCard` für gruppierte Inhalte
- `AppSectionHeading` für Abschnitt, Hilfetext und Aktion
- `AppButton` für primäre, sekundäre und destruktive Aktionen
- `AppInput` für Text- und Zahlenfelder
- `AppDateTimeInput` für Datum und Uhrzeit
- `AppDialog` für fokussierte modale Aufgaben
- `InfoButton` für kontextuelle Erklärung

Ein neues Pattern wird erst dann in einen Screen eingebaut, wenn seine Zustände definiert sind: Standard, Pressed/Focused, Disabled, Loading, Error und gegebenenfalls Selected.

## 4. Navigation und Informationsarchitektur

- Die Hauptnavigation enthält nur häufige, klar unterscheidbare Bereiche.
- Der aktive Kinderkontext bleibt sichtbar oder unmittelbar erreichbar.
- Detail- und Erstellungsaufgaben öffnen als eigener Screen oder klar erkennbarer Dialog.
- Nach einer Aktion wird der neue Zustand sichtbar bestätigt.
- Zurück-Navigation darf keine gespeicherten Daten verlieren; ungespeicherte Eingaben benötigen bei relevantem Verlust eine Warnung.

Listen werden nach Nutzeraufgabe statt Datenmodell gruppiert. Vergangene und bevorstehende Ereignisse sind klar getrennt. Seltene Einstellungen gehören nicht auf den primären Dashboard-Pfad.

## 5. Formulare und Eingaben

- Labels stehen sichtbar am Feld und werden nicht nur als Placeholder dargestellt.
- Datum wird über Kalenderauswahl eingegeben; Monat und Jahr müssen direkt anspringbar sein.
- Uhrzeit wird über eine verständliche Auswahl eingestellt; Tastatureingabe ist nur ergänzend.
- Zahlenfelder zeigen Einheit und gültigen Bereich.
- Validierung erfolgt möglichst nah am Feld und erklärt die Korrektur.
- Speichern ist erst möglich, wenn Pflichtangaben valide sind.
- Wiederkehrende Einstellungen – etwa Messintervall oder Medikamentenintervall – werden sinnvoll vorbelegt und nicht bei jedem Vorgang neu verlangt.

## 6. Gesundheits- und Warnzustände

Temperaturdarstellungen berücksichtigen Alter und Messmethode nur auf Basis fachlich geprüfter Regeln.

- Normal, auffällig niedrig, erhöht, Fieber und hohes Fieber unterscheiden sich durch Farbe, Label und unterstützende Erklärung.
- Untertemperatur wird nicht als „normal“ dargestellt.
- Warnungen bleiben ruhig und handlungsorientiert.
- Bei potentiell dringlichen Situationen ist die nächste Handlung prominenter als die technische Klassifikation.
- Medikamentenerinnerungen sprechen von dokumentiertem Nutzerintervall, niemals von medizinischer Freigabe.

## 7. Animation und Haptik

Bewegung erklärt Zustandsänderungen: Slider-Feedback, Auswahl, gespeicherter Eintrag oder geöffneter Dialog. Sie bleibt kurz, weich und unterbrechbar. Keine dekorative Daueranimation in einem gesundheitlich angespannten Kontext.

Reduzierte Bewegung wird respektiert. Haptik bestätigt wichtige direkte Aktionen, ersetzt aber kein sichtbares Feedback.

## 8. Barrierefreiheit

- Touch-Ziele mindestens 44 × 44 Punkte
- ausreichender Text- und Iconkontrast
- Screenreader-Labels beschreiben Aktion und Zustand
- logische Fokus- und Lesereihenfolge
- dynamische Schrift ohne abgeschnittene Inhalte
- Status nicht nur über Farbe
- Dialoge fangen den Fokus ein und geben ihn beim Schließen sinnvoll zurück
- Tastatur verdeckt keine aktive Eingabe oder primäre Aktion
- absolut oder schwebend positionierte Navigation und Aktionen verwenden reale Safe-Area-Inset-Werte statt fester Bildschirmrand-Abstände

## 9. Pflichtzustände pro Screen

Jeder datenabhängige Screen definiert:

- Loading
- leerer Zustand mit sinnvoller Aktion
- Inhalt
- Validierungsfehler
- technischer Fehler mit Wiederholung
- Offline-Zustand
- fehlende Berechtigung
- Erfolg beziehungsweise gespeicherter Zustand

Löschen, Abmelden und andere wesentliche Aktionen benötigen klares Ziel, Bestätigung und sichtbares Ergebnis.

## 10. Visuelle Abnahme

UI-Änderungen werden mindestens geprüft auf:

- kleinem iPhone-Viewport
- aktuellem großen iPhone-Viewport
- kleinem Android-Viewport
- großem Android-Viewport
- Web-Vorschau als ergänzender, nicht maßgeblicher Check

Zusätzlich prüfen:

- deutsche lange Texte und große Schrift
- geöffnete Tastatur
- Scroll-Enden und Safe Areas
- Dialoge und Info-Overlays
- leere und sehr lange Listen
- helle Außenbedingungen und geringer Kontrast

Ein Pull Request mit UI-Änderung enthält Vorher-/Nachher-Bilder und nennt die geprüften Zustände.
