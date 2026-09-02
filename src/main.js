import { PlaywrightCrawler, Dataset } from 'crawlee';
import { routerDraft, routerInSeason } from './routes.js';
import { loadFantasyProsCookies } from './cookies.js';
import express from 'express';

const app = express();
let lastCacheBuster = null;

/**
 * Baut einen vorkonfigurierten PlaywrightCrawler je nach Router‑Variante.
 */
function buildCrawler(router, { cookies, headless = true } = {}) {
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

    const cookies = await loadFantasyProsCookies();

    // Cache steuern
    if (cacheBuster !== lastCacheBuster) {
        const dataset = await Dataset.open();
        await dataset.drop();
        lastCacheBuster = cacheBuster;
    }

    const isHeadless = String(req.query.headless ?? 'true').toLowerCase() !== 'false';
    const crawler = buildCrawler(routerDraft, { cookies, headless: isHeadless });

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

    const cookies = await loadFantasyProsCookies();

    if (cacheBuster !== lastCacheBuster) {
        const dataset = await Dataset.open();
        await dataset.drop();
        lastCacheBuster = cacheBuster;
    }

    const isHeadless = String(req.query.headless ?? 'true').toLowerCase() !== 'false';
    const crawler = buildCrawler(routerInSeason, { cookies, headless: isHeadless });
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
