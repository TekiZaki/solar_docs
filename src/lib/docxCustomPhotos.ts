// ---
// Summary:
// - Purpose: Dynamic injection of custom user photo slots into OpenXML tables and relationships
// - Role: Infrastructure / Export helper
// - Depends on: jszip, src/types/schema.ts, ./docxExport.ts
// - Key Responsibilities: Regroup customized phases in flat saved order, wire drawing blip rIds, and attach to phase sections
// - Notes: Template tables keep structure and headers; only photo content assignment follows webapp order
// ---

import type JSZip from 'jszip';
import type { MaintenanceReportState, PhotoSlot } from '../types/schema';
import {
  W_NS,
  applyDrawingExtents,
  setTcText,
  resolveSlotBytes,
} from './docxExport';
import { PHOTO_SLOTS_CATALOG } from '../constants/photoSlots';

function setDrawingBlip(drawing: Element, rId: string): void {
  const blip = drawing.getElementsByTagName('a:blip')[0] || drawing.querySelector('*|blip');
  if (blip) blip.setAttribute('r:embed', rId);
  applyDrawingExtents(drawing);
}

interface PhotoPosition {
  drawing: Element;
  dateCell: Element;
  capCell: Element;
}

// Ordered photo cells of phase template tables in document order.
// Each drawing pairs with the two caption cells below it (date, caption).
function collectPhasePhotoPositions(phaseTables: Element[]): PhotoPosition[] {
  const positions: PhotoPosition[] = [];
  for (const tbl of phaseTables) {
    const rows = Array.from(tbl.getElementsByTagNameNS(W_NS, 'tr'));
    for (let r = 0; r < rows.length; r++) {
      const drawings = Array.from(rows[r].getElementsByTagNameNS(W_NS, 'drawing'));
      if (drawings.length === 0) continue;
      const capRow = rows[r + 1];
      if (!capRow) continue;
      const capCells = Array.from(capRow.getElementsByTagNameNS(W_NS, 'tc'));
      drawings.forEach((drawing, di) => {
        const dateCell = capCells[di * 2];
        const capCell = capCells[di * 2 + 1];
        if (drawing && dateCell && capCell) positions.push({ drawing, dateCell, capCell });
      });
    }
  }
  return positions;
}

function fillOverflowPair(
  template2Photo: Element,
  anchor: Element,
  s1: PhotoSlot,
  s2: PhotoSlot | undefined
): Element {
  const tblClone = template2Photo.cloneNode(true) as Element;
  const rows = tblClone.getElementsByTagNameNS(W_NS, 'tr');
  const drawings = rows[0].getElementsByTagNameNS(W_NS, 'drawing');
  const capCells = rows[1].getElementsByTagNameNS(W_NS, 'tc');

  if (drawings[0]) setDrawingBlip(drawings[0], s1.rId);
  if (capCells.length >= 2) {
    setTcText(capCells[0], s1.date);
    setTcText(capCells[1], s1.caption);
  }
  if (s2) {
    if (drawings[1]) setDrawingBlip(drawings[1], s2.rId);
    if (capCells.length >= 4) {
      setTcText(capCells[2], s2.date);
      setTcText(capCells[3], s2.caption);
    }
  } else if (drawings[1]) {
    // Trailing single keeps full table width with a blank second half,
    // matching the template's own odd-count pattern (table 51)
    drawings[1].parentNode?.removeChild(drawings[1]);
    if (capCells.length >= 4) {
      setTcText(capCells[2], '', true);
      setTcText(capCells[3], '', true);
    }
  }
  anchor.parentNode?.insertBefore(tblClone, anchor.nextSibling);
  return tblClone;
}

function getBlipElements(tbl: Element): Element[] {
  const nsBlips = Array.from(
    tbl.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip')
  );
  if (nsBlips.length > 0) return nsBlips;
  const tagBlips = Array.from(tbl.getElementsByTagName('a:blip'));
  if (tagBlips.length > 0) return tagBlips;
  const querySelectorAll = (tbl as unknown as { querySelectorAll?: (s: string) => NodeListOf<Element> })
    .querySelectorAll;
  return typeof querySelectorAll === 'function' ? Array.from(querySelectorAll.call(tbl, '*|blip')) : [];
}

function getBlipEmbed(blip: Element): string | null {
  return (
    blip.getAttribute('r:embed') ||
    blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed') ||
    blip.getAttribute('embed')
  );
}

function findTableContainingSlot(
  tables: HTMLCollectionOf<Element> | Element[],
  slotId: string
): Element | undefined {
  const meta = PHOTO_SLOTS_CATALOG.find((c) => c.id === slotId);
  const targetRId = meta ? meta.rId : `rId_${slotId}`;

  for (let i = 0; i < tables.length; i++) {
    const tbl = tables[i];
    const blips = getBlipElements(tbl);
    for (let j = 0; j < blips.length; j++) {
      if (getBlipEmbed(blips[j]) === targetRId) {
        return tbl;
      }
    }
  }
  return undefined;
}

export async function injectCustomPhotos(
  zip: JSZip,
  tables: HTMLCollectionOf<Element>,
  state: MaintenanceReportState,
  plBytes: Uint8Array
): Promise<void> {
  const customSlots = Object.values(state.photoSlots).filter((s) => s.isCustom);
  if (customSlots.length === 0) return;

  let relsXml = (await zip.file('word/_rels/document.xml.rels')?.async('string')) || '';
  for (const slot of customSlots) {
    const zipPath = `word/${slot.mediaTarget}`;
    const bytes = await resolveSlotBytes(slot, plBytes);
    zip.file(zipPath, bytes);
    if (!relsXml.includes(`Id="${slot.rId}"`)) {
      const relTag = `<Relationship Id="${slot.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${slot.mediaTarget}"/>\n</Relationships>`;
      relsXml = relsXml.replace('</Relationships>', relTag);
    }
  }
  zip.file('word/_rels/document.xml.rels', relsXml);

  const template2Photo = tables[29]?.cloneNode(true) as Element | undefined;

  const phases: PhotoSlot['phaseKey'][] = ['physical', 'pre_measure', 'cleaning', 'post_measure'];
  const docOrder = Array.from(tables);

  for (const phaseKey of phases) {
    const phaseSlots = Object.values(state.photoSlots).filter((s) => s.phaseKey === phaseKey);
    // Untouched phases keep byte-identical template pairing
    if (!phaseSlots.some((s) => s.isCustom)) continue;

    // Template tables of this phase in document order
    const seen = new Set<Element>();
    const phaseTables: Element[] = [];
    for (const meta of PHOTO_SLOTS_CATALOG.filter((c) => c.phaseKey === phaseKey)) {
      const found = findTableContainingSlot(tables, meta.id);
      if (found && !seen.has(found)) {
        seen.add(found);
        phaseTables.push(found);
      }
    }
    phaseTables.sort((a, b) => docOrder.indexOf(a) - docOrder.indexOf(b));
    if (phaseTables.length === 0 || !template2Photo) continue;

    // Flat saved order fills template cells sequentially, so a custom card
    // lands exactly where the webapp shows it instead of after its table
    const positions = collectPhasePhotoPositions(phaseTables);
    const overflow: PhotoSlot[] = [];
    phaseSlots.forEach((slot, idx) => {
      if (idx < positions.length) {
        setDrawingBlip(positions[idx].drawing, slot.rId);
        setTcText(positions[idx].dateCell, slot.date);
        setTcText(positions[idx].capCell, slot.caption);
      } else {
        overflow.push(slot);
      }
    });

    let anchor: Element = phaseTables[phaseTables.length - 1];
    for (let c = 0; c < overflow.length; c += 2) {
      anchor = fillOverflowPair(template2Photo, anchor, overflow[c], overflow[c + 1]);
    }
  }
}
