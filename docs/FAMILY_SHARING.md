# Gemeinsamer Familienbereich

## Rollen

- `owner`: verwaltet Kinderprofile, Einladungen, Gäste und das Abonnement.
- `guest`: sieht den gemeinsamen Familienbereich und darf Gesundheits- und Termineinträge dokumentieren.

Die Berechtigungen werden nicht nur in der UI, sondern mit Row Level Security und einer kontrollierten Schreibfunktion in Supabase durchgesetzt. Insbesondere können Gäste Kinderprofile nicht verändern.

## Bereitstellung

1. Migration `supabase/migrations/20260727_family_sharing.sql` im Supabase-Projekt anwenden.
2. Edge Function `invite-family-member` deployen.
3. Web-URL und das App-Scheme `fieberwache://` als erlaubte Auth-Redirects konfigurieren.
4. Invite-E-Mail-Vorlage im Supabase-Dashboard an die Fieberwache-Tonalität anpassen.

Die Edge Function verwendet ausschließlich serverseitige Supabase-Secrets. Ein geheimer Schlüssel darf niemals als `EXPO_PUBLIC_*` oder im App-Bundle hinterlegt werden.

## Datenfluss

Bestehende `user_states` werden beim ersten Online-Start in einen persönlichen Familienbereich übernommen. Anschließend lesen und schreiben alle Mitglieder denselben `family_states`-Datensatz. Supabase Realtime verteilt gespeicherte Änderungen an weitere angemeldete Geräte; die lokale verschlüsselte Kopie bleibt als Offline-Fallback erhalten.

Der aktuelle MVP synchronisiert den Familienzustand als versionierbaren Gesamtdatensatz. Vor hoher gleichzeitiger Nutzung sollte das Modell in einzelne Tabellen für Kinder, Messungen, Medikamente und Termine normalisiert werden, damit parallele Schreibvorgänge konfliktfrei zusammengeführt werden können.
