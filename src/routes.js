import { createPlaywrightRouter, Dataset } from 'crawlee';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* ------------------------------------------------------------------ */
/*  Zwei getrennte Router – Draft  &  In-Season                       */
/* ------------------------------------------------------------------ */
export const routerDraft = createPlaywrightRouter();
export const routerInSeason = createPlaywrightRouter();

/* =========================  DRAFT  ================================= */
routerDraft.addDefaultHandler(async ({ page, log, request }) => {
    const { positions, experts, cacheBuster } = request.userData || {};

    log.info(`Draft-Modus: Cache-Buster ${cacheBuster}`);

    // Cookies laden & setzen (SameSite-Default absichern)
    try {
        const cookies = JSON.parse(fs.readFileSync('src/config/cookies.json', 'utf8'))
            .map(c => ({ ...c, sameSite: c.sameSite || 'None' }));
        await page.context().addCookies(cookies);
    } catch (e) {
        log.warning(`Konnte cookies.json nicht laden: ${e?.message || e}`);
    }

    // Seite aufrufen
    await page.goto(`https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php?cacheBuster=${cacheBuster}`);
    log.info('Seite im Draft-Modus geladen.');

    // Cookie-Banner schließen (falls vorhanden)
    const acceptBtn = await page.$('#onetrust-accept-btn-handler');
    if (acceptBtn) {
        await acceptBtn.click();
        log.info('OneTrust-Banner akzeptiert.');
    }

    // Experten wählen
    await page.waitForSelector('button.header-btn--edit-experts');
    await page.click('button.header-btn--edit-experts');

    await page.waitForSelector('label[for="experts-modal-select-all"]');
    // 2× klicken = sicher abwählen
    await page.click('label[for="experts-modal-select-all"]');
    await page.click('label[for="experts-modal-select-all"]');

    if (Array.isArray(experts)) {
        for (const expert of experts) {
            await page.click(`label[for="experts-modal-select-expert-${expert}"]`);
        }
    }

    await page.click('button.fp-cta-button.fp-cta-button__primary >> text=Apply');
    log.info('Experten angewendet.');

    // Rankings je Position holen
    async function extractDataForPosition(position) {
        log.info(`Lade ${position} …`);
        let retries = 3;
        while (retries--) {
            await page.click(`a[href="javascript:;"] >> text=${position}`);
            await page.waitForSelector('.player-cell-name');

            const data = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('table tbody tr')).map(row => {
                    const cols = row.querySelectorAll('td');
                    return {
                        rank       : cols[0]?.innerText.trim(),
                        player_name: cols[1]?.innerText.trim(),
                        team       : cols[2]?.innerText.trim(),
                        bye_week   : cols[3]?.innerText.trim(),
                        sos_season : cols[4]?.innerText.trim(),
                        ecr_vs_adp : cols[5]?.innerText.trim(),
                    };
                });
            });
            if (data.length) return data;
            log.warn(`Retry ${3 - retries}/3 für ${position}`);
            await page.waitForTimeout(1000);
        }
        log.error(`Keine Daten für ${position}`);
        return [];
    }

    const ecrData = {};
    if (Array.isArray(positions)) {
        for (const pos of positions) ecrData[pos] = await extractDataForPosition(pos);
    }

    const dataset = await Dataset.open();
    await dataset.pushData(ecrData);
});

/* =======================  IN‑SEASON  ============================== */
routerInSeason.addDefaultHandler(async ({ page, log }) => {
    log.info('Starte In‑Season‑Modus …');

    // Defensive helper: click element by innerText (case‑insensitive)
    async function clickByText(selector, text, exact = true) {
        return page.evaluate(({ selector, text, exact }) => {
            const norm = (s) => (s || '').trim().toLowerCase();
            const want = norm(text);
            const els = Array.from(document.querySelectorAll(selector));
            const el = els.find(e => {
                const t = norm(e.innerText || e.textContent);
                return exact ? t === want : t.includes(want);
            });
            if (el) { el.click(); return true; }
            return false;
        }, { selector, text, exact });
    }

    // Ensure downloads dir exists
    const __filename = fileURLToPath(import.meta.url);
    const __dirname  = path.dirname(__filename);
    const downloadDir = path.resolve(__dirname, './downloads');
    try { fs.mkdirSync(downloadDir, { recursive: true }); } catch {}

    // 1) Open "View All" dropdown (be tolerant wrt copy changes)
    await page.waitForSelector('span.select-advanced__button-text', { timeout: 15000 });
    let opened = await clickByText('span.select-advanced__button-text', 'View All', true);
    if (!opened) opened = await clickByText('span.select-advanced__button-text', 'view all', false);
    if (!opened) {
        // Fallback: click the first advanced select button on the page
        await page.evaluate(() => {
            const btn = document.querySelector('span.select-advanced__button-text');
            if (btn) btn.click();
        });
    }
    await page.waitForTimeout(600);

    // 2) Turn off unnecessary checkboxes if present
    await page.evaluate(() => {
        const off = (sel) => {
            const el = document.querySelector(sel);
            if (el && el.checked) el.click();
        };
        off('input[aria-label="Toggle players taken on other teams"]');
        off('input[aria-label="Toggle available players"]');
    });

    // 3) Iterate teams robustly
    const teams = [
        'Fulda Ravens','Schwerter Vikings','Duern Raiders','Hennes seine Colts',
        'Earls Town','Seubertville',"MJ's Squad",'San Frannico 49ers',
        'Dinslaken Dolphins','Robins Seahawks',
    ];

    let prevTeam = 'Hennes seine Colts';

    // Helper: wait for dropdown list to render
    async function openDropdownForCurrentTeam(currLabel) {
        const clicked = await clickByText('span.select-advanced__button-text', currLabel, true);
        if (!clicked) {
            // If label differs (whitespace/case), try loose match then fallback to first
            const loose = await clickByText('span.select-advanced__button-text', currLabel, false);
            if (!loose) {
                await page.evaluate(() => {
                    const btn = document.querySelectorAll('span.select-advanced__button-text')[0];
                    if (btn) btn.click();
                });
            }
        }
        await page.waitForTimeout(150);
    }

    // Helper: select team option
    async function selectTeamOption(teamName) {
        const ok = await clickByText('div.select-advanced-content__text', teamName, true)
            || await clickByText('div.select-advanced-content__text', teamName, false);
        if (!ok) throw new Error(`Team-Option nicht gefunden: ${teamName}`);
        await page.waitForTimeout(500);
    }

    // Helper: trigger CSV download with retries
    async function downloadTeamCsv(teamName, attempt = 1) {
        const safe = teamName.replace(/[^\w\- ]+/g, '').replace(/\s+/g, ' ').trim();
        const filePath = path.join(downloadDir, `${safe}.csv`);
        try {
            const [download] = await Promise.all([
                page.waitForEvent('download', { timeout: 10000 }),
                page.click('i.fa.fa-download.option-icon').catch(() => page.click('i.option-icon.fa.fa-download')),
            ]);
            await download.saveAs(filePath);
            return filePath;
        } catch (err) {
            if (attempt < 3) {
                log.warning(`Download‑Retry ${attempt} für ${teamName}: ${String(err).slice(0,120)}…`);
                await page.waitForTimeout(400 * attempt);
                return downloadTeamCsv(teamName, attempt + 1);
            }
            throw err;
        }
    }

    const dataset = await Dataset.open();

    for (const team of teams) {
        try {
            log.info(`Team: ${team}`);
            await openDropdownForCurrentTeam(prevTeam);
            await selectTeamOption(team);

            // Optional stabilization: wait for table update or small idle
            await page.waitForTimeout(800);

            const csvPath = await downloadTeamCsv(team);
            const csv = fs.readFileSync(csvPath, 'utf8');
            const players = parseCSV(csv, team);
            await dataset.pushData({ team, players });

            prevTeam = team;
            await page.waitForTimeout(150);
        } catch (e) {
            log.error(`Fehler bei Team ${team}: ${e?.message || e}`);
            // Fehler protokollieren und mit dem nächsten Team fortfahren
            continue;
        }
    }

    log.info('In‑Season‑Modus abgeschlossen.');
});

/* Helper: wandelt CSV in JSON um */
function parseCSV(csv, fantasyTeam) {
    return csv.split('\n').slice(1).map(row => {
        const cols = row.split(',');
        return {
            player_name : cols[2]?.replace(/"/g, '').trim(),
            team        : cols[3]?.replace(/"/g, '').trim(),
            fantasy_team: fantasyTeam,
        };
    });
}