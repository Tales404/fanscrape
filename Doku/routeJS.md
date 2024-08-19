# Dokumentation der `route.js` Datei

## Übersicht

Die `route.js` Datei definiert die Logik und das Verhalten des Playwright-Crawlers, der die FantasyPros-Website durchläuft, um Daten zu extrahieren. Diese Datei enthält die Routen-Handler, die für das Navigieren auf der Website, das Interagieren mit der Seite und das Sammeln von Daten verantwortlich sind.

## Funktionsweise

### 1. Importieren der notwendigen Module

Zu Beginn der Datei werden die erforderlichen Module importiert. Dies schließt den `createPlaywrightRouter` aus Crawlee sowie das `fs` Modul zum Lesen und Bearbeiten von Dateien ein.

### 2. Initialisierung des Routers

Ein Playwright-Router wird mit `createPlaywrightRouter` erstellt. Dieser Router wird verwendet, um die verschiedenen Seiten der Website zu besuchen und auf spezifische Aktionen zu reagieren.

### 3. Cookie-Verwaltung

Die Datei beginnt mit dem Laden und Korrigieren der Cookies, die für die Navigation auf der FantasyPros-Website erforderlich sind. Die Cookies werden aus einer JSON-Datei (`cookies.json`) geladen und ihre Eigenschaften werden überprüft und gegebenenfalls korrigiert.

### 4. Seiten-Navigation und Interaktionen

Der Router führt die folgenden Hauptschritte aus:

1. **Login und Navigieren zur Hauptseite**: Nachdem die Cookies gesetzt wurden, wird die Hauptseite der FantasyPros-Website aufgerufen.

2. **Cookie-Banner Handhabung**: Falls ein Cookie-Akzeptieren-Button vorhanden ist, wird dieser geklickt, um die Navigation auf der Website fortzusetzen.

3. **Expertenauswahl**: Der "Pick Experts"-Button wird angeklickt, und im daraufhin erscheinenden Modal werden alle Experten abgewählt und spezifische Experten ausgewählt.

4. **Extraktion der Tabellen-Daten**: Nach der Auswahl der Experten wird die Tabelle auf der Website durchlaufen, um die relevanten Daten für jede Position (QB, RB, WR, TE, K, DST) zu extrahieren. Die Daten werden aus der HTML-Tabelle gelesen und in einem Dataset gespeichert.

### 5. Datenextraktion

Die Daten für jede Position werden durch das Durchsuchen der HTML-Tabelle der jeweiligen Position extrahiert. Die Funktion `extractDataForPosition` klickt auf die gewünschte Position (z.B. QB), wartet darauf, dass die Seite vollständig geladen ist, und extrahiert dann die Daten aus der Tabelle.

### 6. Speicherung der Daten

Die extrahierten Daten werden in einem Dataset gespeichert, das später in der `main.js` Datei abgerufen und als JSON zurückgegeben wird.

## Zusammenfassung der wichtigsten Funktionen

- **Cookie-Verwaltung**: Stellt sicher, dass die richtigen Cookies für die Website-Navigation gesetzt sind.
- **Seiten-Navigation**: Automatisiert die Navigation auf der FantasyPros-Website und die Interaktion mit den erforderlichen Elementen (z.B. Cookie-Banner, Expertenauswahl).
- **Datenextraktion**: Sammelt die relevanten Daten aus den Tabellen für jede Position auf der Website.
- **Datenspeicherung**: Speichert die extrahierten Daten in einem Dataset, das später verwendet wird.

## Schlussfolgerung

Die `route.js` Datei enthält die wesentlichen Routen und Logik für den Playwright-Crawler, um die FantasyPros-Website zu durchsuchen und die erforderlichen Daten zu extrahieren. Diese Datei ist für die korrekte Interaktion mit der Website und die Sammlung von Daten verantwortlich, die später über die `main.js` Datei bereitgestellt werden.