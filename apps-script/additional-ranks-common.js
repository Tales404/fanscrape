function importAdditionalExpertRanks_(options) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const keyMap = {
    QB: 'Source_ADFJR_QB',
    RB: 'Source_ADFJR_RB',
    WR: 'Source_ADFJR_WR',
    TE: 'Source_ADFJR_TE',
    Overall: 'Source_ADFJR_All'
  };
  const positions = Object.keys(keyMap);
  const cacheBuster = `${options.cachePrefix}-${Date.now()}`;
  const baseUrl = 'https://fanscrape-3933289700.europe-west1.run.app/draft';
  const cloudRunUrl = `${baseUrl}?positions=${encodeURIComponent(positions.join(','))}`
    + `&experts=${encodeURIComponent(options.experts.join(','))}`
    + `&cacheBuster=${encodeURIComponent(cacheBuster)}`;

  try {
    const response = UrlFetchApp.fetch(cloudRunUrl, {
      method: 'get',
      headers: { Accept: 'application/json' },
      followRedirects: true,
      muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    const body = response.getContentText();

    if (status < 200 || status >= 300) {
      throw new Error(`Cloud Run antwortete mit HTTP ${status}: ${body.slice(0, 300)}`);
    }

    const parsed = JSON.parse(body);
    const dataset = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!dataset || typeof dataset !== 'object') {
      throw new Error('Cloud Run lieferte kein gültiges Positionsobjekt.');
    }

    const received = positions
      .filter(position => Array.isArray(dataset[position]))
      .map(position => `${position}:${dataset[position].length}`)
      .join(', ');
    Logger.log(`${options.columnHeader}: Daten empfangen (${received || 'keine Positionen'}).`);

    positions.forEach(position => {
      updateAdditionalRankColumn_(
        spreadsheet,
        keyMap[position],
        dataset[position],
        options.columnHeader,
        position
      );
    });
  } catch (error) {
    Logger.log(`${options.columnHeader}: Import fehlgeschlagen: ${error.message}`);
    throw error;
  }
}

function updateAdditionalRankColumn_(spreadsheet, sheetName, players, columnHeader, position) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`${columnHeader}/${position}: Sheet "${sheetName}" wurde nicht gefunden.`);
    return;
  }
  if (!Array.isArray(players) || players.length === 0) {
    Logger.log(`${columnHeader}/${position}: Keine gültigen Daten empfangen.`);
    return;
  }

  const lastRow = sheet.getLastRow();
  let lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) {
    Logger.log(`${columnHeader}/${position}: Das Quell-Sheet enthält keine Spielerzeilen.`);
    return;
  }

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const normalizedHeaders = headers.map(normalizeRankKeyPart_);
  const playerColumn = normalizedHeaders.indexOf('player name');
  const teamColumn = normalizedHeaders.indexOf('team');
  if (playerColumn === -1 || teamColumn === -1) {
    Logger.log(`${columnHeader}/${position}: Header "Player Name" oder "Team" fehlt.`);
    return;
  }

  let rankColumn = normalizedHeaders.indexOf(normalizeRankKeyPart_(columnHeader));
  if (rankColumn === -1) {
    rankColumn = lastColumn;
    lastColumn += 1;
    sheet.getRange(1, lastColumn).setValue(columnHeader);
  }

  const rowCount = lastRow - 1;
  const sheetData = sheet.getRange(2, 1, rowCount, lastColumn).getValues();
  const playerRows = {};
  sheetData.forEach((row, index) => {
    const playerName = normalizeRankKeyPart_(row[playerColumn]);
    const team = normalizeRankKeyPart_(row[teamColumn]);
    if (playerName && team) playerRows[`${playerName}_${team}`] = index;
  });

  const output = Array.from({ length: rowCount }, () => ['']);
  const unmatchedExamples = [];
  let matched = 0;
  let considered = 0;

  players.forEach(player => {
    if (!player || /^tier\b/i.test(String(player.rank || '').trim())) return;

    const identity = getAdditionalRankIdentity_(player);
    if (!identity.playerName || !identity.team) return;
    considered += 1;

    const key = `${normalizeRankKeyPart_(identity.playerName)}_${normalizeRankKeyPart_(identity.team)}`;
    const rowIndex = playerRows[key];
    if (rowIndex !== undefined) {
      output[rowIndex][0] = player.rank || '';
      matched += 1;
    } else if (unmatchedExamples.length < 8) {
      unmatchedExamples.push(`${identity.playerName} (${identity.team})`);
    }
  });

  sheet.getRange(2, rankColumn + 1, rowCount, 1).setValues(output);
  const unmatched = considered - matched;
  const examples = unmatchedExamples.length ? ` Beispiele: ${unmatchedExamples.join(', ')}` : '';
  Logger.log(`${columnHeader}/${position}: ${matched} Ränge geschrieben, ${unmatched} nicht gematcht.${examples}`);
}

function getAdditionalRankIdentity_(player) {
  let playerName = String(player.player_name || '').trim();
  let team = String(player.team || '').trim();

  // Backward-compatible fallback for the former "Name (TEAM)" field format.
  if (!playerName) {
    const combinedMatch = team.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (combinedMatch) {
      playerName = combinedMatch[1].trim();
      team = combinedMatch[2].trim();
    }
  }

  return { playerName, team };
}

function normalizeRankKeyPart_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}
