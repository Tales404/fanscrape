import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

function createSheet(values) {
    return {
        values,
        getLastRow() { return this.values.length; },
        getLastColumn() { return Math.max(...this.values.map(row => row.length)); },
        getRange(row, column, rowCount = 1, columnCount = 1) {
            const sheet = this;
            return {
                getValues() {
                    return Array.from({ length: rowCount }, (_, rowOffset) =>
                        Array.from({ length: columnCount }, (_, columnOffset) =>
                            sheet.values[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? '',
                        ),
                    );
                },
                setValue(value) {
                    while (sheet.values.length < row) sheet.values.push([]);
                    sheet.values[row - 1][column - 1] = value;
                },
                setValues(rows) {
                    rows.forEach((sourceRow, rowOffset) => {
                        while (sheet.values.length < row + rowOffset) sheet.values.push([]);
                        sourceRow.forEach((value, columnOffset) => {
                            sheet.values[row - 1 + rowOffset][column - 1 + columnOffset] = value;
                        });
                    });
                },
            };
        },
    };
}

test('matches separate player_name and team fields and skips tier rows', () => {
    const sheet = createSheet([
        ['Player Name', 'Team', 'Rank'],
        ['Josh Allen', 'BUF', '1'],
        ['Jahmyr Gibbs', 'DET', '1'],
        ['Unmatched Existing Player', 'FA', '99'],
    ]);
    const logs = [];
    const context = vm.createContext({ Logger: { log: message => logs.push(message) } });
    const source = fs.readFileSync(new URL('../apps-script/additional-ranks-common.js', import.meta.url), 'utf8');
    vm.runInContext(source, context);

    context.updateAdditionalRankColumn_(
        { getSheetByName: () => sheet },
        'Source_ADFJR_QB',
        [
            { rank: 'Tier 1', player_name: '', team: 'Customize Tiers' },
            { rank: '1', player_name: 'Josh Allen', team: 'BUF' },
            { rank: '2', player_name: '', team: 'Jahmyr Gibbs (DET)' },
        ],
        'addadf',
        'QB',
    );

    assert.equal(sheet.values[0][3], 'addadf');
    assert.equal(sheet.values[1][3], '1');
    assert.equal(sheet.values[2][3], '2');
    assert.equal(sheet.values[3][3], '');
    assert.match(logs.at(-1), /2 Ränge geschrieben, 0 nicht gematcht/);
});
