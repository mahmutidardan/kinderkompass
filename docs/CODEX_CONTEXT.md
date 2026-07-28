# Codex-Kontext: Fieberwache

## 1. Technologiestack

- Expo SDK 54, React Native 0.81, React 19 und TypeScript 5.9.
- Navigation und Routing über Expo Router 6; mobile Tabs liegen unter `app/(tabs)/`.
- UI ohne zusätzliche UI-Bibliothek: React Native, `@expo/vector-icons`, `lucide-react-native` und eigene Primitives in `components/ui/`.
- Persistenz lokal über AsyncStorage; native lokale Gesundheitsdaten werden über `expo-secure-store` geschützte Geräteschlüssel und CryptoJS verschlüsselt.
- Optionales Backend über Supabase JS 2 (Auth, Postgres, RLS, Realtime, Edge Functions). Es gibt kein ORM und keine eigene REST-API.
- Native Benachrichtigungen über `expo-notifications`; Web ist eine statische Expo-Vorschau.

## 2. Wichtige Verzeichnisse

- `app/`: Routen und Screens: Login, Paywall, Logout, Modal sowie die fünf Haupttabs.
- `app/(tabs)/`: Dashboard, Verlauf, Inventar, Termine und Familie.
- `components/ui/`: wiederverwendbare Buttons, Karten, Dialoge, Eingaben, Datums-/Zeitpicker, Icons und Abschnittsüberschriften.
- `components/`: App-Shell, Avatare, Reminder Center und fachnahe UI.
- `lib/`: React-Context-Store, Auth, Subscription, Supabase, sichere Speicherung, Datum/Zeit, Temperaturorientierung, U-Untersuchungen, Nachtplanung, Benachrichtigungen und Connectivity.
- `constants/design.ts`: zentrale Farben, Typografie, Radien, Abstände und Schatten.
- `supabase/migrations/`: additive SQL-Migrationen für `user_states` und Family Sharing.
- `supabase/functions/`: serverseitige Supabase Edge Functions; aktuell `invite-family-member`.
- `scripts/`: lokaler Testkonto-Helper und LAN-Startskript.
- `docs/`: Engineering-, Design-, Architektur-, Release- und Family-Sharing-Leitlinien.

## 3. Architektur und Datenfluss

`app/` komponiert Screens, verwendet UI-Primitives und liest/schreibt ausschließlich über Context-APIs. `lib/store.tsx` hält den gesamten fachlichen App-Zustand als ein `AppState`-Objekt. `StoreProvider` hydratisiert zuerst lokale Daten und lädt bei einem konfigurierten Supabase-Konto entweder `user_states` oder den aktiven `family_states`-Datensatz. Änderungen werden lokal gespeichert und mit Debounce in die Cloud geschrieben; Family States empfangen zusätzlich Supabase-Realtime-Updates.

Die Provider-Reihenfolge in `app/_layout.tsx` ist `AuthProvider` → `SubscriptionProvider` → `FamilySharingProvider` → familienbezogener `StoreProvider` → Navigator. Die Fachlogik bleibt in kleinen, React-unabhängigen Modulen, wo kein UI-Zustand erforderlich ist.

## 4. Authentifizierung und Autorisierung

- `lib/auth.tsx` unterstützt Supabase-Sitzungen, Google OAuth mit PKCE, native Deep-Link-Code-Austausch, lokalen Gastmodus und das lokale Testkonto.
- `lib/supabase.ts` liest ausschließlich `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Ohne diese Variablen bleibt die App lokal.
- Google OAuth benötigt einen konfigurierten Supabase-Provider sowie erlaubte Web- und `fieberwache://`-Redirects.
- Die Basis-Migration `20260723_user_states.sql` schützt pro Benutzer über RLS den eigenen JSON-Datensatz.
- Family Sharing nutzt `families`, `family_members`, `family_invites` und `family_states` mit RLS, Security-Definer-Funktionen und `accept_family_invite`/`update_family_state`.
- Besitzer dürfen Profile, Einladungen und Mitglieder verwalten. Gäste dürfen den gemeinsamen Zustand lesen und über die kontrollierte RPC schreiben; die RPC blockiert Änderungen am `children`-Teil. UI-Ausblendung ist nicht die eigentliche Autorisierung.
- Einladungs-E-Mails werden ausschließlich durch `supabase/functions/invite-family-member/index.ts` mit dem serverseitigen Service-Key versendet.

## 5. Relevante Datenmodelle

Die folgenden Entitäten liegen derzeit innerhalb eines versionierten JSON-Objekts, nicht als einzelne Gesundheits-Tabellen:

- `Child`: `id`, Name, optionales Geburtsdatum, Geschlecht, strukturierter Avatar und optionales `photoUri`.
- `TemperatureEntry`: `id`, `childId`, Temperatur als Zahl, Messmethode, ISO-Zeitpunkt und optionale Notiz.
- `MedicationInventoryItem`: `id`, Name, optionale Standardmenge und optionales Standardintervall in Stunden.
- `MedicationEntry`: `id`, `childId`, optionaler Inventarbezug, frei dokumentierter Name/Menge, ISO-Zeitpunkt sowie optionaler Erinnerungszeitpunkt und Notification-ID.
- `DoctorContact`: pro `childId` Praxisname, Telefon und Adresse.
- `Appointment`: `id`, `childId`, Titel, ISO-Terminzeitpunkt, optionale Vorab-Erinnerung in Minuten, Notiz und Notification-ID.
- Zustandsfelder für Temperatur-Erinnerung, Nachtplan, Notification-IDs und aktives Kinderprofil.

`deleteChild` entfernt lokal abhängige Temperaturen, Gaben, Arztkontakte und Termine. Das Online-Modell synchronisiert aktuell den gesamten JSON-State; es gibt keine separaten Fremdschlüssel auf Datenbankebene für einzelne Einträge.

## 6. Wiederverwendbare UI- und Service-Muster

- `AppShell`, `AppCard`, `AppButton`, `AppInput`, `AppDialog`, `AppSectionHeading`, `InfoButton`, `IconSymbol` und `AppDateTimeInput` sind die bevorzugten Bausteine.
- Datumseingaben öffnen ein Kalenderfenster mit Monats-/Jahresauswahl; Zeiteingaben öffnen Stunden-/Minutenregler. Parsing und Formatierung liegen in `lib/date-time.ts`.
- Reminder-Intervalle verwenden in `app/modal.tsx` das gemeinsame `ReminderIntervalControl` mit explizitem Ein-/Aus-Zustand, Presets und optionalem eigenen Wert.
- Fachberechnungen sind in `lib/temperature-guidance.ts`, `lib/night-schedule.ts` und `lib/u-checkups.ts` isoliert.
- Designwerte dürfen nicht lokal neu erfunden werden; `constants/design.ts` ist die Tokenquelle.

## 7. Benachrichtigungen und Alarme

`lib/notifications.ts` konfiguriert auf iOS/Android den Kanal `care-reminders`, fordert Berechtigungen an, plant einmalige Datumstrigger und kann IDs stornieren. `components/reminder-center.tsx` zeigt aktive Temperatur-, Medikamenten-, Termin- und Nachtalarme und erlaubt das Ausschalten.

Temperatur- und Medikamentenerinnerungen werden beim Speichern aus dem vom Nutzer eingegebenen Zeitpunkt plus Intervall berechnet. Der Nachtplan wird in `lib/night-schedule.ts` als Intervallfenster oder manuelle Uhrzeiten berechnet; er pausiert die Standard-Temperaturerinnerung. Termine verwenden Minuten vor dem Termin. Web meldet Benachrichtigungen als nicht zuverlässig bzw. nicht unterstützt; es gibt keinen Hintergrundjob, keinen Service Worker und keine wiederkehrende native Alarm-Engine.

## 8. Subscriptions und Entitlements

`lib/subscription.tsx` speichert Tarif, Teststart und lokale Vorschau-Aktivierung in AsyncStorage pro `storageScope`. Der Testzeitraum beträgt sieben Tage; die angezeigten Pläne sind monatlich 2,99 € und jährlich 24 €. `billingConfigured` ist fest `false`: Es gibt noch keine App-Store-/Play-Store-Produkte, Käufe, Wiederherstellung oder serverseitige Entitlements. `app/_layout.tsx` gewährt Gästen eines aktiven Family-Bereichs Zugang, ansonsten entscheidet das lokale Trial-/Preview-Modell über den Paywall-Zugriff.

## 9. Tests und Validierung

- `npm run lint`: Expo ESLint.
- `npm run typecheck`: `tsc --noEmit`.
- `npm run build:web`: statischer Expo-Webexport nach `dist-ci`.
- `npm run check`: führt Lint, Typecheck und Webexport nacheinander aus.
- `npm ci`, `npm start`, `npm run web`, `npm run start:lan`, `npm run android` und `npm run ios` sind im Manifest vorhanden.
- Eine automatisierte Unit-, Integration- oder E2E-Teststruktur wurde nicht gefunden; es gibt auch kein `npm test`-Script. Die CI unter `.github/workflows/ci.yml` führt nur Lint, Typecheck und Webexport aus.

## 10. Bekannte architektonische Grenzen

- Gesundheitsdaten sind als monolithischer JSON-State modelliert. Cloud-Schreibvorgänge sind Last-Write-Wins; parallele Bearbeitung kann Änderungen überschreiben.
- Family-RLS ist auf Familienebene. Per-Feld-Berechtigungen sind nur für Kinderprofile in `update_family_state` speziell abgesichert; weitere Domänen benötigen bei strengeren Rollen ein normalisiertes Modell.
- Es gibt keine robuste Offline-Queue, Konfliktauflösung, Idempotency Keys oder serverseitige Audit-Tabelle.
- Native Speicherung ist verschlüsselt; Browserdaten sind nur browserlokal gespeichert.
- Browseralarme sind keine verlässlichen Gerätealarme. Native Alarm-, Zeitzonen- und Sommerzeitfälle sind nicht automatisiert getestet.
- Supabase-Deployment, Edge-Function-Deployment, Auth-Provider-Konfiguration und App-Store-Billing sind außerhalb des Repositories vorausgesetzt.

## 11. Darf nicht umgeschrieben werden

- `lib/store.tsx` und das Persistenzformat nur rückwärtskompatibel erweitern oder migrieren.
- `lib/supabase.ts`, RLS und Edge-Function-Secrets nicht in den Client verschieben.
- `lib/notifications.ts` und `lib/date-time.ts` nicht durch plattformspezifische UI-Logik duplizieren.
- `constants/design.ts` und die Primitives in `components/ui/` als gemeinsame Designbasis erhalten.
- Medizinische Sicherheitsformulierungen und die Trennung zwischen Dokumentation und medizinischer Entscheidung nicht abschwächen.
- Bestehende lokale Daten, Family-Scope-Schlüssel und Legacy-Migration von `user_states` nicht entfernen.

## 12. Relevante Dateien nach geplantem Feature

| Feature | Wahrscheinliche Einstiegspunkte |
| --- | --- |
| Autorisierung und Gesundheitsdatensicherheit | `lib/auth.tsx`, `lib/supabase.ts`, `lib/family-sharing.tsx`, `lib/store.tsx`, `supabase/migrations/`, `supabase/functions/`, `SECURITY.md` |
| Familien-Einladungen | `app/(tabs)/familie.tsx`, `lib/family-sharing.tsx`, `supabase/migrations/20260727_family_sharing.sql`, `supabase/functions/invite-family-member/index.ts` |
| Krankheitsfälle und Timeline | `lib/store.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/verlauf.tsx`, `app/modal.tsx` |
| Symptome und Allgemeinzustand | `lib/store.tsx`, `app/modal.tsx`, `app/(tabs)/verlauf.tsx`, `components/ui/` |
| Medikamentensicherheit | `app/(tabs)/medikamente.tsx`, `app/modal.tsx`, `lib/store.tsx`, `lib/notifications.ts` |
| Erinnerungen und Nachtalarme | `lib/notifications.ts`, `lib/night-schedule.ts`, `components/reminder-center.tsx`, `app/modal.tsx` |
| Arztbericht und Export | `app/(tabs)/verlauf.tsx`, `app/(tabs)/termine.tsx`, `lib/store.tsx`, neue Export-/Dokumentlogik neben `lib/` |
| Notfallinformationen | `app/(tabs)/familie.tsx`, `components/app-shell.tsx`, `app/_layout.tsx` |
| Präventive Versorgung | `lib/u-checkups.ts`, `app/(tabs)/termine.tsx`, `components/ui/app-date-time-input.tsx` |
| Quick Entry und Offline-Synchronisierung | `app/(tabs)/index.tsx`, `app/modal.tsx`, `lib/store.tsx`, `lib/use-connectivity.*`, `lib/secure-storage.ts` |
| KI-Zusammenfassungen | neue serverseitige Funktion plus `lib/store.tsx`, `app/(tabs)/verlauf.tsx`; medizinische Sicherheitsgrenzen aus `AGENTS.md` |
| Freemium-Entitlements | `lib/subscription.tsx`, `app/paywall.tsx`, `app/_layout.tsx`; später Store-Produkt- und Serverentitlement-Integration |

