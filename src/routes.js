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

    const positionsList = Array.isArray(positions)
        ? positions
        : (typeof positions === 'string'
            ? positions.split(',').map(s => s.trim()).filter(Boolean)
            : []);

    const expertsList = Array.isArray(experts)
        ? experts
        : (typeof experts === 'string'
            ? experts.split(',').map(s => s.trim()).filter(Boolean)
            : []);

    // Default positions if none provided
    const POS_DEFAULT = ['QB','RB','WR','TE','K','DST','Overall'];
    const posToFetch = positionsList.length ? positionsList : POS_DEFAULT;
    log.info(`Draft-Positions: ${JSON.stringify(posToFetch)}`);

    log.info(`Draft-Modus: Cache-Buster ${cacheBuster}`);

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

    if (expertsList.length) {
        for (const expert of expertsList) {
            await page.click(`label[for="experts-modal-select-expert-${expert}"]`).catch(() => {});
        }
    }

    await page.click('button.fp-cta-button.fp-cta-button__primary >> text=Apply');
    log.info('Experten angewendet.');
    // Warte, bis die Tabelle wirklich gerendert ist (headless braucht teils länger)
    await page.waitForSelector('table tbody tr', { timeout: 30000 });
    await page.waitForTimeout(800);

    // --- Helpers for robust tab switching and header mapping ---
    async function clickPositionTab(position) {
        // Current FantasyPros markup: exact link inside the position tab list.
        try {
            const clicked = await page.evaluate((pos) => {
                const want = String(pos || '').trim().toLowerCase();
                const tabs = Array.from(document.querySelectorAll(
                    'li.position__li > a, li.position__li > button',
                ));
                const tab = tabs.find(element =>
                    (element.innerText || element.textContent || '').trim().toLowerCase() === want,
                );
                if (!tab) return false;
                tab.click();
                return true;
            }, position);
            if (clicked) {
                await page.waitForTimeout(200);
                return true;
            }
        } catch {}

        // Try ARIA role first (if Playwright's getByRole is available)
        try {
            const roleTab = page.getByRole?.('tab', { name: new RegExp(`^${position}\\b`, 'i') });
            if (roleTab) { await roleTab.click({ timeout: 1500 }); return true; }
        } catch {}
        // Fallback selectors
        const candidates = [
            `a:has-text("${position}")`,
            `button:has-text("${position}")`,
            `a[role="tab"]:has-text("${position}")`,
            `li:has-text("${position}") a`,
            `li:has-text("${position}") button`,
            `a[href="javascript:;"]:has-text("${position}")`,
        ];
        for (const sel of candidates) {
            try {
                const el = await page.$(sel);
                if (el) {
                    await el.click({ timeout: 1500 });
                    await page.waitForTimeout(200); // kleine Stabilisierungspause nach dem Klick
                    return true;
                }
            } catch {}
        }
        // Last resort: scan common tab containers and click by text
        try {
            const clicked = await page.evaluate((pos) => {
                const norm = s => (s||'').trim().toLowerCase();
                const want = norm(pos);
                const roots = document.querySelectorAll('.fp-tabs, .tabs, .rankings-tabs, nav, ul');
                for (const root of roots) {
                    const links = root.querySelectorAll('a,button,li');
                    for (const a of links) {
                        const t = norm(a.innerText || a.textContent);
                        if (t && (t === want || t.startsWith(want))) { a.click(); return true; }
                    }
                }
                return false;
            }, position);
            if (clicked) return true;
        } catch {}
        return false;
    }

    async function getHeaderMap() {
        return page.evaluate(() => {
            const map = {};
            const table = Array.from(document.querySelectorAll('table')).find(candidate =>
                Array.from(candidate.querySelectorAll('thead th')).some(th =>
                    /player\s+name/i.test(th.innerText || th.textContent || ''),
                ),
            );
            if (!table) return map;

            const headerRows = Array.from(table.querySelectorAll('thead tr'));
            const ths = Array.from(headerRows.at(-1)?.querySelectorAll('th,td') || []);
            ths.forEach((th, idx) => {
                const t = (th.innerText || th.textContent || '').trim().toLowerCase();
                if (!t) return;
                if (t === 'rk' || t.includes('rank')) map.rank = idx;
                if (t.includes('player')) map.player = idx;
                if (t.includes('team')) map.team = idx;
                if (t.includes('bye'))  map.bye = idx;
                if (t.includes('sos'))  map.sos = idx; // real SOS column (ignore coach rows later)
                if (t === 'ecr vs. adp' || t.includes('ecr vs') || (t.includes('ecr') && t.includes('adp'))) map.ecr_vs_adp = idx;
                if (map.ecr_vs_adp == null && t.includes('ecr')) map.ecr = idx;
                if (t.includes('adp'))  map.adp = idx;
            });
            return map;
        });
    }

    async function extractDataForPosition(position) {
        log.info(`Lade ${position} …`);

        // Snapshot table content to detect the asynchronous tab update.
        const beforeTableState = await page.evaluate(() => {
            const table = Array.from(document.querySelectorAll('table')).find(candidate =>
                Array.from(candidate.querySelectorAll('thead th')).some(th =>
                    /player\s+name/i.test(th.innerText || th.textContent || ''),
                ),
            );
            return (table?.querySelector('tbody')?.innerText || '').slice(0, 500);
        });

        // Click the tab (retry a few times)
        let clicked = false;
        for (let i = 0; i < 3 && !clicked; i++) {
            clicked = await clickPositionTab(position);
            if (!clicked) await page.waitForTimeout(300);
        }
        if (!clicked) log.warning(`Konnte Tab für ${position} nicht zuverlässig klicken.`);

        // Wait for content change with MutationObserver (max ~6s)
        const changed = await page.evaluate(async (previous) => {
            const table = Array.from(document.querySelectorAll('table')).find(candidate =>
                Array.from(candidate.querySelectorAll('thead th')).some(th =>
                    /player\s+name/i.test(th.innerText || th.textContent || ''),
                ),
            );
            const tbody = table?.querySelector('tbody');
            if (!tbody) return false;
            if (tbody.innerText.slice(0, 500) !== previous) return true;
            return await new Promise(resolve => {
                let done = false;
                const obs = new MutationObserver(() => {
                    if (done) return;
                    const now = tbody.innerText.slice(0, 500);
                    if (now && now !== previous) { done = true; obs.disconnect(); resolve(true); }
                });
                obs.observe(tbody, { childList: true, subtree: true });
                setTimeout(() => { if (!done) { done = true; obs.disconnect(); resolve(false); } }, 6000);
            });
        }, beforeTableState);
        if (!changed) {
            log.warning(`Tabelle hat sich für ${position} nicht sichtbar geändert – lese trotzdem.`);
            await page.waitForTimeout(600);
        }

        // Build header map
        const headerMap = await getHeaderMap();
        if (!headerMap || headerMap.player == null) {
            log.warning(`Header-Map unvollständig für ${position}: ${JSON.stringify(headerMap)}`);
        }

        // Fallback: wenn keine Player-Spalte ermittelt wurde, nutze .player-cell-name
        const usePlayerCellSelector = !headerMap || headerMap.player == null;

        // Extract rows using header mapping (plus Fallback)
        const rows = await page.evaluate(({ map, usePlayerCellSelector }) => {
            const cleanNum = (s) => {
                const m = String(s||'').match(/[+-]?\d+(\.\d+)?/);
                return m ? m[0] : '';
            };
            const getText = (tds, i) => (i != null && tds[i]) ? (tds[i].innerText || tds[i].textContent || '').trim() : '';

            const parseNameTeam = (playerCellText, teamCellText) => {
                let name = (playerCellText || '').trim();
                let team = '';
                if (!name) {
                    const t = (teamCellText || '').trim();
                    const m = t.match(/^(.*)\(([^)]+)\)\s*$/);
                    if (m) { name = m[1].trim(); team = m[2].trim(); }
                    else { name = t; }
                } else {
                    const m = name.match(/^(.*)\(([^)]+)\)\s*$/);
                    if (m && !teamCellText) { name = m[1].trim(); team = m[2].trim(); }
                }
                if (!team && teamCellText) {
                    const mt = teamCellText.match(/\(([^)]+)\)/);
                    if (mt) team = mt[1].trim();
                }
                return { name, team };
            };

            const out = [];
            const table = Array.from(document.querySelectorAll('table')).find(candidate =>
                Array.from(candidate.querySelectorAll('thead th')).some(th =>
                    /player\s+name/i.test(th.innerText || th.textContent || ''),
                ),
            );
            const trs = Array.from(table?.querySelectorAll('tbody tr') || []);
            for (const tr of trs) {
                const tds = tr.querySelectorAll('td');
                const rankTxt = getText(tds, map?.rank);
                if ((rankTxt || '').toLowerCase().includes('tier')) {
                    out.push({ rank: rankTxt, player_name: '', team: 'Customize Tiers' });
                    continue;
                }

                let playerCell = getText(tds, map?.player);
                let teamCell   = getText(tds, map?.team);

                if (usePlayerCellSelector) {
                    const cell = tr.querySelector('.player-cell-name, .player-name, td a.player-name');
                    playerCell = (cell && (cell.textContent||'').trim()) || playerCell;
                    // Team-Kürzel ggf. aus derselben Zelle oder Nachbarzelle ziehen
                    const near = tr.querySelector('.player-cell-name, .player-name')?.closest('td');
                    if (near) {
                        const m = near.innerText.match(/\(([^)]+)\)/);
                        if (m) teamCell = m[1].trim();
                    }
                    if (!teamCell) {
                        const tdWithParens = Array.from(tds).find(td => /\([A-Z]{2,3}\)/.test(td.innerText));
                        if (tdWithParens) {
                            const m2 = tdWithParens.innerText.match(/\(([^)]+)\)/);
                            if (m2) teamCell = m2[1].trim();
                        }
                    }
                }

                const { name, team } = parseNameTeam(playerCell, teamCell);
                if (!name) continue;

                const bye = getText(tds, map?.bye);

                let sos = getText(tds, map?.sos);
                if (sos && /coach\s+(upside|bust)/i.test(sos)) sos = '';

                let ecrVsAdp = getText(tds, map?.ecr_vs_adp);
                if (!ecrVsAdp) {
                    const ecr = getText(tds, map?.ecr);
                    const adp = getText(tds, map?.adp);
                    const e = parseFloat(cleanNum(ecr));
                    const a = parseFloat(cleanNum(adp));
                    if (!isNaN(e) && !isNaN(a)) ecrVsAdp = String(e - a);
                }

                out.push({
                    rank: rankTxt,
                    player_name: name,
                    team: team,
                    bye_week: bye,
                    sos_season: sos,
                    ecr_vs_adp: ecrVsAdp,
                });
            }
            return out;
        }, { map: headerMap, usePlayerCellSelector });

        if (!rows || rows.length === 0) {
            const debugHead = await page.evaluate(() => {
                const table = Array.from(document.querySelectorAll('table')).find(candidate =>
                    Array.from(candidate.querySelectorAll('thead th')).some(th =>
                        /player\s+name/i.test(th.innerText || th.textContent || ''),
                    ),
                );
                return {
                    head: Array.from(table?.querySelectorAll('thead tr:last-child th') || [])
                        .map(th => (th.innerText || '').trim()),
                    firstRow: table?.querySelector('tbody tr')?.innerText?.slice(0, 200) || 'none',
                };
            });
            log.warning(`Keine Rows für ${position}. Header: ${JSON.stringify(debugHead.head)} | firstRow: ${debugHead.firstRow}`);
        }
        return rows.filter(r => r && (
            r.player_name || String(r.rank || '').toLowerCase().includes('tier')
        ));
    }

    const ecrData = {};
    for (const pos of posToFetch) {
        try {
            ecrData[pos] = await extractDataForPosition(pos);
        } catch (err) {
            log.warning(`Fehler beim Laden von ${pos}: ${err?.message || err}`);
            ecrData[pos] = [];
        }
    }

    const dataset = await Dataset.open();
    await dataset.pushData(ecrData);
    // Optional: store on page context for direct retrieval if main.js reads from there
    try { await page.exposeFunction('fanscrapeResult', () => ecrData); } catch {}
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
        'Action Jackson','Schwerter Vikings','Duern Raiders','Hennes seine Colts',
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
