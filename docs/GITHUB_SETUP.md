# GitHub-Einrichtung

## Zielzustand

- privates Repository: `mahmutidardan/kinderkompass`
- Standardbranch: `main`
- Änderungen ausschließlich über kurzlebige Branches und Pull Requests
- verpflichtender CI-Check: `quality`
- Squash Merge als bevorzugte Merge-Methode
- Dependabot für npm und GitHub Actions

## Einmalige Einrichtung

1. Auf GitHub im Konto `mahmutidardan` ein leeres **privates** Repository `kinderkompass` erstellen.
2. Keine README, `.gitignore` oder Lizenz von GitHub generieren lassen; diese Dateien sind bereits lokal vorhanden.
3. Git für Windows oder GitHub Desktop installieren, falls lokal kein Git-Befehl verfügbar ist.
4. Im Projektordner den vorhandenen Branch auf `main` umbenennen und das Remote verbinden:

```bash
git branch -M main
git remote add origin https://github.com/mahmutidardan/kinderkompass.git
git add .
git status
git commit -m "chore: establish professional project baseline"
git push -u origin main
```

Vor dem Commit muss `git status` geprüft werden. Es dürfen insbesondere keine `.env`-Dateien, Logs, Gesundheitsdaten, Anhänge, Build-Verzeichnisse oder APK-Dateien enthalten sein.

## Repository-Einstellungen

Unter **Settings → General → Pull Requests**:

- Squash merging aktivieren
- Merge commits deaktivieren
- Head-Branches nach Merge automatisch löschen

Unter **Settings → Rules → Rulesets** ein Ruleset für `main` anlegen:

- Pull Request erforderlich
- Statuscheck `quality` erforderlich
- Konversationen vor Merge auflösen
- lineare Historie
- Force-Push und Löschen blockieren
- Bypass möglichst nicht erlauben

Sobald ein zweiter Reviewer verfügbar ist, zusätzlich eine Freigabe verlangen und veraltete Freigaben bei neuen Commits verwerfen.

### Tarifhinweis

Für dieses private Repository lässt sich der technische Branch-Schutz im aktuellen kostenlosen GitHub-Tarif nicht aktivieren. GitHub verlangt dafür GitHub Pro oder ein öffentliches Repository. Die App bleibt aus Datenschutz- und Produktsicherheitsgründen privat. Bis zu einem möglichen Tarifwechsel gelten Pull Request, erfolgreicher `quality`-Check, Squash Merge und das Verbot direkter `main`-Pushes als verbindlicher Prozess, können aber nicht vollständig serverseitig erzwungen werden.

## Erster Kontrolllauf

Nach dem ersten Push:

1. Branch `chore/verify-workflow` aus `main` erstellen.
2. Eine kleine Dokumentationsänderung committen.
3. Pull Request öffnen und die Vorlage ausfüllen.
4. Prüfen, dass `quality` Linting, TypeScript und Web-Export erfolgreich ausführt.
5. Per Squash Merge mergen und den Branch löschen lassen.
