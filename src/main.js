import { PlaywrightCrawler, Dataset } from 'crawlee';
import { routerDraft, routerInSeason } from './routes.js';
import fs from 'fs/promises';
import express from 'express';

const app = express();
let lastCacheBuster = null;

/**
 * Normalisiert die Cookie‑Datei: "lax" → "Lax", "no_restriction" → "None".
 * Muss vor jedem Crawler‑Run aufgerufen werden, damit Playwright nicht crasht.
 */
async function correctCookieFile() {
    const filePath = 'src/config/cookies.json';
    const cookiesString = await fs.readFile(filePath, 'utf8');
    const corrected = cookiesString
        .replace(/"lax"/g, '"Lax"')
        .replace(/"no_restriction"/g, '"None"');
    await fs.writeFile(filePath, corrected, 'utf8');
    console.log('Cookies corrected successfully');
}

/**
 * Baut einen vorkonfigurierten PlaywrightCrawler je nach Router‑Variante.
 */
function buildCrawler(router, { headless = true } = {}) {
    return new PlaywrightCrawler({
        requestHandler: router,
        requestHandlerTimeoutSecs: 120,
        launchContext: {
            launchOptions: {
                headless,
            },
        },
        preNavigationHooks: [
            async ({ page }) => {
                const cookiesString = await fs.readFile('src/config/cookies.json', 'utf8');
                let cookies = JSON.parse(cookiesString);
                cookies = cookies.map(c => ({ ...c, sameSite: c.sameSite || 'Lax' }));
                await page.context().addCookies(cookies);
                console.log('Cookies set successfully');
            },
        ],
    });
}

/* ------------------------------------------------------------------ */
/*  /draft – Scraping‑Logik für Draft‑Rankings                        */
/* ------------------------------------------------------------------ */
app.get('/draft', async (req, res) => {
    const { positions, experts, cacheBuster } = req.query;

    await correctCookieFile();

    // Cache steuern
    if (cacheBuster !== lastCacheBuster) {
        const dataset = await Dataset.open();
        await dataset.drop();
        lastCacheBuster = cacheBuster;
    }

    const isHeadless = String(req.query.headless ?? 'true').toLowerCase() !== 'false';
    const crawler = buildCrawler(routerDraft, { headless: isHeadless });

    await crawler.run([{
        url: `https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php?cacheBuster=${cacheBuster}`,
        userData: {
            positions: positions ? positions.split(',') : [],
            experts:   experts   ? experts.split(',')   : [],
            cacheBuster: cacheBuster || Date.now().toString(),
        },
    }]);

    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    res.json(items);
});

/* ------------------------------------------------------------------ */
/*  /inSeason – Scraping‑Logik für In‑Season‑Rankings                 */
/* ------------------------------------------------------------------ */
app.get('/inSeason', async (req, res) => {
    const { cacheBuster } = req.query;

    await correctCookieFile();

    if (cacheBuster !== lastCacheBuster) {
        const dataset = await Dataset.open();
        await dataset.drop();
        lastCacheBuster = cacheBuster;
    }

    const isHeadless = String(req.query.headless ?? 'true').toLowerCase() !== 'false';
    const crawler = buildCrawler(routerInSeason, { headless: isHeadless });
    await crawler.run([{
        url: `https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php?cacheBuster=${cacheBuster}`,
        userData: { cacheBuster: cacheBuster || Date.now().toString() },
    }]);

    const dataset = await Dataset.open();
    const { items } = await dataset.getData();
    res.json(items);
});

/* ------------------------------------------------------------------ */
/*  Server start                                                      */
/* ------------------------------------------------------------------ */
const PORT = process.env.PORT || 8080; // Cloud Run nutzt 8080
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});