# `src/main.js`

`main.js` startet die Express-Anwendung und verbindet HTTP-Anfragen mit den
beiden Crawlee-Routern aus `routes.js`.

## Ablauf einer Anfrage

1. `loadFantasyProsCookies()` liest die Sitzung aus
   `FANTASYPROS_COOKIES_JSON`, `FANTASYPROS_COOKIES_FILE` oder lokal aus
   `src/config/cookies.json`. Die Daten werden nur im Speicher validiert und
   für Playwright normalisiert.
2. Bei verändertem `cacheBuster` wird das gemeinsame Standard-Dataset
   verworfen.
3. `buildCrawler()` erzeugt einen PlaywrightCrawler und setzt die Cookies vor der
   Navigation und verwendet den passenden Router.
4. Nach dem Crawl liest der Endpunkt alle Dataset-Einträge und antwortet mit
   JSON.

## Routen

- `/draft`: übergibt `positions`, `experts` und `cacheBuster` an `routerDraft`
- `/inSeason`: übergibt `cacheBuster` an `routerInSeason`

`headless=false` kann den Browser lokal sichtbar starten. Auf Cloud Run wird
der Standard `true` verwendet. Der Request-Handler des Crawlers hat ein
Timeout von 600 Sekunden. Pro Crawler wird nur eine Anfrage gleichzeitig
verarbeitet. Bilder, Fonts, Medien und bekannte Werbe-/Tracking-Hosts werden
vor der Navigation blockiert, um Laufzeit und Speicherbedarf zu reduzieren.
Die Navigation wartet nur auf die erste Dokumentantwort (`commit`); alle für
das Scraping benötigten Elemente werden danach explizit abgewartet. Ein
vollständig fehlgeschlagener Lauf liefert HTTP 502 statt eines leeren Arrays.

Der Server nutzt `process.env.PORT` oder standardmäßig Port `8080`.

## Einschränkungen

`lastCacheBuster` und das Standard-Dataset sind pro Node-Prozess gemeinsam.
Mehrere gleichzeitige Requests sind daher nicht sauber isoliert. Außerdem
fehlt noch ein zentraler Express-Fehlerhandler, der Crawl-Fehler kontrolliert
als JSON und mit passendem HTTP-Status zurückgibt.

Die Cookie-Datei wird nicht mehr verändert. Dadurch kann sie in Cloud Run als
read-only Secret gemountet werden.
