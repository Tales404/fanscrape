import { PlaywrightCrawler, Dataset } from 'crawlee';
import { router } from './routes.js';
import fs from 'fs/promises';
import express from 'express';

const app = express();

app.get('/', async (req, res) => {
    // Korrigiere die Cookie-Datei, bevor der Crawler gestartet wird
    const correctCookieFile = async () => {
        const filePath = 'src/config/cookies.json';
        const cookiesString = await fs.readFile(filePath, 'utf8');

        // Ersetze "lax" durch "Lax" und "no_restriction" durch "None"
        const correctedCookiesString = cookiesString
            .replace(/"lax"/g, '"Lax"')
            .replace(/"no_restriction"/g, '"None"');

        // Schreibe die korrigierte Datei zurück
        await fs.writeFile(filePath, correctedCookiesString, 'utf8');
        console.log('Cookies corrected successfully');
    };

    // Rufe die Funktion zum Korrigieren der Cookie-Datei auf
    await correctCookieFile();

    const crawler = new PlaywrightCrawler({
        requestHandler: router,
        //headless: false,
        preNavigationHooks: [
            async ({ page }) => {
                const cookiesString = await fs.readFile('src/config/cookies.json', 'utf8');
                let cookies = JSON.parse(cookiesString);

                cookies = cookies.map(cookie => ({
                    ...cookie,
                    sameSite: cookie.sameSite || 'Lax',
                }));

                await page.context().addCookies(cookies);
                console.log('Cookies set successfully');
            },
        ],
    });

    // Crawler starten
    await crawler.run(['https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php']);

    // Extrahiere die Daten aus dem Dataset und gebe sie zurück
    const dataset = await Dataset.open();
    const data = await dataset.getData();

    res.json(data.items);  // Gibt die Daten als JSON zurück
});

// Konfiguriere den Server so, dass er auf dem richtigen Port lauscht
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});