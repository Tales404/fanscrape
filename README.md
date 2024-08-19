# Fanscrape - Projektübersicht

## Einführung

Dieses Projekt namens "Fanscrape" wurde entwickelt, um die Fantasy Football-Rankings von FantasyPros zu automatisieren. Es besteht aus mehreren Komponenten, darunter ein Google Apps Script zur Integration in Google Sheets und ein Node.js-Service, der in Google Cloud Run bereitgestellt wird. 

Die wichtigsten Bestandteile des Projekts sind:

1. **Google Apps Script** - Zum Abrufen und Verarbeiten von Daten aus dem Cloud Run-Service und zum Importieren dieser Daten in spezifische Google Sheets.
2. **Cloud Run Service** - Ein Node.js-basierter Dienst, der die Daten von FantasyPros extrahiert und in einem Dataset speichert, das von Google Apps Script abgerufen wird.
3. **Crawler (Crawlee/Playwright)** - Ein Web-Crawler, der die Experten-Auswahl auf der Webseite durchführt und die Daten extrahiert.

## Struktur des Projekts

### Google Apps Script
- **Datei**: `importCloudRunData.gs`
- **Beschreibung**: Dieses Skript ruft die Daten vom Cloud Run-Service ab und importiert sie in verschiedene Google Sheets. Es analysiert die JSON-Daten und extrahiert die relevanten Informationen, wie z.B. den Spielernamen, das Team und die Bye Week, und speichert diese in spezifischen Tabellenblättern.

### Cloud Run Service
- **Datei**: `main.js`
- **Beschreibung**: Dies ist das zentrale Skript, das den Crawlee-Webcrawler konfiguriert und steuert. Es sorgt dafür, dass die Cookies korrekt gesetzt werden und der Crawler die richtige Seite besucht und die notwendigen Daten extrahiert.

### Crawlee/Playwright Crawler
- **Datei**: `routes.js`
- **Beschreibung**: Dieses Skript definiert den Web-Crawler, der die Webseite von FantasyPros besucht, Experten auswählt und die Rankings extrahiert. Es werden verschiedene Positionen (QB, RB, WR, etc.) auf der Seite durchlaufen und die entsprechenden Daten gesammelt.

## Ablauf

1. **Start des Cloud Run Service**:
   - Der Node.js-Service wird in Google Cloud Run bereitgestellt. Dieser Service startet den Crawlee-Crawler, der die FantasyPros-Seite besucht, die Experten auswählt und die Daten extrahiert.
  
2. **Datenextraktion**:
   - Der Crawler navigiert durch die Seite, wählt die entsprechenden Experten aus, lädt die Seite neu und extrahiert die Rankings für jede Position (QB, RB, WR, etc.).

3. **Speicherung der Daten**:
   - Die extrahierten Daten werden in einem Dataset gespeichert, das dann vom Google Apps Script abgerufen wird.

4. **Datenimport in Google Sheets**:
   - Das Google Apps Script ruft die Daten vom Cloud Run-Service ab und importiert sie in die entsprechenden Tabellenblätter in Google Sheets.

## Installation und Verwendung

1. **Google Apps Script**:
   - Erstellen Sie ein neues Google Sheets Dokument.
   - Öffnen Sie den Script-Editor (`Erweiterungen > Apps Script`).
   - Kopieren Sie den Code aus `importCloudRunData.gs` in den Editor und speichern Sie das Projekt.
   - Passen Sie die `cloudRunUrl` an die URL Ihres Cloud Run-Service an.
   - Führen Sie das Skript über den Script-Editor aus oder erstellen Sie ein benutzerdefiniertes Menü in Google Sheets, um es direkt aus dem Sheet auszuführen.

2. **Cloud Run Service**:
   - Klonen Sie dieses Repository.
   - Stellen Sie sicher, dass Node.js und npm installiert sind.
   - Installieren Sie die Abhängigkeiten mit `npm install`.
   - Starten Sie den Service lokal mit `npm start` oder deployen Sie ihn zu Google Cloud Run.

3. **Crawler**:
   - Der Crawler wird automatisch vom Cloud Run-Service gestartet. Erstellen Sie eine Route in `routes.js`, die die Webseite besucht und die gewünschten Daten extrahiert.

## Anmerkungen

- Stellen Sie sicher, dass Sie über ausreichende Ressourcen in Google Cloud Run verfügen, um die Last des Crawlers zu bewältigen.
- Beachten Sie, dass Änderungen an der Struktur der Zielwebseite Anpassungen im Crawler-Skript erfordern könnten.
- Verwenden Sie das Google Apps Script verantwortungsvoll und achten Sie darauf, nicht gegen die Nutzungsbedingungen von FantasyPros zu verstoßen.

## Lizenz

Dieses Projekt steht unter der [MIT-Lizenz](LICENSE).