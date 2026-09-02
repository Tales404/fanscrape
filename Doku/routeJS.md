# `src/routes.js`

Die Datei exportiert zwei getrennte Playwright-Router.

## `routerDraft`

Der Draft-Router öffnet das Half-PPR-Cheatsheet, schließt optional den
Cookie-Banner und stellt im Experten-Dialog die übergebenen Experten ein. Für
jede gewünschte Position versucht er anschließend:

- den Tab über ARIA-Rolle oder mehrere Selektor-Fallbacks zu öffnen,
- eine sichtbare Änderung der Tabelle abzuwarten,
- Spalten dynamisch über die Tabellenüberschriften zuzuordnen,
- Spielername, Team, Bye Week, SOS und ECR-vs.-ADP auszulesen.

Fehler einer einzelnen Position werden abgefangen; die Position erscheint dann
mit einem leeren Array im Ergebnis. Der vollständige Positions-Map wird als ein
Eintrag in das Crawlee-Dataset geschrieben.

## `routerInSeason`

Der In-Season-Router bedient die Team-Auswahl, lädt für jedes fest hinterlegte
Fantasy-Team eine CSV-Datei herunter und schreibt je Team einen Dataset-Eintrag.
Download-Versuche werden bis zu dreimal wiederholt. Fehler eines Teams stoppen
die übrigen Teams nicht.

## Fragile Stellen

- FantasyPros kann Texte, Tabellenüberschriften und DOM-Struktur ändern.
- Experten-IDs und In-Season-Teamnamen sind fest konfiguriert.
- `parseCSV()` verwendet `row.split(',')` und ist kein vollständiger CSV-Parser.
- Leere Abschlusszeilen können aktuell leere Spielerobjekte erzeugen.
