# Implementierungs-Roadmap

## 1. Autorisierungs- und Gesundheitsdaten-Sicherheitsbaseline

- **Ziel:** Familien-, Kinder- und Gesundheitsdaten auf jedem Read/Write serverseitig scoped, validiert, auditiert und sicher fehlermeldend absichern.
- **Abhängigkeiten:** Bestehende Supabase-RLS, `family-sharing.tsx`, `store.tsx`, Auth-Konfiguration.
- **Betroffene Module:** `lib/auth.tsx`, `lib/supabase.ts`, `lib/store.tsx`, `lib/family-sharing.tsx`, `supabase/migrations/`, `supabase/functions/`.
- **Wahrscheinliche Datenbankänderungen:** Normalisierte Child-/Entry-Tabellen, Foreign Keys, Familien-/Kinder-Scope, Audit-Tabelle, Indizes und serverseitige Mutation-RPCs.
- **Primäre Risiken:** Bestehende JSON-Datenmigration, unabsichtliche Datenfreigabe, konkurrierende Writes, Secrets in Edge Functions.
- **Abschlusskriterien:** Autorisierungstests für Besitzer/Gast, negative Scope-Tests, sichere Fehler, Migration mit Rückwärts-/Rollback-Strategie und keine Gesundheitsdaten in Logs.

## 2. Familien-Einladungsbackend

- **Ziel:** Einladungen zuverlässig, rate-limitiert, ablaufend und single-use versenden und akzeptieren.
- **Abhängigkeiten:** Sicherheitsbaseline, Supabase Auth/Redirects, bestehende Family-Migration und Edge Function.
- **Betroffene Module:** `supabase/functions/invite-family-member/index.ts`, `supabase/migrations/20260727_family_sharing.sql`, `lib/family-sharing.tsx`, `lib/auth.tsx`, `app/(tabs)/familie.tsx`.
- **Wahrscheinliche Datenbankänderungen:** Token-/Invitation-State mit Verbrauchszeitpunkt, Rate-Limit-/Audit-Felder und Indizes.
- **Primäre Risiken:** Account-Enumeration, offene Redirects, wiederverwendbare Tokens, unvollständig konfiguriertes Supabase-Projekt.
- **Abschlusskriterien:** E-Mail- und bestehender-Konto-Flows, Ablauf/Revocation, Rate Limits, Audit-Eintrag und RLS-/Edge-Tests.

## 3. Krankheitsfälle und einheitliche Timeline

- **Ziel:** Messungen, Symptome, Gaben, Termine und Notizen einem nachvollziehbaren Krankheitsfall zuordnen und gemeinsam chronologisch darstellen.
- **Abhängigkeiten:** Sicherheitsbaseline, normalisiertes Gesundheitsdatenmodell, bestehende Timeline und Store-Migration.
- **Betroffene Module:** `lib/store.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/verlauf.tsx`, `app/modal.tsx`, neue Case-/Timeline-Module.
- **Wahrscheinliche Datenbankänderungen:** `illness_cases`, typisierte Timeline-Events, Case-/Child-Foreign Keys und Zeitstempel-Indizes.
- **Primäre Risiken:** Verlust bestehender JSON-Einträge, uneindeutige Fallgrenzen, Sortierung über Zeitzonen und family-scope Fehler.
- **Abschlusskriterien:** Migration alter Einträge, stabile chronologische Darstellung, leere/offline Zustände und Scope-/Sortiertests.

## 4. Symptom- und Allgemeinzustands-Tracking

- **Ziel:** Nutzerdefinierte Symptome und Allgemeinzustand dokumentieren, ohne Diagnose oder medizinische Bewertung zu erzeugen.
- **Abhängigkeiten:** Krankheitsfälle/Timeline und Sicherheitsbaseline.
- **Betroffene Module:** `lib/store.tsx`, `app/modal.tsx`, `app/(tabs)/verlauf.tsx`, `components/ui/`, `lib/date-time.ts`.
- **Wahrscheinliche Datenbankänderungen:** Symptom-/Condition-Entries mit Child-/Case-Scope, Zeitstempel und optionaler Notiz.
- **Primäre Risiken:** Klinisch klingende Labels, falsche Normalisierung, sensible Daten in Telemetrie und unklare rückwirkende Eingaben.
- **Abschlusskriterien:** Dokumentationsorientierte Texte, validierte historische Eingabe, Bearbeiten/Löschen, Scope-Tests und keine Diagnoseausgabe.

## 5. Medikamentenadministrationssicherheit

- **Ziel:** Nutzer- und ärztlich vorgegebene Medikamentenpläne nachvollziehbar dokumentieren und Konflikte neutral anzeigen, ohne Dosierung oder Freigabe zu berechnen.
- **Abhängigkeiten:** Sicherheitsbaseline, normalisierte Entries, bestehendes Inventar und Reminder-Control.
- **Betroffene Module:** `app/(tabs)/medikamente.tsx`, `app/modal.tsx`, `lib/store.tsx`, `lib/notifications.ts`, `components/reminder-center.tsx`.
- **Wahrscheinliche Datenbankänderungen:** Inventory, Administration, Plan-Versionen, source-of-entry, Idempotency Key und optionale clinician-instruction reference.
- **Primäre Risiken:** Sicherheitsversprechen, doppelte Submissions, stille Planänderungen, parallele Family-Edits und sensible Medikamentendaten.
- **Abschlusskriterien:** Idempotente Gabe, klare neutrale Warnungen, vollständige Audit-/Scope-Tests, kein Dosierungsrechner und sichere Bearbeitungs-/Löschbestätigung.

## 6. Zuverlässige Erinnerungen und Nachtalarme

- **Ziel:** Gerätealarme robust und nachvollziehbar planen, ersetzen, stornieren und über Zeitzonen/Sommerzeit korrekt behandeln.
- **Abhängigkeiten:** Medikamentensicherheit, Sicherheitsbaseline und native Testinfrastruktur.
- **Betroffene Module:** `lib/notifications.ts`, `lib/night-schedule.ts`, `components/reminder-center.tsx`, `app/modal.tsx`, `app/(tabs)/termine.tsx`, `app/(tabs)/index.tsx`.
- **Wahrscheinliche Datenbankänderungen:** Serverseitige Reminder-/Schedule-Metadaten nur falls geräteübergreifende Planung benötigt wird; lokale Notification-IDs bleiben gerätespezifisch.
- **Primäre Risiken:** Berechtigungen, App-Neustart, Android-Kanäle, iOS-Verhalten, DST, Web-Limitierungen und doppelte Alarme.
- **Abschlusskriterien:** Native iPhone-/Android-Tests, Zeitzonen-/DST-Grenzfälle, idempotente Rescheduling-Logik, klare Web-Hinweise und keine medizinische Freigabesprache.

## 7. Arztbericht und Export

- **Ziel:** Ausgewählte Gesundheits- und Terminaufzeichnungen als nutzerinitiierte, datensparsame Zusammenfassung exportieren.
- **Abhängigkeiten:** Einheitliche Timeline, Sicherheitsbaseline und Datenexport-/Kontolöschkonzept.
- **Betroffene Module:** `app/(tabs)/verlauf.tsx`, `app/(tabs)/termine.tsx`, `lib/store.tsx`, neue Export-/PDF-/Share-Module.
- **Wahrscheinliche Datenbankänderungen:** Keine zwingende Änderung; optional Export-Audit ohne Gesundheitsinhalte.
- **Primäre Risiken:** Ungewollte Datenweitergabe, falsche Zeit-/Einheitenformatierung, medizinische Interpretation und Plattform-Share-Verhalten.
- **Abschlusskriterien:** Explizite Auswahl/Bestätigung, korrekte lokale Zeitdarstellung, sichere temporäre Dateien, keine Logs sensibler Inhalte und Exporttests.

## 8. Notfallinformationen

- **Ziel:** Neutrale, statische Notfall- und Kontaktinformationen jederzeit ohne Paywall erreichbar machen.
- **Abhängigkeiten:** Keine fachliche Datenmigration; Sicherheitsbaseline für Konfiguration und externe Links.
- **Betroffene Module:** `app/(tabs)/familie.tsx`, `components/app-shell.tsx`, `app/_layout.tsx`, gegebenenfalls `constants/`.
- **Wahrscheinliche Datenbankänderungen:** Keine; regionale Konfiguration nur wenn fachlich/operativ erforderlich.
- **Primäre Risiken:** Veraltete regionale Angaben, falsche medizinische Handlungsanweisung, Paywall-Guard und nicht erreichbare Links.
- **Abschlusskriterien:** Offline sichtbare Notfallkarte, Paywall-unabhängiger Zugriff, neutrale Formulierungen, Link-/Telefon-Tests und fachliche Freigabe.

## 9. Präventive-Versorgung-Erweiterung

- **Ziel:** Die bestehende U1–U9-Orientierung um weitere klar gekennzeichnete, regionale oder nutzerdefinierte Vorsorgetermine erweitern.
- **Abhängigkeiten:** Termin-/Timeline-Modell, Arztbericht und fachlich geprüfte Quellen.
- **Betroffene Module:** `lib/u-checkups.ts`, `app/(tabs)/termine.tsx`, `components/ui/app-date-time-input.tsx`.
- **Wahrscheinliche Datenbankänderungen:** Versionierte Checkup-Kataloge oder nutzerdefinierte preventive events mit Region/Quelle.
- **Primäre Risiken:** Regionale Unterschiede, falsche Zeitfenster, veraltete Empfehlungen und Termin-/Erinnerungsduplikate.
- **Abschlusskriterien:** Quelle und Region sichtbar, automatische Berechnung getestet, nutzerdefinierte Termine möglich, kein Anspruch auf Vollständigkeit.

## 10. Quick Entry und Offline-Synchronisierung

- **Ziel:** Häufige Eingaben mit wenigen Schritten erfassen und offline zuverlässig mit Konflikt- und Wiederholungsstrategie synchronisieren.
- **Abhängigkeiten:** Normalisierte Daten, Sicherheitsbaseline, idempotente Medikamenten-/Reminder-Operationen und Connectivity-Hooks.
- **Betroffene Module:** `app/(tabs)/index.tsx`, `app/modal.tsx`, `lib/store.tsx`, `lib/use-connectivity.*`, `lib/secure-storage.ts`.
- **Wahrscheinliche Datenbankänderungen:** Einzelne Entry-Tabellen, Sync-Version/Mutation-Log, Idempotency Keys und Conflict metadata.
- **Primäre Risiken:** Last-Write-Loss, verschlüsselte lokale Migration, Family-Realtime-Konflikte und doppelte Submissions.
- **Abschlusskriterien:** Offline-Erfassung, persistente Retry-Queue, deterministische Konfliktanzeige, Recovery nach Neustart und Multi-Device-Tests.

## 11. KI-generierte Zusammenfassungen

- **Ziel:** Auf ausdrücklichen Nutzerwunsch dokumentarische Zusammenfassungen erzeugen, ohne Diagnose, Dosierung oder Behandlungsempfehlung.
- **Abhängigkeiten:** Sicherheitsbaseline, Export-/Timeline-Modell, Datenschutz-/Einwilligungskonzept und serverseitige KI-Gateway-Architektur.
- **Betroffene Module:** neue serverseitige Funktion, `app/(tabs)/verlauf.tsx`, `lib/store.tsx`, Auth-/Entitlement-Grenzen.
- **Wahrscheinliche Datenbankänderungen:** Opt-in-/Consent-State, Modell-/Prompt-Version und Audit-Metadaten ohne Rohgesundheitsdaten in Logs.
- **Primäre Risiken:** Halluzination, sensible Datenübertragung, Prompt Injection, falsche medizinische Interpretation und Kostenkontrolle.
- **Abschlusskriterien:** Opt-in, sichtbare Quellen der Zusammenfassung, sichere serverseitige Verarbeitung, red-teamte medizinische Guardrails und reproduzierbare Fehlerzustände.

## 12. Freemium-Entitlement-Änderungen

- **Ziel:** Lokale Vorschau-Abos durch verifizierte App-Store-/Play-Store-Produkte und serverseitige Familien-Entitlements ersetzen.
- **Abhängigkeiten:** Auth-/Family-Sicherheitsbaseline, Billing-Produkte, Restore-Flows und Offline-Entitlement-Policy.
- **Betroffene Module:** `lib/subscription.tsx`, `app/paywall.tsx`, `app/_layout.tsx`, `lib/family-sharing.tsx`, Supabase-Entitlement-Tabellen/Functions.
- **Wahrscheinliche Datenbankänderungen:** Customer, Store transaction, entitlement, family-owner und expiration/revocation Tabellen mit eindeutigen Transaktions-IDs.
- **Primäre Risiken:** Kaufverifikation, Rückerstattung, Ablauf, Plattformunterschiede, Gästezugriff, Offline-Zugriff und falsche Zahlungsdarstellung.
- **Abschlusskriterien:** Keine Preview-Freischaltung in Produktion, verifizierte Käufe/Restores, serverseitig erzwungene Entitlements, transparente Preise und Tests für Ablauf/Revocation.
