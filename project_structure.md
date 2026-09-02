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
│   │   └── cookies.json
│   ├── downloads/
│   ├── main.js
│   └── routes.js
├── AGENTS.md
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

Nicht versioniert werden unter anderem `node_modules/`, `storage/`,
`.clasprc.json` und `.clasp.json`. `src/config/cookies.json` ist historisch
noch versioniert, obwohl es vertrauliche Sitzungsdaten enthält; die Migration
auf Laufzeit-Secrets ist offen.
