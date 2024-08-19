# FantasyPros Scraper Service Documentation

## Inhaltsverzeichnis
1. [Einleitung](#einleitung)
2. [Setup und Installation](#setup-und-installation)
3. [Projektstruktur](#projektstruktur)
4. [Funktionalität](#funktionalität)
5. [Google Apps Script](#google-apps-script)
6. [Cloud Run Service](#cloud-run-service)
   - [main.js](#mainjs)
   - [routes.js](#routesjs)
7. [Wichtige Anpassungen](#wichtige-anpassungen)
8. [Troubleshooting](#troubleshooting)
9. [Zukünftige Verbesserungen](#zukünftige-verbesserungen)

## Einleitung

Dieses Projekt zielt darauf ab, Daten von der FantasyPros-Website zu scrapen und diese in verschiedene Google Sheets zu importieren. Es nutzt Google Cloud Run für das Backend und Google Apps Script für die Integration mit Google Sheets. Der Dienst wählt spezifische Experten aus, lädt die Seite für verschiedene Fantasy-Positionen (QB, RB, WR, TE, K, DST) und extrahiert die entsprechenden Daten in eine Google Tabelle.

## Setup und Installation

### Voraussetzungen
- Google Cloud Konto mit Zugriff auf Cloud Run
- Node.js und npm installiert
- Zugang zu Google Sheets mit Berechtigungen zur Ausführung von Google Apps Script

### Installation
1. Klone das Repository auf deinen lokalen Rechner:
   ```bash
   git clone https://github.com/dein-repo/fantasypros-scraper.git
   cd fantasypros-scraper

### Projektstruktur
   ├── src/
│   ├── main.js          # Hauptdatei des Cloud Run Services
│   ├── routes.js        # Routen und Logik für das Scraping
│   └── config/
│       └── cookies.json # Cookies für den Login bei FantasyPros
├── package.json         # npm Konfigurationsdatei
├── README.md            # Dokumentation
└── .gitignore           # Dateien, die vom Git-Tracking ausgeschlossen sind

