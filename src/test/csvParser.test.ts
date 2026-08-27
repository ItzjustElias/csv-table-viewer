import * as assert from 'assert';
import { parseCsv, detectDelimiter } from '../csvParser';

suite('csvParser', () => {
  test('parses a simple comma-delimited file', () => {
    const result = parseCsv('name,age\nAlice,30\nBob,25\n', ',', 1000);
    assert.deepStrictEqual(result.headers, ['name', 'age']);
    assert.deepStrictEqual(result.rows, [
      ['Alice', '30'],
      ['Bob', '25'],
    ]);
    assert.strictEqual(result.truncated, false);
    assert.strictEqual(result.totalRowCount, 2);
  });

  test('handles quoted fields containing the delimiter', () => {
    const result = parseCsv('name,city\n"Doe, John","Springfield"\n', ',', 1000);
    assert.deepStrictEqual(result.rows, [['Doe, John', 'Springfield']]);
  });

  test('handles quoted fields containing embedded newlines', () => {
    const result = parseCsv('name,notes\n"Alice","Line1\nLine2"\n', ',', 1000);
    assert.deepStrictEqual(result.rows, [['Alice', 'Line1\nLine2']]);
  });

  test('handles escaped quotes ("" inside a quoted field)', () => {
    const result = parseCsv('name,quote\n"Alice","She said ""hi"""\n', ',', 1000);
    assert.deepStrictEqual(result.rows, [['Alice', 'She said "hi"']]);
  });

  test('handles CRLF line endings', () => {
    const result = parseCsv('a,b\r\n1,2\r\n3,4\r\n', ',', 1000);
    assert.deepStrictEqual(result.rows, [
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  test('handles a missing trailing newline', () => {
    const result = parseCsv('a,b\n1,2', ',', 1000);
    assert.deepStrictEqual(result.rows, [['1', '2']]);
  });

  test('respects maxRows and reports truncation', () => {
    const text = 'a,b\n' + Array.from({ length: 10 }, (_, i) => `${i},${i}`).join('\n');
    const result = parseCsv(text, ',', 3);
    assert.strictEqual(result.rows.length, 2);
    assert.strictEqual(result.truncated, true);
    assert.strictEqual(result.totalRowCount, 10);
  });

  test('returns empty structure for an empty file', () => {
    const result = parseCsv('', ',', 1000);
    assert.deepStrictEqual(result.headers, []);
    assert.deepStrictEqual(result.rows, []);
  });

  test('detectDelimiter picks semicolon when it dominates the header line', () => {
    assert.strictEqual(detectDelimiter('a;b;c'), ';');
  });

  test('detectDelimiter picks tab for TSV headers', () => {
    assert.strictEqual(detectDelimiter('a\tb\tc'), '\t');
  });

  test('detectDelimiter ignores delimiter characters inside quotes', () => {
    assert.strictEqual(detectDelimiter('"a;b",c,d'), ',');
  });

  test('detectDelimiter respects an explicit override', () => {
    assert.strictEqual(detectDelimiter('a,b,c', '|'), '|');
  });
});
