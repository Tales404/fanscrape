function importAdditionalRanks() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const keyMap = {
    'QB': 'Source_ADFJR_QB',
    'RB': 'Source_ADFJR_RB',
    'WR': 'Source_ADFJR_WR',
    'TE': 'Source_ADFJR_TE',
    'Overall':'Source_ADFJR_All'
  };

  // Definiere die Positionen und Experten, die verwendet werden sollen
  const positions = 'QB,RB,WR,TE,Overall';
  const experts = '1139,22,1204'; // Neue Experten
  const cacheBuster = "3"

  // Baue die URL mit den definierten Positionen, Experten und CacheBuster
  const cloudRunUrl = `https://fanscrape-3933289700.europe-west1.run.app/draft?positions=${positions}&experts=${experts}&cacheBuster=${cacheBuster}`;

  try {
    const response = UrlFetchApp.fetch(cloudRunUrl, {
      'muteHttpExceptions': true
    });
    const datasets = JSON.parse(response.getContentText());

    Logger.log(`Empfangene Daten: ${JSON.stringify(datasets)}`);

    if (!datasets || datasets.length === 0) {
      Logger.log('Keine Daten empfangen oder das Format ist ungültig.');
      return;
    }

    Object.keys(keyMap).forEach((key) => {
      const sheetName = keyMap[key];
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`Das Sheet "${sheetName}" wurde nicht gefunden.`);
        return;
      }

      const data = datasets[0][key];
      Logger.log(`Daten für ${key}: ${JSON.stringify(data)}`);

      if (data && Array.isArray(data)) {
        let rankColIndex = null;
        const lastColumn = sheet.getLastColumn();

        // Überprüfen, ob bereits eine Spalte "addadf" existiert
        for (let i = 1; i <= lastColumn; i++) {
          const header = sheet.getRange(1, i).getValue();
          if (header === "addadf") {
            rankColIndex = i;
            break;
          }
        }

        if (!rankColIndex) {
          // Falls keine "addadf"-Spalte existiert, füge eine neue hinzu
          rankColIndex = lastColumn + 1;
          sheet.getRange(1, rankColIndex).setValue("addadf");
        } else {
          // Falls die Spalte existiert, leere sie
          sheet.getRange(2, rankColIndex, sheet.getLastRow() - 1).clearContent();
        }

        const sheetData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

        // Map für Spieler und deren Ränge aus dem aktuellen Sheet basierend auf Name und Team
        const playerMap = sheetData.reduce((map, row, index) => {
          let playerName = row[headers.indexOf('Player Name')].trim().toLowerCase();
          let teamName = row[headers.indexOf('Team')].trim().toLowerCase();

          if (playerName && teamName) {
            map[`${playerName}_${teamName}`] = index + 2; // Speichert die Zeilennummer
          }
          return map;
        }, {});

        // Verarbeite die neuen Daten und füge sie den entsprechenden Zeilen hinzu
        data.forEach(player => {
          let playerName = player.team.trim();
          let team = "";

          // Prüfe, ob der Teamname in Klammern angegeben ist und trenne ihn ab
          const teamMatch = playerName.match(/\(([^)]+)\)$/);
          if (teamMatch) {
            team = teamMatch[1].toLowerCase(); // Team extrahieren
            playerName = playerName.replace(teamMatch[0], "").trim().toLowerCase(); // Team aus dem Namen entfernen
          }

          const key = `${playerName}_${team}`;

          if (playerMap[key]) {
            const rowIndex = playerMap[key];
            sheet.getRange(rowIndex, rankColIndex).setValue(player.rank);
          } else {
            Logger.log(`Spieler ${playerName} (${team}) wurde nicht in der Tabelle gefunden.`);
          }
        });

        Logger.log(`Daten erfolgreich in "${sheetName}" aktualisiert`);
      } else {
        Logger.log(`Keine gültigen Daten für "${sheetName}" im Datensatz gefunden.`);
      }
    });
  } catch (e) {
    Logger.log('Fehler beim Abrufen der Daten: ' + e.message);
  }
}