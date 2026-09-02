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
        requestHandlerTimeoutSecs: 600,
        navigationTimeoutSecs: 90,
        maxConcurrency: 1,
        maxRequestRetries: 1,
        launchContext: {
            launchOptions: {
                headless,
            },
        },
        preNavigationHooks: [
            async ({ page }, gotoOptions) => {
                // FantasyPros keeps optional third-party requests open in Cloud Run.
                // Continue as soon as the main document responds; the handler waits
                // explicitly for every element it needs.
                gotoOptions.waitUntil = 'commit';
                await page.route('**/*', async route => {
                    const request = route.request();
                    const resourceType = request.resourceType();
                    const hostname = new URL(request.url()).hostname;
                    const blockedResource = ['font', 'image', 'media'].includes(resourceType);
                    const blockedHost = /(^|\.)(doubleclick\.net|googlesyndication\.com|google-analytics\.com|googletagmanager\.com|amazon-adsystem\.com|criteo\.com|pubmatic\.com|rubiconproject\.com|scorecardresearch\.com)$/.test(hostname);

                    if (blockedResource || blockedHost) {
                        await route.abort();
                    } else {
                        await route.continue();
                    }
                });
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
    if (items.length === 0) {
        return res.status(502).json({ error: 'FantasyPros scrape produced no data.' });
    }
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
    if (items.length === 0) {
        return res.status(502).json({ error: 'FantasyPros scrape produced no data.' });
    }
    res.json(items);
});

/* ------------------------------------------------------------------ */
/*  Server start                                                      */
/* ------------------------------------------------------------------ */
const PORT = process.env.PORT || 8080; // Cloud Run nutzt 8080
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
