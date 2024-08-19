import { createPlaywrightRouter, Dataset } from 'crawlee';
import fs from 'fs';

export const router = createPlaywrightRouter();

router.addDefaultHandler(async ({ page, log }) => {

    // Cookies aus der Datei laden und Attribute korrigieren
    const cookies = JSON.parse(fs.readFileSync('src/config/cookies.json', 'utf8'));
    cookies.forEach(cookie => {
        if (!cookie.sameSite) {
            cookie.sameSite = 'None';  // Setze 'None' als Standardwert, wenn es fehlt
        }
    });

    // Setze die korrigierten Cookies im aktuellen Session-Kontext
    await page.context().addCookies(cookies);

    // Navigiere zur gewünschten Seite nach dem Login
    await page.goto('https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php');
    log.info('Seite wurde geladen.');

    // Prüfen, ob der Cookie-Akzeptieren-Button vorhanden ist, und ihn dann anklicken
    const acceptCookiesButton = await page.$('#onetrust-accept-btn-handler');
    if (acceptCookiesButton) {
        await acceptCookiesButton.click();
        log.info('Cookie-Akzeptieren-Button wurde geklickt.');
    }

    // Warte auf den "Pick Experts"-Button und klicke ihn
    await page.waitForSelector('button.header-btn--edit-experts');
    await page.click('button.header-btn--edit-experts');
    log.info('„Pick Experts“-Button geklickt.');

    // Warte, bis das Modal erscheint, und wähle alle Experten ab und die gewünschten aus
    await page.waitForSelector('label[for="experts-modal-select-all"]');
    await page.click('label[for="experts-modal-select-all"]');  // Deselect all
    await page.click('label[for="experts-modal-select-all"]');  // Deselect all again

    // Experten-Checkboxen auswählen
    await page.click('label[for="experts-modal-select-expert-1139"]');
    await page.click('label[for="experts-modal-select-expert-22"]');
    await page.click('label[for="experts-modal-select-expert-1204"]');

    // Klicke den "Apply"-Button
    await page.click('button.fp-cta-button.fp-cta-button__primary >> text=Apply');
    log.info('„Apply“-Button geklickt.');

    // Warte kurz, um sicherzustellen, dass alles geladen ist
    await page.waitForTimeout(1000);

    // Funktion zur Extraktion der HTML-Tabelle
    async function extractDataForPosition(position) {
        log.info(`${position} wird geladen...`);

        // Klicke auf die Position
        await page.click(`a[href="javascript:;"] >> text=${position}`);
        await page.waitForTimeout(2000);

        // Extrahiere die ecrData aus der HTML-Tabelle
        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('table tbody tr'));
            return rows.map(row => {
                const columns = row.querySelectorAll('td');
                return {
                    rank: columns[0]?.innerText.trim(),          // Rank
                    player_name: columns[1]?.innerText.trim(),   // Spielername
                    team: columns[2]?.innerText.trim(),          // Team
                    bye_week: columns[3]?.innerText.trim(),      // Bye Week
                    sos_season: columns[4]?.innerText.trim(),    // SOS Season
                    ecr_vs_adp: columns[5]?.innerText.trim(),    // ECR vs. ADP
                };
            });
        });

        log.info(`ecrData${position}: ${JSON.stringify(data)}`);
        return data;
    }

    // Daten für die Positionen extrahieren
    const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
    const ecrData = {};

    for (const position of positions) {
        ecrData[position] = await extractDataForPosition(position);
    }

    // ecrData im Dataset speichern
    const dataset = await Dataset.open();
    await dataset.pushData(ecrData);
});