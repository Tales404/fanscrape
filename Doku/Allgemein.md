# Architektur und aktueller Stand

Stand: 2. September 2026

## Komponenten

Das Google Sheet ist die Arbeitsoberfläche. Quell-Tabs werden entweder direkt
aus den in FantasyPros-Seiten eingebetteten JavaScript-Daten oder über den
Cloud-Run-Crawler aktualisiert. Das an das Sheet gebundene Apps Script liegt
vollständig in `apps-script/` und wird mit `clasp` synchronisiert.

Der Cloud-Run-Service ist eine Express-Anwendung. Für jede Anfrage startet er
einen PlaywrightCrawler, speichert das Resultat in einem Crawlee-Dataset und
liefert dessen Einträge als JSON zurück.

## Endpunkte

### `GET /draft`

Query-Parameter:

- `positions`: kommasepariert; Standard ist `QB,RB,WR,TE,K,DST,Overall`
- `experts`: kommaseparierte FantasyPros-Experten-IDs
- `cacheBuster`: Kennung für einen neuen Dataset-Lauf
- `headless`: nur `false` deaktiviert Headless-Modus; in Cloud Run bleibt dies
  normalerweise `true`

Antwortform:

```json
[
  {
    "QB": [
      {
        "rank": "1",
        "player_name": "…",
        "team": "…",
        "bye_week": "…",
        "sos_season": "…",
        "ecr_vs_adp": "…"
      }
    ]
  }
]
```

### `GET /inSeason`

Der Crawler wählt nacheinander die im Code hinterlegten Fantasy-Teams, lädt
deren CSV-Dateien herunter und gibt Dataset-Einträge der Form
`{ "team": "…", "players": [...] }` zurück. Die Teamliste ist momentan
fest in `src/routes.js` konfiguriert.

## Laufender Cloud-Run-Stand

Service `fanscrape` läuft in `europe-west1` auf Revision
`fanscrape-00029-qg4` (Stand 2. September 2026). Die Revision nutzt Port 8080,
2 vCPU, 4 GiB RAM, ein Request-Timeout von 900 Sekunden und Concurrency 1.
Die Cookies werden aus Secret Manager nach
`/secrets/fantasypros/cookies.json` gemountet. Ein produktiver Kompletttest
lieferte QB, RB, WR, TE, K, DST und Overall in rund 28 Sekunden.

## Arbeitsweise

1. Online-Apps-Script vor Änderungen mit dem Git-Stand vergleichen.
2. Änderungen lokal in einem Branch vornehmen und statisch prüfen.
3. Erst nach Review nach Apps Script oder Cloud Run deployen.
4. Nach produktiven Notfalländerungen den tatsächlich laufenden Stand wieder
   ins Repository zurückführen.

## Noch offen

- optional die Git-Historie um die inzwischen abgelaufenen Cookies bereinigen
- Dataset/Cache pro Request isolieren
- Fehlerantworten und Timeouts der HTTP-Endpunkte vereinheitlichen
- robusten CSV-Parser einsetzen
- Tests für Parser und Response-Formate ergänzen
