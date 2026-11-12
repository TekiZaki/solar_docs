// ---
// Summary:
// - Purpose: Sanitize OpenXML document table cells by stripping stray empty paragraphs in photo cells
// - Role: Infrastructure helper module
// - Depends on: none
// - Key Responsibilities: Remove empty paragraphs before or after drawings in table cells to eliminate top/bottom spacing anomalies
// - Notes: Operates on in-memory DOM Document/Elements before DOCX serialization
// ---

export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export function cleanPhotoTableCells(
  tables: HTMLCollectionOf<Element> | NodeListOf<Element>
): void {
  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const tbl = tables[tIdx];
    const cells = tbl.getElementsByTagNameNS(W_NS, 'tc');
    for (let cIdx = 0; cIdx < cells.length; cIdx++) {
      const tc = cells[cIdx];
      const drawings = tc.getElementsByTagNameNS(W_NS, 'drawing');
      if (drawings.length === 0) continue;

      const pList = Array.from(tc.getElementsByTagNameNS(W_NS, 'p'));
      if (pList.length <= 1) continue;

      for (const p of pList) {
        const pDrawings = p.getElementsByTagNameNS(W_NS, 'drawing');
        const text = (p.textContent || '').trim();
        if (pDrawings.length === 0 && !text) {
          p.parentNode?.removeChild(p);
        }
      }
    }
  }
}
