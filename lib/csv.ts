/**
 * Minimal CSV parsing shared by the supplier importers. No dependency — the
 * files are small and supplier-uploaded. Handles quotes, commas and newlines
 * inside quoted cells, and skips fully-empty rows.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    pushCell();
    // Skip fully-empty rows (trailing newline, blank lines).
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char === "\r") {
      // Ignore; \n handles the break.
    } else {
      cell += char;
    }
  }
  pushRow();
  return rows;
}
