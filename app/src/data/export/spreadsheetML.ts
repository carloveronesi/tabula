/**
 * Serializza fogli tabellari nel formato SpreadsheetML 2003 (XML piano che Excel
 * apre con più fogli). Zero dipendenze: solo generazione di stringhe. I numeri
 * finiscono in celle `Number` (Excel li mostra secondo la locale dell'utente),
 * le stringhe in celle `String` con escaping di `& < > "`.
 */
export type Cell = string | number;

export interface Sheet {
  name: string;
  headers: string[];
  rows: Cell[][];
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function cellXml(c: Cell): string {
  return typeof c === "number"
    ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>`
    : `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`;
}

function rowXml(cells: Cell[]): string {
  return `<Row>${cells.map(cellXml).join("")}</Row>`;
}

function sheetXml(s: Sheet): string {
  const rows = [s.headers, ...s.rows].map(rowXml).join("");
  return `<Worksheet ss:Name="${esc(s.name)}"><Table>${rows}</Table></Worksheet>`;
}

export function sheetsToXls(sheets: Sheet[]): string {
  return (
    `<?xml version="1.0"?>\n` +
    `<?mso-application progid="Excel.Sheet"?>\n` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"` +
    ` xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n` +
    sheets.map(sheetXml).join("\n") +
    `\n</Workbook>`
  );
}
