# Dokumentation der `main.js` Datei

## Übersicht

Die `main.js` Datei ist die Hauptsteuerungsdatei des Cloud Run Services. Sie orchestriert den Ablauf des Web Scraping-Prozesses, verwaltet die Cookie-Verwaltung und den Datenabruf von der FantasyPros-Website und stellt die Daten über eine API-Endpunkt zur Verfügung.

## Funktionsweise

### 1. Initialisierung des Express Servers

Am Anfang der `main.js` wird ein Express-Server erstellt, der als HTTP-Server für den Cloud Run Service fungiert. Dieser Server lauscht auf Anfragen und führt den Web Scraping-Prozess bei einer GET-Anfrage aus.

### 2. Cookie-Verwaltung

Bevor der Web Scraping-Prozess gestartet wird, korrigiert die `main.js` Datei die Cookies, die für den Zugriff auf die FantasyPros-Website erforderlich sind. Die Cookie-Datei (`cookies.json`) wird gelesen, und alle Instanzen von `"lax"` werden in `"Lax"` und `"no_restriction"` in `"None"` umgewandelt. Diese Korrektur ist notwendig, um sicherzustellen, dass die Cookies korrekt formatiert sind und vom Playwright-Crawler akzeptiert werden.

### 3. Start des Playwright-Crawlers

Nach der Cookie-Korrektur wird der Playwright-Crawler initialisiert. Dieser Crawler wird verwendet, um die FantasyPros-Website zu durchsuchen und die gewünschten Daten zu extrahieren. Der Crawler wird mit einer Reihe von Optionen konfiguriert, einschließlich der Definition von `preNavigationHooks`, um die zuvor korrigierten Cookies zu setzen, bevor die Website geladen wird.

### 4. Datenabruf und -verarbeitung

Der Crawler wird auf die spezifische URL der FantasyPros-Website angewendet. Nach dem Laden der Seite und dem Durchführen der notwendigen Interaktionen (wie der Auswahl von Experten) extrahiert der Crawler die relevanten Daten und speichert sie in einem Dataset.

### 5. Bereitstellung der Daten über API

Nachdem der Web Scraping-Prozess abgeschlossen ist, werden die extrahierten Daten aus dem Dataset abgerufen und als JSON über den Express-Server bereitgestellt. Der Server lauscht auf Anfragen auf einem bestimmten Port und gibt die gescrapten Daten als Antwort zurück.

### 6. Portkonfiguration

Zum Schluss wird der Express-Server auf einem spezifischen Port gestartet, der entweder durch eine Umgebungsvariable (`PORT`) oder auf dem Standardport 3000 definiert wird.

## Zusammenfassung der wichtigsten Funktionen

- **Cookie-Korrektur**: Korrigiert die Cookie-Datei, bevor der Crawler gestartet wird, um sicherzustellen, dass die Cookies im richtigen Format vorliegen.
- **Playwright-Crawler**: Führt das Web Scraping durch, extrahiert die Daten und speichert sie in einem Dataset.
- **Express-Server**: Bereitstellung der gescrapten Daten über einen HTTP-Server, der auf einem spezifischen Port lauscht.

## Schlussfolgerung

Die `main.js` Datei ist das Herzstück des Scraping-Dienstes. Sie stellt sicher, dass die richtigen Cookies verwendet werden, dass der Crawler die erforderlichen Daten korrekt extrahiert und dass die Ergebnisse über eine HTTP-API bereitgestellt werden. Dies ermöglicht eine einfache Integration mit anderen Diensten, wie z.B. Google Sheets, um die Daten weiter zu verarbeiten und zu nutzen.