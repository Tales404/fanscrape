function importCloudRunData() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const keyMap = {
    'QB': 'Source_ADFJR_QB',
    'RB': 'Source_ADFJR_RB',
    'WR': 'Source_ADFJR_WR',
    'TE': 'Source_ADFJR_TE',
    'K':  'Source_ADFJR_K',
    'DST':'Source_ADFJR_DST',
    'Overall':'Source_ADFJR_All'
  };
  const POSITIONS = Object.keys(keyMap);

  const experts = '1139,22,1204,2694,908';
  const cacheBuster = "2";
  const baseUrl = 'https://fanscrape-3933289700.europe-west1.run.app/draft';

  const HEADERS = ["Player Name", "Team", "Bye Week", "SOS Season", "ECR vs. ADP", "Tier", "Rank"];

  // ---------- HTTP ----------
  function fetchJsonWithRetry(url, tries) {
    let lastBody = '', lastStatus = 0, lastErr = null;
    for (let i = 0; i < tries; i++) {
      try {
        const resp = UrlFetchApp.fetch(url, {
          method: 'get',
          headers: { 'Accept': 'application/json' },
          followRedirects: true,
          muteHttpExceptions: true
        });
        lastStatus = resp.getResponseCode();
        lastBody = resp.getContentText();
        Logger.log(`HTTP ${lastStatus} for ${url}`);
        Logger.log(`Body preview: ${lastBody.slice(0, 600)}`);
        if (lastStatus >= 200 && lastStatus < 300) {
          try { return { json: JSON.parse(lastBody), status: lastStatus }; }
          catch (e) { lastErr = e; }
        } else if (lastStatus === 429 || (lastStatus >= 500 && lastStatus < 600)) {
          Utilities.sleep(Math.pow(2, i) * 500);
          continue;
        } else {
          break;
        }
      } catch (e) {
        lastErr = e;
      }
      Utilities.sleep(Math.pow(2, i) * 500);
    }
    return { json: null, status: lastStatus, error: lastErr };
  }

  function normalizeDataset(json, positions) {
    if (!json) return null;
    if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object') {
      const first = json[0];
      const map = {};
      positions.forEach(p => { if (Array.isArray(first[p])) map[p] = first[p]; });
      if (Object.keys(map).length) return map;
    }
    if (typeof json === 'object' && !Array.isArray(json)) {
      const map = {};
      positions.forEach(p => { if (Array.isArray(json[p])) map[p] = json[p]; });
      if (Object.keys(map).length) return map;
    }
    return null;
  }

  function extractPositionArray(json, pos) {
    if (!json) return null;
    if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object') {
      const first = json[0];
      if (Array.isArray(first[pos])) return first[pos];
      if ('rank' in json[0]) return json; // direkt Liste von Spielern
    }
    if (typeof json === 'object' && !Array.isArray(json) && Array.isArray(json[pos])) return json[pos];
    if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object' && 'rank' in json[0]) return json;
    return null;
  }

  // ---------- Parser ----------
  const numberFromText = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number' && isFinite(val)) return val;
    const s = String(val).trim();
    const m = s.match(/[+-]?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : '';
  };

  const parseStars = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    const m = s.match(/(\d+)\s*out\s*of\s*5/i);
    if (m) return parseInt(m[1], 10);
    const filled = (s.match(/★/g) || []).length;
    if (filled) return filled;
    const m2 = s.match(/\b([1-5])\b/);
    if (m2) return parseInt(m2[1], 10);
    return '';
  };

  const findAnySOSNumber = (obj) => {
    for (const k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (k.toLowerCase().includes('sos')) {
        const v = parseStars(obj[k]);
        if (v !== '') return v;
      }
    }
    return '';
  };

  const parseNameAndTeam = (teamField, playerNameField) => {
    let name = (playerNameField || '').trim();
    let team = '';
    if (!name) {
      let t = (teamField || '').trim();
      const teamMatch = t.match(/\(([^)]+)\)\s*$/);
      if (teamMatch) {
        team = teamMatch[1].trim();
        name = t.replace(teamMatch[0], '').trim();
      } else {
        name = t;
      }
    } else {
      const t = (teamField || '').trim();
      const teamMatch = t.match(/\(([^)]+)\)\s*$/);
      if (teamMatch) team = teamMatch[1].trim();
      else team = t;
    }
    return { name, team };
  };

  const parseByeWeek = (val) => {
    const s = String(val || '').trim();
    return /^\d+$/.test(s) ? s : '';
  };

  const isTierRow = (rankVal) =>
    typeof rankVal === 'string' && rankVal.toLowerCase().includes('tier');

  // *** WICHTIG: Header-Check stark entschärft ***
  const looksLikeHeaderRow = (playerObj) => {
    const t = String(playerObj.team || '').toLowerCase();
    const rankStr = String(playerObj.rank || '').toLowerCase();
    if (t.includes('customize tiers')) return true; // echte Header-Zeile
    if (rankStr === 'rank') return true;           // Tabellenkopf
    // KEIN Filter mehr auf "coach upside/bust" -> das sind echte Spielerzeilen im Positionsfeed
    return false;
  };

  // ---------- Hauptlogik ----------
  try {
    const allPositions = POSITIONS.join(',');
    const urlAll = `${baseUrl}?positions=${encodeURIComponent(allPositions)}&experts=${encodeURIComponent(experts)}&cacheBuster=${encodeURIComponent(cacheBuster)}`;

    // Sammel-Call
    const respAll = fetchJsonWithRetry(urlAll, 3);
    let datasetMap = normalizeDataset(respAll.json, POSITIONS);

    // Fallback: Einzel-Calls
    if (!datasetMap) {
      Logger.log('Fallback: hole jede Position einzeln…');
      datasetMap = {};
      for (const pos of POSITIONS) {
        const urlPos = `${baseUrl}?positions=${encodeURIComponent(pos)}&experts=${encodeURIComponent(experts)}&cacheBuster=${encodeURIComponent(String(Date.now()))}`;
        const respPos = fetchJsonWithRetry(urlPos, 3);
        const arr = extractPositionArray(respPos.json, pos);
        if (Array.isArray(arr) && arr.length > 0) {
          datasetMap[pos] = arr;
          Utilities.sleep(200);
        } else {
          Logger.log(`Keine Daten für Position ${pos} im Fallback.`);
        }
      }
      if (Object.keys(datasetMap).length === 0) {
        Logger.log('Weder Sammel- noch Einzel-Calls liefern Daten. Abbruch.');
        return;
      }
    }

    // Schreiben in Sheets
    for (const key of POSITIONS) {
      const sheetName = keyMap[key];
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log(`Sheet "${sheetName}" nicht gefunden.`);
        continue;
      }

      sheet.clearContents();
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

      const data = datasetMap[key];
      if (!Array.isArray(data) || data.length === 0) {
        Logger.log(`Keine gültigen Daten für "${sheetName}".`);
        continue;
      }

      let currentTier = "";
      const rows = [];

      for (const player of data) {
        if (!player) continue;

        if (isTierRow(player.rank)) {
          const m = String(player.rank).match(/\d+/);
          currentTier = m ? m[0] : currentTier;
          continue;
        }

        if (looksLikeHeaderRow(player)) continue;

        const { name: playerName, team } = parseNameAndTeam(player.team, player.player_name);
        if (!playerName) continue;

        const byeWeek = parseByeWeek(player.bye_week);

        let sosSeason = parseStars(player.sos_season);
        if (sosSeason === '') sosSeason = findAnySOSNumber(player);

        let ecrVsAdp = numberFromText(player.ecr_vs_adp);
        if (ecrVsAdp === '' && player.ecr !== undefined && player.adp !== undefined) {
          const ecrNum = numberFromText(player.ecr);
          const adpNum = numberFromText(player.adp);
          if (ecrNum !== '' && adpNum !== '') ecrVsAdp = ecrNum - adpNum;
        }

        const rankVal = player.rank || '';

        rows.push([
          playerName,
          team,
          byeWeek,
          sosSeason,
          ecrVsAdp,
          currentTier || '',
          rankVal
        ]);
      }

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
        Logger.log(`Daten erfolgreich in "${sheetName}" importiert (${rows.length} Zeilen).`);
      } else {
        Logger.log(`Keine verwertbaren Zeilen für "${sheetName}" nach Filterung.`);
      }
    }

  } catch (e) {
    Logger.log('Fehler beim Abrufen oder Verarbeiten: ' + e.message);
  }
}
