# Fanscrape

Fanscrape versorgt das Google Sheet **„Kopie von Draft Day 2026“** mit
FantasyPros-Rankings. Das Projekt besteht aus drei Teilen:

1. dem Google Sheet als Oberfläche für Analyse und Draft Day,
2. dem gebundenen Google-Apps-Script-Projekt in `apps-script/`,
3. dem Crawlee-/Playwright-Service in `src/`, der auf Google Cloud Run läuft.

## Datenfluss

```text
FantasyPros
   ├─ direkter HTML-/JavaScript-Import ──> Datenimport.js ──> Source_*_ECR
   └─ Playwright-Scraping ──> Cloud Run /draft ──> importHTMLEXP.js
                                                └─> Source_ADFJR_*
```

`addrank-adf.js` und `addrank-jr.js` fragen den Draft-Endpunkt mit getrennten
Expertengruppen ab und ergänzen die Spalten `addadf` beziehungsweise `addjr`.
Der Cloud-Run-Service besitzt zusätzlich `/inSeason`; dafür gibt es im
aktuellen Apps-Script-Stand keinen aufrufenden Import.

## Projektstruktur

- `src/main.js`: Express-Endpunkte, Crawler-Konfiguration und Dataset-Ausgabe
- `src/routes.js`: Browserinteraktionen und Extraktion für Draft/In-Season
- `apps-script/`: mit dem Sheet gebundener Apps-Script-Quellcode
- `Doku/`: Detailbeschreibungen der Komponenten
- `Dockerfile`: Container für Google Cloud Run

## Lokale Einrichtung

```bash
npm install
npm start
```

Der lokale Server lauscht standardmäßig auf Port `8080`. Beispiel:

```text
GET /draft?positions=QB,RB&experts=1139,22&cacheBuster=example
GET /inSeason?cacheBuster=example
```

`positions` und `experts` sind kommaseparierte Listen. Ohne `positions` lädt
`/draft` QB, RB, WR, TE, K, DST und Overall. `cacheBuster` steuert das
Crawlee-Dataset und sollte je gewünschtem neuen Lauf geändert werden.

## Apps Script mit clasp bearbeiten

Der Online-Stand wurde dem Ordner `apps-script/` zugeordnet. Die lokalen
Dateien `.clasprc.json` und `.clasp.json` enthalten Authentifizierung bzw.
Projektbindung und bleiben außerhalb von Git.

```bash
npm run apps-script:status
npm run apps-script:pull
```

Vor einem Pull müssen lokale Änderungen gesichert sein, weil der Online-Stand
lokale Dateien überschreiben kann. `clasp push` und Cloud-Run-Deployments
werden erst nach bewusster Prüfung ausgeführt.

## FantasyPros-Cookies

Sitzungsdaten werden nicht mehr versioniert und durch `.dockerignore` auch
nicht versehentlich in ein Container-Image kopiert. Lokal erwartet der Service
standardmäßig `src/config/cookies.json`; die Struktur zeigt
`src/config/cookies.example.json`.

Alternativ können folgende Laufzeitvariablen verwendet werden:

- `FANTASYPROS_COOKIES_FILE`: Pfad zu einer JSON-Datei, bevorzugt für einen
  read-only Secret-Manager-Mount in Cloud Run
- `FANTASYPROS_COOKIES_JSON`: vollständiges JSON direkt aus einer Secret-
  Umgebungsvariable; hat Vorrang vor dem Dateipfad

Chrome-Exportfelder werden in `src/cookies.js` validiert, abgelaufene Cookies
werden verworfen und `sameSite` sowie `expirationDate` für Playwright
normalisiert. Cookie-Werte werden nicht geloggt.

## Abgleich mit der Produktion

Am 2. September 2026 wurde der Produktionsstand mit GitHub abgeglichen und
Revision `fanscrape-00029-qg4` aus `main` bereitgestellt. Sie bindet die
FantasyPros-Cookies über Secret Manager ein, verarbeitet je Container nur
einen Request gleichzeitig und nutzt 2 vCPU sowie 4 GiB RAM. Ein Live-Test
aller sieben Draft-Ansichten (QB, RB, WR, TE, K, DST und Overall) war mit
vollständigen Daten erfolgreich.

## Bekannte technische Risiken

- Ältere Sitzungsdaten befinden sich weiterhin in der öffentlichen Git-
  Historie. Beim Audit am 2. September 2026 waren alle persistenten Cookies
  bereits abgelaufen und keiner der relevanten Auth-Werte wurde wiederverwendet.
  Eine History-Bereinigung bleibt optional sinnvoll.
- Crawlee verwendet momentan ein gemeinsames Standard-Dataset und einen
  prozessweiten `lastCacheBuster`. Cloud Run ist deshalb auf Concurrency 1
  begrenzt; eine echte Isolation pro Request bleibt sinnvoll.
- Der In-Season-CSV-Parser trennt nur an Kommas und behandelt CSV-Quoting nicht
  vollständig.
- Die Cookie-Normalisierung besitzt erste Tests; Crawler und Apps Script sind
  noch nicht automatisiert abgedeckt.

Weitere Details stehen in [`Doku/Allgemein.md`](Doku/Allgemein.md).
