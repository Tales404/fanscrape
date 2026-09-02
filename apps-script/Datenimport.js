function importFantasyProsData(url, sheetName) {
  const response = UrlFetchApp.fetch(url);
  const content = response.getContentText();
  
  // Extract the relevant JavaScript block
  const scriptTagPattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
  let match;
  let ecrDataScript = '';
  let sosDataScript = '';
  
  while ((match = scriptTagPattern.exec(content)) !== null) {
    if (match[1].includes('var ecrData')) {
      ecrDataScript = match[1];
    }
    if (match[1].includes('var sosData')) {
      sosDataScript = match[1];
    }
  }

  // Check if the ecrDataScript and sosDataScript were found
  if (!ecrDataScript) {
    Logger.log('ecrData script not found');
    return;
  }

  if (!sosDataScript) {
    Logger.log('sosData script not found');
    return;
  }

  // Extract JSON from the JavaScript
  const ecrDataPattern = /var ecrData = ({[\s\S]*?});/;
  const ecrDataMatch = ecrDataPattern.exec(ecrDataScript);
  if (!ecrDataMatch) {
    Logger.log('ecrData not found');
    return;
  }

  const sosDataPattern = /var sosData = ({[\s\S]*?});/;
  const sosDataMatch = sosDataPattern.exec(sosDataScript);
  if (!sosDataMatch) {
    Logger.log('sosData not found');
    return;
  }

// Extrahiere das JSON aus dem JavaScript für adpData
const adpDataPattern = /var adpData = (\[{[\s\S]*?}\]);/;
const adpDataMatch = adpDataPattern.exec(content);
if (!adpDataMatch) {
    Logger.log('adpData not found');
    return;
}

const adpDataJson = adpDataMatch[1];
const adpData = JSON.parse(adpDataJson);

// Jetzt kannst du `adpData` verwenden

  const ecrDataJson = ecrDataMatch[1];
  const ecrData = JSON.parse(ecrDataJson);

  const sosDataJson = sosDataMatch[1];
  const sosData = JSON.parse(sosDataJson);

  console.log(ecrData);
  console.log(sosData);

  // Process data and insert it into the specific sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    Logger.log(`Sheet "${sheetName}" not found`);
    return;
  }
  sheet.clear(); // Clear the sheet before importing

  const header = ['player_id', 'player_name', 'team', 'rank_ecr', 'rank_min', 'rank_max', 'rank_ave', 'rank_std', 'pos_rank', 'tier', 'bye', 'sos', 'ecrVsAdp'];
  const data = [header];

ecrData.players.forEach(player => {
    const teamAbbreviation = player.player_team_id;
    const sosTeamData = sosData[teamAbbreviation] || {};

    // Finde das entsprechende ADP-Ranking für den Spieler
    const adpPlayerData = adpData.find(adp => adp.player_id === player.player_id);
    const adpRank = adpPlayerData ? adpPlayerData.rank_ecr : null; // Hier wird ADP verwendet

    // Berechne die Differenz zwischen ECR und ADP
    let ecrVsAdp = null;
    if (adpRank !== null && player.rank_ecr !== null) {
        ecrVsAdp = adpRank - player.rank_ecr;
    }

    // SOS nur für die Position des Spielers auswählen
    let sosPosition;
    switch (player.player_positions) {
        case 'QB':
            sosPosition = sosTeamData.qb_stars;
            break;
        case 'RB':
            sosPosition = sosTeamData.rb_stars;
            break;
        case 'WR':
            sosPosition = sosTeamData.wr_stars;
            break;
        case 'TE':
            sosPosition = sosTeamData.te_stars;
            break;
        case 'K':
            sosPosition = sosTeamData.k_stars;
            break;
        case 'DST':
            sosPosition = sosTeamData.dst_stars;
            break;
        default:
            sosPosition = '';
    }

    const row = [
        player.player_id,
        player.player_name,
        teamAbbreviation,
        player.rank_ecr,
        player.rank_min,
        player.rank_max,
        player.rank_ave,
        player.rank_std,
        player.pos_rank,
        player.tier,
        player.player_bye_week,
        sosPosition, // Füge nur die SOS für die spezifische Position hinzu
        ecrVsAdp    // Füge die ECR vs ADP Differenz hinzu
    ];
    data.push(row);
});

  // Insert all data in one go
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Fantasy Pros Import')
    .addItem('Source_All_ECR_Update', 'importFromWeb1')
    .addItem('Source_WR_ECR_Update', 'importFromWeb2')
    .addItem('Source_RB_ECR_Updatse', 'importFromWeb3')
    .addItem('Source_QB_ECR_Update', 'importFromWeb4')
    .addItem('Source_TE_ECR_Update', 'importFromWeb5')
    .addItem('Source_K_ECR_Update', 'importFromWeb6')
    .addItem('Source_DST_ECR_Update', 'importFromWeb7')    
    .addSeparator()
    .addItem('Alle Updates ausführen', 'importAll')
    .addToUi();
    ui.createMenu('CloudRun Import') // Der Name des Menüs
    .addItem('Import Cloud Run Data', 'importCloudRunData') // Der Name des Menüeintrags und die zugehörige Funktion
    .addToUi();
}

function importFromWeb1() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php', 'Source_All_ECR');
}

function importFromWeb2() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/half-point-ppr-wr-cheatsheets.php', 'Source_WR_ECR');
}

function importFromWeb3() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/half-point-ppr-rb-cheatsheets.php', 'Source_RB_ECR');
}

function importFromWeb4() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/qb-cheatsheets.php', 'Source_QB_ECR');
}

function importFromWeb5() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/half-point-ppr-te-cheatsheets.php', 'Source_TE_ECR');
}

function importFromWeb6() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/k-cheatsheets.php', 'Source_K_ECR');
}

function importFromWeb7() {
  importFantasyProsData('https://www.fantasypros.com/nfl/rankings/dst-cheatsheets.php', 'Source_DST_ECR');
}

function importAll() {
  importFromWeb1();
  importFromWeb2();
  importFromWeb3();
  importFromWeb4();
  importFromWeb5();
  importFromWeb6();
  importFromWeb7();
}