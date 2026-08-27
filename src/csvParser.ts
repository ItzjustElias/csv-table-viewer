/** Supported field delimiters. */
export type Delimiter = ',' | ';' | '\t' | '|';

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  delimiter: Delimiter;
  truncated: boolean;
  totalRowCount: number;
}

const CANDIDATE_DELIMITERS: Delimiter[] = [',', ';', '\t', '|'];

export function detectDelimiter(sampleLine: string, override?: Delimiter): Delimiter {
  if (override) {
    return override;
  }
  let best: Delimiter = ',';
  let bestCount = -1;
  for (const candidate of CANDIDATE_DELIMITERS) {
    const count = countOutsideQuotes(sampleLine, candidate);
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, char: string): number {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === char && !inQuotes) {
      count++;
    }
  }
  return count;
}

// strip BOM (Byte Order Mark) from the beginning of the text if present to
// avoid issues with parsing. BOM is a Unicode character used to signal the endianness of a text file or stream.
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function parseCsv(text: string, delimiter: Delimiter, maxRows: number): ParsedCsv {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const len = text.length;
  let totalRowCount = 0;
  let truncated = false;

  const pushField = (): void => {
    row.push(field);
    field = '';
  };

  const pushRow = (): void => {
    pushField();
    const isBlankRow = row.length === 1 && row[0] === '';
    if (!isBlankRow) {
      totalRowCount++;
      if (rows.length < maxRows) {
        rows.push(row);
      } else {
        truncated = true;
      }
    }
    row = [];
  };

  while (i < len) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === delimiter) {
      pushField();
      i++;
      continue;
    }
    if (c === '\r') {
      if (text[i + 1] === '\n') {
        i++;
      }
      pushRow();
      i++;
      continue;
    }
    if (c === '\n') {
      pushRow();
      i++;
      continue;
    }
    field += c;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  const headers = rows.length > 0 ? rows[0] : [];
  const dataRows = rows.slice(1);
  const totalDataRows = Math.max(0, totalRowCount - 1);

  return { headers, rows: dataRows, delimiter, truncated, totalRowCount: totalDataRows };
}
