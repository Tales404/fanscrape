# `src/main.js`

`main.js` startet die Express-Anwendung und verbindet HTTP-Anfragen mit den
beiden Crawlee-Routern aus `routes.js`.

## Ablauf einer Anfrage

1. `correctCookieFile()` normalisiert die `sameSite`-Werte in
   `src/config/cookies.json`.
2. Bei verändertem `cacheBuster` wird das gemeinsame Standard-Dataset
   verworfen.
3. `buildCrawler()` erzeugt einen PlaywrightCrawler, setzt Cookies vor der
   Navigation und verwendet den passenden Router.
4. Nach dem Crawl liest der Endpunkt alle Dataset-Einträge und antwortet mit
   JSON.

## Routen

- `/draft`: übergibt `positions`, `experts` und `cacheBuster` an `routerDraft`
- `/inSeason`: übergibt `cacheBuster` an `routerInSeason`

`headless=false` kann den Browser lokal sichtbar starten. Auf Cloud Run wird
der Standard `true` verwendet. Der Request-Handler des Crawlers hat ein
Timeout von 120 Sekunden.

Der Server nutzt `process.env.PORT` oder standardmäßig Port `8080`.

## Einschränkungen

`lastCacheBuster` und das Standard-Dataset sind pro Node-Prozess gemeinsam.
Mehrere gleichzeitige Requests sind daher nicht sauber isoliert. Außerdem
fehlt noch ein zentraler Express-Fehlerhandler, der Crawl-Fehler kontrolliert
als JSON und mit passendem HTTP-Status zurückgibt.
