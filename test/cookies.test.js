import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCookies } from '../src/cookies.js';

test('normalizes a Chrome cookie export for Playwright', () => {
    const cookies = normalizeCookies([{
        domain: '.fantasypros.com',
        expirationDate: 2_000,
        hostOnly: false,
        httpOnly: true,
        name: 'session',
        path: '/',
        sameSite: 'no_restriction',
        secure: true,
        session: false,
        storeId: '0',
        value: 'secret',
    }], 1_000);

    assert.deepEqual(cookies, [{
        domain: '.fantasypros.com',
        expires: 2_000,
        httpOnly: true,
        name: 'session',
        path: '/',
        sameSite: 'None',
        secure: true,
        value: 'secret',
    }]);
});

test('drops expired cookies', () => {
    const cookies = normalizeCookies([
        {
            domain: '.fantasypros.com',
            expirationDate: 999,
            name: 'expired',
            path: '/',
            value: 'old',
        },
        {
            domain: '.fantasypros.com',
            expirationDate: 2_000,
            name: 'valid',
            path: '/',
            value: 'current',
        },
    ], 1_000);

    assert.equal(cookies.length, 1);
    assert.equal(cookies[0].name, 'valid');
});

test('rejects cookies for unrelated domains', () => {
    assert.throws(() => normalizeCookies([{
        domain: '.example.com',
        name: 'unexpected',
        path: '/',
        value: 'secret',
    }]), /invalid/);
});
