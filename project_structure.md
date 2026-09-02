# Projektstruktur

```text
fanscrape/
├── apps-script/
│   ├── appsscript.json
│   ├── Datenimport.js
│   ├── importHTMLEXP.js
│   ├── addrank-adf.js
│   └── addrank-jr.js
├── Doku/
│   ├── Allgemein.md
│   ├── appscript
│   ├── mainJS.md
│   └── routeJS.md
├── src/
│   ├── config/
│   │   └── cookies.example.json
│   ├── downloads/
│   ├── cookies.js
│   ├── main.js
│   └── routes.js
├── test/
│   └── cookies.test.js
├── AGENTS.md
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

Nicht versioniert werden unter anderem `node_modules/`, `storage/`,
`.clasprc.json`, `.clasp.json` und die lokale `src/config/cookies.json`.
Die Datei ist in älteren Commits noch enthalten. Vor dem nächsten Cloud-Run-
Deployment wird sie durch einen Secret-Manager-Mount ersetzt.
