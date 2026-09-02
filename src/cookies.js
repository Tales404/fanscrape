import fs from 'fs/promises';

const DEFAULT_COOKIE_FILE = 'src/config/cookies.json';
const FANTASYPROS_DOMAINS = new Set(['fantasypros.com', '.fantasypros.com']);

function normalizeSameSite(value) {
    switch (String(value || '').toLowerCase()) {
        case 'strict':
            return 'Strict';
        case 'none':
        case 'no_restriction':
            return 'None';
        case 'lax':
        default:
            return 'Lax';
    }
}

export function normalizeCookies(input, nowSeconds = Date.now() / 1000) {
    if (!Array.isArray(input)) {
        throw new Error('FantasyPros cookie source must contain a JSON array.');
    }

    const cookies = input
        .map((cookie, index) => {
            if (!cookie || typeof cookie !== 'object') {
                throw new Error(`FantasyPros cookie at index ${index} is not an object.`);
            }

            const name = typeof cookie.name === 'string' ? cookie.name : '';
            const value = typeof cookie.value === 'string' ? cookie.value : '';
            const domain = typeof cookie.domain === 'string'
                ? cookie.domain.toLowerCase()
                : '';

            if (!name || !value || !FANTASYPROS_DOMAINS.has(domain)) {
                throw new Error(`FantasyPros cookie at index ${index} is invalid.`);
            }

            const rawExpiry = cookie.expires ?? cookie.expirationDate;
            const expires = Number(rawExpiry);
            if (Number.isFinite(expires) && expires > 0 && expires <= nowSeconds) {
                return null;
            }

            const normalized = {
                name,
                value,
                domain,
                path: typeof cookie.path === 'string' && cookie.path
                    ? cookie.path
                    : '/',
                httpOnly: Boolean(cookie.httpOnly),
                secure: Boolean(cookie.secure),
                sameSite: normalizeSameSite(cookie.sameSite),
            };

            if (Number.isFinite(expires) && expires > 0) {
                normalized.expires = expires;
            }

            return normalized;
        })
        .filter(Boolean);

    if (cookies.length === 0) {
        throw new Error('FantasyPros cookie source contains no usable cookies.');
    }

    return cookies;
}

export async function loadFantasyProsCookies({ env = process.env } = {}) {
    const inlineJson = env.FANTASYPROS_COOKIES_JSON?.trim();
    const cookieFile = env.FANTASYPROS_COOKIES_FILE?.trim()
        || DEFAULT_COOKIE_FILE;

    let raw;
    try {
        raw = inlineJson || await fs.readFile(cookieFile, 'utf8');
    } catch (error) {
        throw new Error(`FantasyPros cookie source could not be read: ${error.message}`);
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error('FantasyPros cookie source is not valid JSON.');
    }

    return normalizeCookies(parsed);
}
