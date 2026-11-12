// ---
// Summary:
// - Purpose: Client-side OpenXML DOCX template injection and export engine
// - Role: Infrastructure / Export adapter
// - Depends on: jszip, src/types/schema.ts, src/constants/photoSlots.ts, src/lib/calculations.ts
// - Key Responsibilities: Modularized table and paragraph XML mutators, binary image injection, DOCX compression and download
// - Notes: Decomposed to satisfy low cyclomatic complexity requirements
// ---

import JSZip from 'jszip';
import type { MaintenanceReportState } from '../types/schema';
import { PHOTO_SLOTS_CATALOG } from '../constants/photoSlots';
import { AC_STANDARD_VALUES } from '../constants/defaultData';
import { updateConclusionWithLocation, formatIndoNumber, resolveWilayah } from './calculations';
import { computePVAnalysis } from './pvAnalysis';
import { injectCustomPhotos } from './docxCustomPhotos';
import { cleanPhotoTableCells } from './docxCleanup';

export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function getValOrEmpty(val: string | undefined): string {
  if (!val || !val.trim()) return 'Empty';
  return val.trim();
}

export function setTcText(tc: Element, text: string, allowBlank = false, isBold = false) {
  const finalVal = allowBlank ? (text ? text.trim() : '') : getValOrEmpty(text);
  const tNodes = tc.getElementsByTagNameNS(W_NS, 't');
  if (tNodes.length > 0) {
    tNodes[0].textContent = finalVal;
    for (let i = tNodes.length - 1; i > 0; i--) {
      const parent = tNodes[i].parentNode;
      if (parent) parent.removeChild(tNodes[i]);
    }
    if (isBold) {
      const r = tNodes[0].parentNode as Element;
      if (r) {
        let rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0];
        if (!rPr) {
          rPr = tc.ownerDocument.createElementNS(W_NS, 'w:rPr');
          r.insertBefore(rPr, tNodes[0]);
        }
        if (!rPr.getElementsByTagNameNS(W_NS, 'b').length) {
          rPr.appendChild(tc.ownerDocument.createElementNS(W_NS, 'w:b'));
          rPr.appendChild(tc.ownerDocument.createElementNS(W_NS, 'w:bCs'));
        }
      }
    }
  } else {
    let p = tc.getElementsByTagNameNS(W_NS, 'p')[0];
    if (!p) {
      p = tc.ownerDocument.createElementNS(W_NS, 'w:p');
      tc.appendChild(p);
    }
    const r = tc.ownerDocument.createElementNS(W_NS, 'w:r');
    if (isBold) {
      const rPr = tc.ownerDocument.createElementNS(W_NS, 'w:rPr');
      rPr.appendChild(tc.ownerDocument.createElementNS(W_NS, 'w:b'));
      rPr.appendChild(tc.ownerDocument.createElementNS(W_NS, 'w:bCs'));
      r.appendChild(rPr);
    }
    const t = tc.ownerDocument.createElementNS(W_NS, 'w:t');
    t.textContent = finalVal;
    r.appendChild(t);
    p.appendChild(r);
  }
}

function setParagraphText(p: Element, text: string, allowBlank = false) {
  const tNodes = p.getElementsByTagNameNS(W_NS, 't');
  if (tNodes.length > 0) {
    tNodes[0].textContent = allowBlank ? (text ? text.trim() : '') : getValOrEmpty(text);
    for (let i = tNodes.length - 1; i > 0; i--) {
      const parent = tNodes[i].parentNode;
      if (parent) parent.removeChild(tNodes[i]);
    }
  }
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function resolveSlotBytes(
  slot: { isUploaded?: boolean; imageDataUrl?: string; imagePath?: string } | undefined,
  plBytes: Uint8Array
): Promise<Uint8Array> {
  if (!slot || !slot.isUploaded) return plBytes;
  if (slot.imageDataUrl) {
    try {
      return dataUrlToUint8Array(slot.imageDataUrl);
    } catch {
      return plBytes;
    }
  }
  if (slot.imagePath) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${slot.imagePath}`);
      if (res.ok) {
        return new Uint8Array(await res.arrayBuffer());
      }
    } catch {
      return plBytes;
    }
  }
  return plBytes;
}

function updateCoverAndLocationTables(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  const wilayah = resolveWilayah(state.location);
  const isDefaultOrJakpus = (val: string | undefined) =>
    !val || !val.trim() || val.toLowerCase().includes('jakarta pusat');
  const penjabaran = isDefaultOrJakpus(state.location.penjabaranAktivitas)
    ? `Pemeliharaan PLTS Rooftop di Wilayah ${wilayah.title}`
    : state.location.penjabaranAktivitas;
  const uraian = isDefaultOrJakpus(state.location.uraianKegiatan)
    ? `Pemeliharaan PLTS Rooftop di Wilayah ${wilayah.title}`
    : state.location.uraianKegiatan;

  if (tables.length > 0) {
    const t0Rows = tables[0].getElementsByTagNameNS(W_NS, 'tr');
    if (t0Rows.length >= 11) {
      setTcText(t0Rows[4].getElementsByTagNameNS(W_NS, 'tc')[2], penjabaran);
      setTcText(t0Rows[5].getElementsByTagNameNS(W_NS, 'tc')[2], uraian);
      setTcText(t0Rows[6].getElementsByTagNameNS(W_NS, 'tc')[2], state.location.lokasi);
      setTcText(t0Rows[7].getElementsByTagNameNS(W_NS, 'tc')[2], state.location.alamat);
      setTcText(t0Rows[8].getElementsByTagNameNS(W_NS, 'tc')[2], state.location.kapasitas);
      setTcText(t0Rows[9].getElementsByTagNameNS(W_NS, 'tc')[2], state.location.jenisAtap);
      setTcText(t0Rows[10].getElementsByTagNameNS(W_NS, 'tc')[2], state.location.pelaksana);
    }
  }

  if (tables.length > 1) {
    const t1Rows = tables[1].getElementsByTagNameNS(W_NS, 'tr');
    if (t1Rows.length >= 4) {
      setTcText(t1Rows[0].getElementsByTagNameNS(W_NS, 'tc')[1], state.location.lokasi);
      setTcText(t1Rows[1].getElementsByTagNameNS(W_NS, 'tc')[1], state.location.alamat);
      setTcText(t1Rows[2].getElementsByTagNameNS(W_NS, 'tc')[1], state.location.kapasitas);
      setTcText(t1Rows[3].getElementsByTagNameNS(W_NS, 'tc')[1], state.location.jenisAtap);
    }
  }
}

function updateRealizationDatesTable(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  if (tables.length > 2) {
    const t2Rows = tables[2].getElementsByTagNameNS(W_NS, 'tr');
    if (t2Rows.length >= 9) {
      const pra = state.realizationDates.find((r) => r.phase === 'pra');
      if (pra) {
        setTcText(t2Rows[1].getElementsByTagNameNS(W_NS, 'tc')[1], pra.tanggalPelaksanaan);
        setTcText(t2Rows[2].getElementsByTagNameNS(W_NS, 'tc')[1], pra.kondisiCuaca);
      }
      const cln = state.realizationDates.find((r) => r.phase === 'pembersihan');
      if (cln) {
        setTcText(t2Rows[4].getElementsByTagNameNS(W_NS, 'tc')[1], cln.tanggalPelaksanaan);
        setTcText(t2Rows[5].getElementsByTagNameNS(W_NS, 'tc')[1], cln.kondisiCuaca);
      }
      const psc = state.realizationDates.find((r) => r.phase === 'pasca');
      if (psc) {
        setTcText(t2Rows[7].getElementsByTagNameNS(W_NS, 'tc')[1], psc.tanggalPelaksanaan);
        setTcText(t2Rows[8].getElementsByTagNameNS(W_NS, 'tc')[1], psc.kondisiCuaca);
      }
    }
  }
}

export function applyDrawingExtents(drawing: Element) {
  const wpExts = drawing.getElementsByTagNameNS(
    'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'extent'
  );
  const extents = wpExts.length > 0 ? wpExts : drawing.getElementsByTagName('wp:extent');
  for (let eIdx = 0; eIdx < extents.length; eIdx++) {
    extents[eIdx].setAttribute('cx', '2599690');
    extents[eIdx].setAttribute('cy', '3466253');
  }

  const xfrmsNS = drawing.getElementsByTagNameNS(
    'http://schemas.openxmlformats.org/drawingml/2006/main',
    'xfrm'
  );
  const xfrms = xfrmsNS.length > 0 ? xfrmsNS : drawing.getElementsByTagName('a:xfrm');
  for (let xIdx = 0; xIdx < xfrms.length; xIdx++) {
    const aExtsNS = xfrms[xIdx].getElementsByTagNameNS(
      'http://schemas.openxmlformats.org/drawingml/2006/main',
      'ext'
    );
    const aExts = aExtsNS.length > 0 ? aExtsNS : xfrms[xIdx].getElementsByTagName('a:ext');
    for (let eIdx = 0; eIdx < aExts.length; eIdx++) {
      aExts[eIdx].setAttribute('cx', '2599690');
      aExts[eIdx].setAttribute('cy', '3466253');
    }
  }
}

function updateDrawingCaption(
  capCells: HTMLCollectionOf<Element>,
  dIdx: number,
  dateVal: string,
  capVal: string
) {
  if (capCells.length === 4) {
    if (dIdx === 0) {
      setTcText(capCells[0], dateVal);
      setTcText(capCells[1], capVal);
    } else if (dIdx === 1) {
      setTcText(capCells[2], dateVal);
      setTcText(capCells[3], capVal);
    }
  } else if (capCells.length === 2 && dIdx === 0) {
    setTcText(capCells[0], dateVal);
    setTcText(capCells[1], capVal);
  }
}

function updatePhotoCaptionsAndDates(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  for (let tIdx = 0; tIdx < tables.length; tIdx++) {
    const tbl = tables[tIdx];
    const rows = tbl.getElementsByTagNameNS(W_NS, 'tr');
    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const r = rows[rIdx];
      const drawings = r.getElementsByTagNameNS(W_NS, 'drawing');
      if (drawings.length === 0 || rIdx + 1 >= rows.length) continue;

      const capRow = rows[rIdx + 1];
      const capCells = capRow.getElementsByTagNameNS(W_NS, 'tc');

      for (let dIdx = 0; dIdx < drawings.length; dIdx++) {
        const blips = drawings[dIdx].getElementsByTagNameNS(
          'http://schemas.openxmlformats.org/drawingml/2006/main',
          'blip'
        );
        const blip =
          blips.length > 0
            ? blips[0]
            : drawings[dIdx].getElementsByTagName('a:blip')[0] ||
              drawings[dIdx].querySelector('*|blip');
        if (!blip) continue;

        const embed =
          blip.getAttribute('r:embed') ||
          blip.getAttributeNS(
            'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
            'embed'
          );
        if (!embed) continue;

        const matchingSlotMeta = PHOTO_SLOTS_CATALOG.find((s) => s.rId === embed);
        if (!matchingSlotMeta) continue;

        if (matchingSlotMeta.phaseKey !== 'general') {
          applyDrawingExtents(drawings[dIdx]);
        }

        const currentSlot = state.photoSlots[matchingSlotMeta.id];
        const dateVal = currentSlot ? currentSlot.date : matchingSlotMeta.defaultDate;
        const capVal = currentSlot ? currentSlot.caption : matchingSlotMeta.defaultCaption;

        updateDrawingCaption(capCells, dIdx, dateVal, capVal);
      }
    }
  }
}

function updateChecklistTable(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  if (tables.length > 10) {
    const t10Rows = tables[10].getElementsByTagNameNS(W_NS, 'tr');
    for (let i = 1; i < t10Rows.length; i++) {
      const chk = state.checklist[i - 1];
      if (chk) {
        const cells = t10Rows[i].getElementsByTagNameNS(W_NS, 'tc');
        if (cells.length >= 2 && chk.no && cells[0].textContent.trim() !== chk.no) {
          setTcText(cells[0], chk.no);
        }
        if (cells.length >= 4) {
          setTcText(cells[2], chk.deskripsi, true);
          setTcText(cells[3], chk.keterangan, true);
        }
      }
    }
  }
}

function applyCellFromTemplate(
  targetTc: Element,
  templateTc: Element,
  text: string,
  allowBlank = false
): void {
  const tPr = templateTc.getElementsByTagNameNS(W_NS, 'tcPr')[0];
  if (tPr) {
    const existingPr = targetTc.getElementsByTagNameNS(W_NS, 'tcPr')[0];
    const newPr = tPr.cloneNode(true) as Element;
    if (existingPr) targetTc.replaceChild(newPr, existingPr);
    else targetTc.insertBefore(newPr, targetTc.firstChild);
  }

  const templateP = templateTc.getElementsByTagNameNS(W_NS, 'p')[0];
  if (templateP) {
    const newP = templateP.cloneNode(true) as Element;
    const finalVal = allowBlank ? (text ? text.trim() : '') : getValOrEmpty(text);
    const tNodes = newP.getElementsByTagNameNS(W_NS, 't');
    if (tNodes.length > 0) {
      tNodes[0].textContent = finalVal;
      for (let i = tNodes.length - 1; i > 0; i--) {
        const parent = tNodes[i].parentNode;
        if (parent) parent.removeChild(tNodes[i]);
      }
    } else {
      const r =
        newP.getElementsByTagNameNS(W_NS, 'r')[0] ||
        newP.ownerDocument.createElementNS(W_NS, 'w:r');
      const t = newP.ownerDocument.createElementNS(W_NS, 'w:t');
      t.textContent = finalVal;
      r.appendChild(t);
      if (!r.parentNode) newP.appendChild(r);
    }

    const existingPs = Array.from(targetTc.getElementsByTagNameNS(W_NS, 'p'));
    for (const p of existingPs) {
      targetTc.removeChild(p);
    }
    targetTc.appendChild(newP);
  }
}

function updateMeasurementTable(tbl: Element, state: MaintenanceReportState, isAfter: boolean) {
  const mRows = tbl.getElementsByTagNameNS(W_NS, 'tr');
  if (mRows.length < 17) return;
  const dataTemplateRow = mRows[7];
  const dataTemplateCells = dataTemplateRow.getElementsByTagNameNS(W_NS, 'tc');

  const pickHasil = (m: { hasilBefore: string; hasilAfter: string }) =>
    isAfter ? m.hasilAfter : m.hasilBefore;

  // Vmp / Imp / Voc groups in saved state order so inserted custom rows keep placement
  const vmpItems = state.measurements.filter((m) => m.id.startsWith('dc_vmp_'));
  const impItems = state.measurements.filter((m) => m.id.startsWith('dc_imp_'));
  const vocItems = state.hidePVAnalisis
    ? []
    : state.measurements.filter((m) => m.id.startsWith('dc_voc_'));

  // AC side first: extra DC row insertions below shift live row indices,
  // so fixed-index AC writes must happen while the template layout is intact
  const acMap: Record<number, string> = {
    2: 'ac_v_rn', 3: 'ac_v_sn', 4: 'ac_v_tn', 5: 'ac_v_ng', 6: 'ac_v_rs', 7: 'ac_v_rt',
    8: 'ac_v_st', 9: 'ac_i_r', 10: 'ac_i_s', 11: 'ac_i_t', 12: 'ac_freq', 16: 'ground_r',
  };
  for (const [rIdx, mId] of Object.entries(acMap)) {
    const row = mRows[parseInt(rIdx)];
    if (row) {
      const cells = row.getElementsByTagNameNS(W_NS, 'tc');
      const item = state.measurements.find((m) => m.id === mId);
      if (item && cells.length >= 7) {
        setTcText(cells[6], isAfter ? item.hasilAfter : item.hasilBefore);
      }
    }
  }

  // Fixed Vmp rows 3-5 carry the first three items with their saved NO / parameter labels
  for (let i = 0; i < 3; i++) {
    const row = mRows[3 + i];
    const item = vmpItems[i];
    if (!row || !item) continue;
    const cells = row.getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length >= 3 && dataTemplateCells.length >= 3) {
      applyCellFromTemplate(cells[0], dataTemplateCells[0], item.no);
      applyCellFromTemplate(cells[1], dataTemplateCells[1], item.parameter);
      applyCellFromTemplate(cells[2], dataTemplateCells[2], pickHasil(item), true);
    }
  }

  // Fixed Imp rows 7-9 carry the first three items
  for (let i = 0; i < 3; i++) {
    const row = mRows[7 + i];
    const item = impItems[i];
    if (!row || !item) continue;
    const cells = row.getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length >= 3 && dataTemplateCells.length >= 3) {
      applyCellFromTemplate(cells[0], dataTemplateCells[0], item.no);
      applyCellFromTemplate(cells[1], dataTemplateCells[1], item.parameter);
      applyCellFromTemplate(cells[2], dataTemplateCells[2], pickHasil(item), true);
    }
  }

  // 1.3 Voc & Irradiance String PV section
  if (!state.hidePVAnalisis) {
  const vocHeaderRow = mRows[10];
  if (vocHeaderRow && mRows.length > 6) {
    const headerTemplateCells = mRows[6].getElementsByTagNameNS(W_NS, 'tc');
    const cells = vocHeaderRow.getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length >= 3 && headerTemplateCells.length >= 3) {
      applyCellFromTemplate(cells[0], headerTemplateCells[0], '1.3');
      applyCellFromTemplate(cells[1], headerTemplateCells[1], 'Voc & Irradiance String PV');
      applyCellFromTemplate(cells[2], headerTemplateCells[2], '', true);
    }
  }

  const vocItemsOrdered = vocItems;
  const dataTemplateCellsForVoc = dataTemplateCells;

  for (let idx = 0; idx < 6; idx++) {
    const rowIdx = 11 + idx;
    const row = mRows[rowIdx];
    if (!row) continue;
    const cells = row.getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length < 3) continue;
    const item = vocItemsOrdered[idx] || state.measurements.find((m) => m.id === `dc_voc_${idx + 1}`);
    if (item && dataTemplateCellsForVoc && dataTemplateCellsForVoc.length >= 3) {
      applyCellFromTemplate(cells[0], dataTemplateCellsForVoc[0], item.no);
      applyCellFromTemplate(cells[1], dataTemplateCellsForVoc[1], item.parameter);
      applyCellFromTemplate(cells[2], dataTemplateCellsForVoc[2], pickHasil(item), true);
    }
  }
  }

  // Custom String 4+ rows have no fixed template rows: clone a data row and
  // insert directly after their group so values keep their visual grouping.
  // Element anchors (not numeric indices) stay valid as live rows shift.
  // The AC side of an inserted row is vertically merged with the row above
  // (vMerge restart/continue) instead of left as a blank bordered gap.
  const mergeAcSideDown = (anchorRow: Element, cloneRow: Element) => {
    const aCells = anchorRow.getElementsByTagNameNS(W_NS, 'tc');
    const cCells = cloneRow.getElementsByTagNameNS(W_NS, 'tc');
    const doc = cloneRow.ownerDocument;
    for (let i = 4; i < 7 && i < aCells.length && i < cCells.length; i++) {
      const aPr = aCells[i].getElementsByTagNameNS(W_NS, 'tcPr')[0];
      if (aPr && !aPr.getElementsByTagNameNS(W_NS, 'vMerge').length) {
        const vm = doc.createElementNS(W_NS, 'w:vMerge');
        vm.setAttribute('w:val', 'restart');
        aPr.appendChild(vm);
      }
      const cPr = cCells[i].getElementsByTagNameNS(W_NS, 'tcPr')[0];
      if (cPr) {
        const olds = Array.from(cPr.getElementsByTagNameNS(W_NS, 'vMerge'));
        for (const o of olds) cPr.removeChild(o);
        cPr.appendChild(doc.createElementNS(W_NS, 'w:vMerge'));
      }
      const ps = Array.from(cCells[i].getElementsByTagNameNS(W_NS, 'p'));
      for (const p of ps) cCells[i].removeChild(p);
      cCells[i].appendChild(doc.createElementNS(W_NS, 'w:p'));
    }
  };
  const fillDcClone = (row: Element, no: string, parameter: string, hasil: string) => {
    const cells = row.getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length >= 3 && dataTemplateCells.length >= 3) {
      applyCellFromTemplate(cells[0], dataTemplateCells[0], no);
      applyCellFromTemplate(cells[1], dataTemplateCells[1], parameter);
      applyCellFromTemplate(cells[2], dataTemplateCells[2], hasil, true);
    }
  };
  const insertAfter = (anchor: Element, clone: Element) => {
    const parent = anchor.parentNode;
    if (parent) parent.insertBefore(clone, anchor.nextSibling);
  };

  const vmpTemplateAnchor = mRows[5];
  const impTemplateAnchor = mRows[9];
  const vocLastAnchor = mRows[16];
  const vocCloneSource = mRows[16];
  if (vmpTemplateAnchor && vmpItems.length > 3) {
    let anchor: Element = vmpTemplateAnchor;
    for (let i = 3; i < vmpItems.length; i++) {
      const item = vmpItems[i];
      const clone = vmpTemplateAnchor.cloneNode(true) as Element;
      fillDcClone(clone, item.no, item.parameter, pickHasil(item));
      insertAfter(anchor, clone);
      mergeAcSideDown(anchor, clone);
      anchor = clone;
    }
  }

  if (impTemplateAnchor && impItems.length > 3) {
    let anchor: Element = impTemplateAnchor;
    for (let i = 3; i < impItems.length; i++) {
      const item = impItems[i];
      const clone = impTemplateAnchor.cloneNode(true) as Element;
      fillDcClone(clone, item.no, item.parameter, pickHasil(item));
      insertAfter(anchor, clone);
      mergeAcSideDown(anchor, clone);
      anchor = clone;
    }
  }

  if (!state.hidePVAnalisis && vocLastAnchor && vocItems.length > 6) {
    let anchor: Element = vocLastAnchor;
    if (vocCloneSource) {
      for (let i = 6; i < vocItems.length; i++) {
        const item = vocItems[i];
        const clone = vocCloneSource.cloneNode(true) as Element;
        fillDcClone(clone, item.no, item.parameter, pickHasil(item));
        insertAfter(anchor, clone);
        mergeAcSideDown(anchor, clone);
        anchor = clone;
      }
    }
  }
}

function standardRefFor(id: string): string {
  return AC_STANDARD_VALUES[id] ?? '';
}

function appendStandardColumn(tbl: Element, standardsInRowOrder: string[]) {
  const grid = tbl.getElementsByTagNameNS(W_NS, 'tblGrid')[0];
  if (grid) {
    const cols = grid.getElementsByTagNameNS(W_NS, 'gridCol');
    if (cols.length === 4) {
      grid.appendChild(cols[cols.length - 1].cloneNode(true));
    }
  }
  const rows = tbl.getElementsByTagNameNS(W_NS, 'tr');
  if (rows.length === 0) return;
  // Row 0 HASIL header spans BEFORE+AFTER: widen span to cover STANDARD
  const headCells = rows[0].getElementsByTagNameNS(W_NS, 'tc');
  if (headCells.length >= 3) {
    const tcPr = headCells[2].getElementsByTagNameNS(W_NS, 'tcPr')[0];
    const span = tcPr?.getElementsByTagNameNS(W_NS, 'gridSpan')[0];
    if (span) span.setAttribute('w:val', '3');
  }
  // Row 1 sub-header gains the STANDARD label cloned from AFTER styling
  if (rows.length > 1) {
    const subCells = rows[1].getElementsByTagNameNS(W_NS, 'tc');
    if (subCells.length === 4) {
      const clone = subCells[3].cloneNode(true) as Element;
      setTcText(clone, 'STANDARD', false, true);
      rows[1].appendChild(clone);
    }
  }
  for (let r = 2; r < rows.length; r++) {
    const cells = rows[r].getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length !== 4) continue;
    const clone = cells[3].cloneNode(true) as Element;
    setTcText(clone, standardsInRowOrder[r - 2] ?? '', true);
    rows[r].appendChild(clone);
  }
}

function updateComparisonTables(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  const vmpItems = state.measurements.filter((m) => m.id.startsWith('dc_vmp_'));
  const impItems = state.measurements.filter((m) => m.id.startsWith('dc_imp_'));
  const vocItems = state.measurements.filter((m) => m.id.startsWith('dc_voc_'));

  const fillCompRow = (row: Element, no: string, parameter: string, before: string, after: string, standard = '', blank = false) => {
    const cells = row.getElementsByTagNameNS(W_NS, 'tc');
    if (cells.length >= 4) {
      setTcText(cells[0], no);
      setTcText(cells[1], parameter);
      setTcText(cells[2], before, blank);
      setTcText(cells[3], after, blank);
    }
    if (cells.length >= 5) {
      setTcText(cells[4], standard, true);
    }
  };

  const fillDcTable = (tbl: Element) => {
    const rows = tbl.getElementsByTagNameNS(W_NS, 'tr');
    if (rows.length < 11) return;
    // STANDARD column first so inserted clones inherit the 5th cell
    appendStandardColumn(tbl, new Array(rows.length - 2).fill(''));
    // Capture template anchors before live indices shift from insertions
    const vmpAnchorSrc = rows[6];
    const impAnchorSrc = rows[10];
    const headerSrc = rows[7];
    const dataSrc = rows[10];
    const lastImpRowInitial = rows[rows.length - 1];
    // Fixed Vmp rows 4-6 and Imp rows 8-10 follow saved state order with labels
    for (let i = 0; i < 3; i++) {
      if (vmpItems[i] && rows[4 + i]) {
        fillCompRow(rows[4 + i], vmpItems[i].no, vmpItems[i].parameter, vmpItems[i].hasilBefore, vmpItems[i].hasilAfter, vmpItems[i].standard ?? '');
      }
      if (impItems[i] && rows[8 + i]) {
        fillCompRow(rows[8 + i], impItems[i].no, impItems[i].parameter, impItems[i].hasilBefore, impItems[i].hasilAfter, impItems[i].standard ?? '');
      }
    }

    const insertAfter = (anchor: Element, clone: Element) => {
      const parent = anchor.parentNode;
      if (parent) parent.insertBefore(clone, anchor.nextSibling);
    };

    // Custom Vmp String 4+ rows go right after the fixed Vmp block
    let lastImpRow: Element = lastImpRowInitial;
    if (vmpAnchorSrc && vmpItems.length > 3) {
      let anchor: Element = vmpAnchorSrc;
      for (let i = 3; i < vmpItems.length; i++) {
        const item = vmpItems[i];
        const clone = vmpAnchorSrc.cloneNode(true) as Element;
        fillCompRow(clone, item.no, item.parameter, item.hasilBefore, item.hasilAfter, item.standard ?? '');
        insertAfter(anchor, clone);
        anchor = clone;
      }
    }

    // Custom Imp String 4+ rows go after the fixed Imp block
    if (impAnchorSrc && impItems.length > 3) {
      let anchor: Element = impAnchorSrc;
      for (let i = 3; i < impItems.length; i++) {
        const item = impItems[i];
        const clone = impAnchorSrc.cloneNode(true) as Element;
        fillCompRow(clone, item.no, item.parameter, item.hasilBefore, item.hasilAfter, item.standard ?? '');
        insertAfter(anchor, clone);
        anchor = clone;
      }
      lastImpRow = anchor;
    }

    // 1.3 Voc & Irradiance section was missing: header plus every saved Voc row
    if (vocItems.length > 0) {
      if (lastImpRow && headerSrc && dataSrc) {
        const headerClone = headerSrc.cloneNode(true) as Element;
        fillCompRow(headerClone, '1.3', 'Voc & Irradiance String PV', '', '', '', true);
        insertAfter(lastImpRow, headerClone);
        let anchor: Element = headerClone;
        for (const item of vocItems) {
          const clone = dataSrc.cloneNode(true) as Element;
          fillCompRow(clone, item.no, item.parameter, item.hasilBefore, item.hasilAfter, item.standard ?? '');
          insertAfter(anchor, clone);
          anchor = clone;
        }
      }
    }
  };

  if (tables.length > 53) fillDcTable(tables[53]);
  if (tables.length > 56) fillDcTable(tables[56]);

  if (tables.length > 54) {
    const t54 = tables[54];
    const t54Rows = t54.getElementsByTagNameNS(W_NS, 'tr');
    const compAcIds = [
      'ac_v_rn', 'ac_v_sn', 'ac_v_tn', 'ac_v_ng', 'ac_v_rs',
      'ac_v_rt', 'ac_v_st', 'ac_i_r', 'ac_i_s', 'ac_i_t', 'ac_freq',
    ];
    compAcIds.forEach((mId, i) => {
      const row = t54Rows[3 + i];
      if (row) {
        const cells = row.getElementsByTagNameNS(W_NS, 'tc');
        const item = state.measurements.find((m) => m.id === mId);
        if (item && cells.length >= 4) {
          setTcText(cells[0], item.no);
          setTcText(cells[1], item.parameter);
          setTcText(cells[2], item.hasilBefore);
          setTcText(cells[3], item.hasilAfter);
        }
      }
    });
    // Custom AC rows appended after the fixed frequency row
    const fixedAcIds = new Set(compAcIds);
    const acExtras = state.measurements.filter(
      (m) => m.id.startsWith('ac_') && !fixedAcIds.has(m.id)
    );
    const acAnchorSrc = t54Rows[t54Rows.length - 1];
    if (acAnchorSrc && acExtras.length > 0) {
      let anchor: Element = acAnchorSrc;
      for (const item of acExtras) {
        const clone = acAnchorSrc.cloneNode(true) as Element;
        fillCompRow(clone, item.no, item.parameter, item.hasilBefore, item.hasilAfter);
        const parent = anchor.parentNode;
        if (parent) parent.insertBefore(clone, anchor.nextSibling);
        anchor = clone;
      }
    }
    const finalRows = t54.getElementsByTagNameNS(W_NS, 'tr');
    const standards: string[] = [];
    for (let r = 2; r < finalRows.length; r++) {
      const cells = finalRows[r].getElementsByTagNameNS(W_NS, 'tc');
      const paramText = cells.length >= 2 ? (cells[1].textContent || '').trim() : '';
      const match = state.measurements.find((m) => m.parameter === paramText && m.id.startsWith('ac_'));
      standards.push(match ? standardRefFor(match.id) : '');
    }
    appendStandardColumn(t54, standards);
  }

  if (tables.length > 55) {
    const t55 = tables[55];
    const t55Rows = t55.getElementsByTagNameNS(W_NS, 'tr');
    const groundItems = state.measurements.filter((m) => m.id.startsWith('ground_'));
    if (groundItems[0] && t55Rows.length >= 4) {
      fillCompRow(t55Rows[3], groundItems[0].no, groundItems[0].parameter, groundItems[0].hasilBefore, groundItems[0].hasilAfter);
    }
    if (groundItems.length > 1 && t55Rows.length >= 4) {
      let anchor: Element = t55Rows[3];
      for (let i = 1; i < groundItems.length; i++) {
        const item = groundItems[i];
        const clone = (t55Rows[3] as Element).cloneNode(true) as Element;
        fillCompRow(clone, item.no, item.parameter, item.hasilBefore, item.hasilAfter);
        const parent = anchor.parentNode;
        if (parent) parent.insertBefore(clone, anchor.nextSibling);
        anchor = clone;
      }
    }
    const finalRows = t55.getElementsByTagNameNS(W_NS, 'tr');
    const standards: string[] = [];
    for (let r = 2; r < finalRows.length; r++) {
      const cells = finalRows[r].getElementsByTagNameNS(W_NS, 'tc');
      const paramText = cells.length >= 2 ? (cells[1].textContent || '').trim() : '';
      const match = state.measurements.find((m) => m.parameter === paramText && m.id.startsWith('ground_'));
      standards.push(match ? standardRefFor(match.id) : '');
    }
    appendStandardColumn(t55, standards);
  }
}

function updateSTCTables(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  const analysis = computePVAnalysis(state);

  // Table 57: STC calculations (Parameter | Perhitungan | Nilai Teoritis STC)
  if (tables.length > 57) {
    const t57 = tables[57];
    const rows = t57.getElementsByTagNameNS(W_NS, 'tr');
    if (rows.length >= 7) {
      const r1Cells = rows[1].getElementsByTagNameNS(W_NS, 'tc');
      if (r1Cells.length >= 3) setTcText(r1Cells[2], `${analysis.modulesPerString} modul`);

      const r2Cells = rows[2].getElementsByTagNameNS(W_NS, 'tc');
      if (r2Cells.length >= 3) {
        setTcText(r2Cells[1], `${analysis.modulesPerString} × ${analysis.nominalPowerWp} Wp`);
        setTcText(r2Cells[2], `${analysis.kapasitasPerString.toLocaleString('id-ID')} Wp`);
      }

      const r3Cells = rows[3].getElementsByTagNameNS(W_NS, 'tc');
      if (r3Cells.length >= 3) {
        setTcText(r3Cells[1], `${analysis.modulesPerString} × ${formatIndoNumber(analysis.openCircuitVoltageVoc, 1)} V`);
        setTcText(r3Cells[2], `${formatIndoNumber(analysis.vocSTC, 0)} Vdc`);
      }

      const r4Cells = rows[4].getElementsByTagNameNS(W_NS, 'tc');
      if (r4Cells.length >= 3) {
        setTcText(r4Cells[1], `${analysis.modulesPerString} × ${formatIndoNumber(analysis.ratedVoltageVmp, 1)} V`);
        setTcText(r4Cells[2], `${formatIndoNumber(analysis.vmpSTC, 0)} Vdc`);
      }

      const r5Cells = rows[5].getElementsByTagNameNS(W_NS, 'tc');
      if (r5Cells.length >= 3) setTcText(r5Cells[2], `${formatIndoNumber(analysis.impSTC, 2)} Adc`);

      const r6Cells = rows[6].getElementsByTagNameNS(W_NS, 'tc');
      if (r6Cells.length >= 3) setTcText(r6Cells[2], `${formatIndoNumber(analysis.iscSTC, 2)} Adc`);
    }
  }

  // Table 58: Field Data comparison vs STC
  if (tables.length > 58) {
    const t58 = tables[58];
    const rows = t58.getElementsByTagNameNS(W_NS, 'tr');
    if (rows.length >= 5) {
      analysis.strings.forEach((s, idx) => {
        if (rows[1 + idx]) {
          const cells = rows[1 + idx].getElementsByTagNameNS(W_NS, 'tc');
          if (cells.length >= 5) {
            setTcText(cells[0], s.name);
            setTcText(cells[1], `${s.voc} V`);
            setTcText(cells[2], `${s.irr} W/m²`);
            setTcText(cells[3], `${s.vmp} V`);
            setTcText(cells[4], `${s.deviasiVmp < 0 ? '−' : ''}${formatIndoNumber(Math.abs(s.deviasiVmp), 2)}%`);
          }
        }
      });
      const stcCells = rows[4].getElementsByTagNameNS(W_NS, 'tc');
      if (stcCells.length >= 4) {
        setTcText(stcCells[0], 'STC');
        setTcText(stcCells[1], `${formatIndoNumber(analysis.vocSTC, 0)} V`);
        setTcText(stcCells[2], '1.000 W/m²');
        setTcText(stcCells[3], `${formatIndoNumber(analysis.vmpSTC, 0)} V`);
      }
    }
  }

  // Table 59: Vmp / Voc Ratio
  if (tables.length > 59) {
    const t59 = tables[59];
    const rows = t59.getElementsByTagNameNS(W_NS, 'tr');
    if (rows.length >= 4) {
      analysis.strings.forEach((s, idx) => {
        if (rows[1 + idx]) {
          const cells = rows[1 + idx].getElementsByTagNameNS(W_NS, 'tc');
          if (cells.length >= 4) {
            setTcText(cells[0], s.name);
            setTcText(cells[1], `${s.voc} V`);
            setTcText(cells[2], `${s.vmp} V`);
            setTcText(cells[3], `${formatIndoNumber(s.rasioVmpVoc, 2)}%`);
          }
        }
      });
    }
  }
}

function updateDamageAndRecTables(tables: HTMLCollectionOf<Element>, state: MaintenanceReportState) {
  const analysis = computePVAnalysis(state);

  let recTable: Element | null = null;
  let dmgTable: Element | null = null;

  for (let i = 0; i < tables.length; i++) {
    const text = tables[i].textContent || '';
    if (text.includes('Parameter/ Temuan') || text.includes('Parameter/Temuan') || text.includes('Rekomendasi Teknis')) {
      recTable = tables[i];
    } else if (text.includes('Kerusakan di Lokasi') && (text.includes('Update Kerusakan') || text.includes('Perbaikan yang dilakukan'))) {
      dmgTable = tables[i];
    }
  }

  if (!recTable && tables.length > 60) recTable = tables[60];
  if (!dmgTable && tables.length > 61) dmgTable = tables[61];

  if (recTable) {
    const recsToUse = state.technicalRecommendations ?? [];
    const rows = recTable.getElementsByTagNameNS(W_NS, 'tr');
    for (let i = 1; i < rows.length; i++) {
      const rec = recsToUse[i - 1];
      const cells = rows[i].getElementsByTagNameNS(W_NS, 'tc');
      if (cells.length >= 3) {
        if (rec) {
          setTcText(cells[0], rec.no || String(i));
          setTcText(cells[1], rec.parameterTemuan, true);
          setTcText(cells[2], rec.rekomendasiTeknis, true);
        } else {
          setTcText(cells[0], '', true);
          setTcText(cells[1], '', true);
          setTcText(cells[2], '', true);
        }
      }
    }
  }

  if (dmgTable) {
    const dmgsToUse = state.damages.length > 0 ? state.damages : analysis.detectedDamages;
    const rows = dmgTable.getElementsByTagNameNS(W_NS, 'tr');
    if (rows.length >= 2) {
      const dmg = dmgsToUse[0];
      const cells = rows[1].getElementsByTagNameNS(W_NS, 'tc');
      if (cells.length >= 5) {
        setTcText(cells[0], dmg.no || '1');
        setTcText(cells[1], dmg.lokasi || state.location.lokasi || 'Empty');
        setTcText(cells[2], dmg.kerusakanDiLokasi || 'Tidak Ada');
        setTcText(cells[3], dmg.updateKerusakan || 'Tidak Ada');
        setTcText(cells[4], dmg.rekomendasi || dmg.perbaikanYangDilakukan || 'Tidak Ada');
      }
    }
  }
}

function updateDynamicParagraphs(xmlDoc: Document, state: MaintenanceReportState) {
  const analysis = computePVAnalysis(state);
  const narrative = state.analysisNarrative;
  const wilayah = resolveWilayah(state.location);
  const paragraphs = xmlDoc.getElementsByTagNameNS(W_NS, 'p');

  let activeSection = '';
  let currentVocString = 0;
  let currentVmpString = 0;
  let hasSetExecutiveSummary = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textContent = (p.textContent || '').trim();

    // Wilayah title and administration synchronization
    if (textContent.includes('PEMELIHARAAN PLTS ROOFTOP DI WILAYAH')) {
      setParagraphText(p, `PEMELIHARAAN PLTS ROOFTOP DI WILAYAH ${wilayah.caps}`);
      continue;
    }
    if (textContent.includes('Pemeliharaan PLTS Rooftop di Wilayah Jakarta Pusat')) {
      setParagraphText(
        p,
        textContent.replace(
          'Pemeliharaan PLTS Rooftop di Wilayah Jakarta Pusat',
          `Pemeliharaan PLTS Rooftop di Wilayah ${wilayah.title}`
        )
      );
      continue;
    }
    if (
      textContent.includes('KOTA ADMINISTRATIF JAKARTA PUSAT') ||
      textContent.includes('KOTA ADMINISTRASI JAKARTA PUSAT')
    ) {
      const kotaLabel = wilayah.caps.includes('KEPULAUAN SERIBU')
        ? 'KABUPATEN ADM. KEPULAUAN SERIBU'
        : `KOTA ADMINISTRASI ${wilayah.caps.replace('JAKARTA ', '')}`;
      setParagraphText(p, kotaLabel);
      continue;
    }
    if (
      textContent.includes('Metodologi Pelaksanaan Pekerjaan Pemeliharaan PLTS Rooftop') &&
      /di\s+Jakarta\s+[A-Za-z]+/i.test(textContent)
    ) {
      setParagraphText(p, textContent.replace(/di\s+Jakarta\s+[A-Za-z]+/i, `di ${wilayah.title}`));
      continue;
    }

    // Synchronize section and subsection headings
    if (textContent.includes('V. ANALISA PERFORMA')) {
      setParagraphText(p, textContent.replace('V. ANALISA PERFORMA', 'III. ANALISA PERFORMA'));
      activeSection = 'III';
      continue;
    }
    if (textContent.includes('V.I. TABEL KOMPARASI PENGUKURAN') || textContent.includes('V.I. Tabel Komparasi Pengukuran')) {
      setParagraphText(p, 'III.I. Tabel Komparasi Pengukuran [Before - After]');
      continue;
    }
    if (textContent.includes('V.II. ANALISA TEGANGAN VMP')) {
      setParagraphText(p, textContent.replace('V.II. ANALISA TEGANGAN VMP', 'III.II. ANALISA TEGANGAN VMP'));
      continue;
    }
    if (textContent.includes('V.II.I. TEGANGAN DAYA MAKSIMUM (Vmp)')) {
      setParagraphText(p, textContent.replace('V.II.I. TEGANGAN DAYA MAKSIMUM (Vmp)', 'III.II.I. TEGANGAN DAYA MAKSIMUM (Vmp)'));
      continue;
    }
    if (textContent.includes('V.II.III. Data Sheet PV Module')) {
      setParagraphText(p, textContent.replace('V.II.III. Data Sheet PV Module', 'III.II.II. Data Sheet PV Module'));
      continue;
    }
    if (
      textContent.includes('V.II.IV. Perhitungan Nilai Teoritis') ||
      textContent.includes('V.II.IV. PERHITUNGAN NILAI TEORITIS') ||
      textContent.includes('III.II.III. PERHITUNGAN NILAI TEORITIS')
    ) {
      setParagraphText(p, 'III.II.III. PERHITUNGAN NILAI TEORITIS (STANDARD TEST CONDITIONS - STC)');
      activeSection = 'STC';
      continue;
    }
    if (
      textContent.includes('V.II.V. Analisa Data Lapangan') ||
      textContent.includes('V.II.V. ANALISA DATA LAPANGAN') ||
      textContent.includes('III.II.IV ANALISA DATA LAPANGAN') ||
      textContent.includes('III.II.IV. ANALISA DATA LAPANGAN')
    ) {
      setParagraphText(p, 'III.II.IV. ANALISA DATA LAPANGAN (Voc dan Vmp)');
      activeSection = 'ANALISA';
      continue;
    }
    if (textContent.includes('1. Tegangan Sirkuit Terbuka (Voc)')) {
      activeSection = 'VOC';
      currentVocString = 0;
      continue;
    }
    if (textContent.includes('2. TEGANGAN DAYA MAKSIMUM (Vmp)')) {
      activeSection = 'VMP';
      currentVmpString = 0;
      continue;
    }
    if (
      textContent.includes('3. KESIMPULAN PERFORMA PV MODULE') ||
      textContent.includes('9. KESIMPULAN PERFORMA PV MODULE')
    ) {
      setParagraphText(p, '3. KESIMPULAN PERFORMA PV MODULE');
      activeSection = 'KESIMPULAN_PV';
      continue;
    }
    if (
      textContent.includes('III. KESIMPULAN & REKOMENDASI') ||
      textContent.includes('III. KESIMPULAN &amp; REKOMENDASI') ||
      textContent.includes('IV. KESIMPULAN & REKOMENDASI') ||
      textContent.includes('IV. KESIMPULAN &amp; REKOMENDASI')
    ) {
      setParagraphText(p, 'IV. KESIMPULAN & REKOMENDASI');
      activeSection = 'IV';
      continue;
    }

    // Datasheet values
    const dsFields: [string, string][] = [
      ['Nominal Power + 5%', state.datasheet.nominalPower],
      ['Rated Voltage (Vmp)', state.datasheet.ratedVoltageVmp],
      ['Open Circuit Voltage (Voc)', state.datasheet.openCircuitVoltageVoc],
      ['Rated Current (Imp)', state.datasheet.ratedCurrentImp],
      ['Short Circuit Current (Isc)', state.datasheet.shortCircuitCurrentIsc],
      ['Maximum System Voltage', state.datasheet.maximumSystemVoltage],
    ];
    let matchedDs = false;
    for (const [prefix, val] of dsFields) {
      if (textContent.includes(prefix)) {
        const tNodes = p.getElementsByTagNameNS(W_NS, 't');
        if (tNodes.length > 0) {
          const lastT = tNodes[tNodes.length - 1];
          if (lastT.textContent && lastT.textContent.includes(':')) {
            lastT.textContent = ': ' + (val ? val.trim() : '');
          }
        }
        matchedDs = true;
        break;
      }
    }
    if (matchedDs) continue;

    if (textContent.includes('Berdasarkan spesifikasi datasheet modul PV')) {
      const newP329 = 'Berdasarkan spesifikasi datasheet modul PV ' + getValOrEmpty(
        state.datasheet.nominalPower
      ) + ' Wp yang terlampir, berikut adalah nilai referensi untuk rangkaian ' + getValOrEmpty(
        state.datasheet.numberOfModules
      ) + ' modul seri:';
      setParagraphText(p, newP329);
      continue;
    }

    // STC intro paragraph
    if (textContent.includes('Berdasarkan data teknis PV Module')) {
      if (narrative?.introSTC) {
        setParagraphText(p, narrative.introSTC);
      } else {
        setParagraphText(
          p,
          'Berdasarkan data teknis PV Module ' + analysis.brand + ' ' + analysis.nominalPowerWp + ' Wp, setiap modul memiliki nilai Vmp sebesar ' + formatIndoNumber(analysis.ratedVoltageVmp, 1) + ' V dan Voc sebesar ' + formatIndoNumber(analysis.openCircuitVoltageVoc, 1) + ' V. Sistem PLTS ' + (state.location.lokasi.trim() || 'Lokasi') + ' terdiri dari ' + analysis.totalModules + ' modul yang terbagi menjadi ' + analysis.stringCount + ' string, sehingga secara konfigurasi masing-masing string terdiri dari ' + analysis.modulesPerString + ' modul yang terhubung secara seri.'
        );
      }
      continue;
    }

    if (textContent.includes('Dengan demikian, nilai tegangan teoritis pada kondisi STC adalah')) {
      setParagraphText(
        p,
        'Dengan demikian, nilai tegangan teoritis pada kondisi STC adalah ' + formatIndoNumber(analysis.vocSTC, 0) + ' Vdc untuk Voc dan ' + formatIndoNumber(analysis.vmpSTC, 0) + ' Vdc untuk Vmp.'
      );
      continue;
    }
    if (textContent.includes('Nilai Voc teoritis untuk masing-masing string berdasarkan')) {
      setParagraphText(
        p,
        'Nilai Voc teoritis untuk masing-masing string berdasarkan ' + analysis.modulesPerString + ' modul seri adalah:'
      );
      continue;
    }
    if (textContent.includes('Voc(STC) =') || textContent.includes('Voc ( STC) =')) {
      setParagraphText(
        p,
        'Voc(STC) = ' + analysis.modulesPerString + ' × ' + formatIndoNumber(analysis.openCircuitVoltageVoc, 1) + ' V = ' + formatIndoNumber(analysis.vocSTC, 0) + ' Vdc'
      );
      continue;
    }
    if (textContent.includes('Vmp(STC) =') || textContent.includes('Vmp ( STC) =')) {
      setParagraphText(
        p,
        'Vmp(STC) = ' + analysis.modulesPerString + ' × ' + formatIndoNumber(analysis.ratedVoltageVmp, 1) + ' V = ' + formatIndoNumber(analysis.vmpSTC, 0) + ' Vdc'
      );
      continue;
    }

    // VOC SECTION PARAGRAPHS
    if (activeSection === 'VOC') {
      if (textContent === 'String 1') { currentVocString = 1; continue; }
      if (textContent === 'String 2') { currentVocString = 2; continue; }
      if (textContent === 'String 3') { currentVocString = 3; continue; }

      if (currentVocString > 0 && textContent.startsWith('Voc aktual =')) {
        const vocVal = analysis.strings[currentVocString - 1]?.voc ?? 0;
        setParagraphText(p, 'Voc aktual = ' + vocVal + ' V');
        continue;
      }
      if (currentVocString > 0 && (textContent.includes('× 100% =') || textContent.includes('x 100% =') || textContent.includes('* 100% ='))) {
        const str = analysis.strings[currentVocString - 1];
        const vocVal = str?.voc ?? 0;
        const vocStc = formatIndoNumber(analysis.vocSTC, 0);
        const dev = formatIndoNumber(str?.deviasiVoc ?? 0, 2);
        setParagraphText(p, '(' + vocVal + ' − ' + vocStc + ') / ' + vocStc + ' × 100% = ' + dev + '%');
        continue;
      }
      if (textContent.includes('719–722 Vdc') || (textContent.includes('Vdc') && textContent.includes('–') && !textContent.includes('seragam'))) {
        setParagraphText(p, analysis.minVoc + '–' + analysis.maxVoc + ' Vdc');
        continue;
      }
      if (textContent.includes('dari nilai Voc STC')) {
        setParagraphText(p, 'atau sekitar ' + formatIndoNumber(analysis.minVocPct, 1) + '–' + formatIndoNumber(analysis.maxVocPct, 1) + '% dari nilai Voc STC.');
        continue;
      }
      if (textContent.startsWith('Penurunan Voc sekitar')) {
        const dev0 = formatIndoNumber(Math.abs(analysis.strings[0]?.deviasiVoc ?? 0), 0);
        setParagraphText(p, 'Penurunan Voc sekitar ' + dev0 + '% terhadap nilai STC tidak dapat langsung diartikan sebagai penurunan kapasitas atau degradasi modul sebesar ' + dev0 + '%.');
        continue;
      }
      if (textContent.includes('Nilai Voc datasheet') && textContent.includes('kondisi STC')) {
        setParagraphText(p, 'Hal tersebut penting karena nilai Voc pada modul PV sangat dipengaruhi oleh temperatur sel. Nilai Voc datasheet ' + formatIndoNumber(analysis.openCircuitVoltageVoc, 1) + ' V ditentukan pada kondisi STC, yaitu temperatur sel 25°C. Dalam kondisi lapangan, temperatur sel umumnya lebih tinggi daripada temperatur udara akibat radiasi matahari, sehingga Voc akan turun.');
        continue;
      }
      if (textContent.includes('Selain temperatur, nilai Voc juga mempunyai ketergantungan terhadap irradiance')) {
        setParagraphText(p, 'Selain temperatur, nilai Voc juga mempunyai ketergantungan terhadap irradiance. Namun pada hasil pengukuran kali ini, irradiance antar-string relatif berdekatan, yaitu ' + analysis.strings.map((s) => s.irr + ' W/m²').join(', ') + '.');
        continue;
      }
      if (textContent.startsWith('String 1:') && textContent.includes('→ Voc')) {
        setParagraphText(p, 'String 1: ' + (analysis.strings[0]?.irr ?? 0) + ' W/m² → Voc ' + (analysis.strings[0]?.voc ?? 0) + ' V ');
        continue;
      }
      if (textContent.startsWith('String 2:') && textContent.includes('→ Voc')) {
        setParagraphText(p, 'String 2: ' + (analysis.strings[1]?.irr ?? 0) + ' W/m² → Voc ' + (analysis.strings[1]?.voc ?? 0) + ' V ');
        continue;
      }
      if (textContent.startsWith('String 3:') && textContent.includes('→ Voc')) {
        setParagraphText(p, 'String 3: ' + (analysis.strings[2]?.irr ?? 0) + ' W/m² → Voc ' + (analysis.strings[2]?.voc ?? 0) + ' V ');
        continue;
      }
      if (textContent.includes('Perbedaan irradiance maksimum hanya')) {
        setParagraphText(p, 'Perbedaan irradiance maksimum hanya ' + analysis.deltaIrr + ' W/m², sedangkan Voc hanya berbeda maks. ' + analysis.deltaVoc + ' V.');
        continue;
      }
      if (textContent.includes('relatif seragam') && textContent.includes('Voc')) {
        setParagraphText(
          p,
          'Voc ' + analysis.strings.map((s) => s.name).join(', ') + ' relatif seragam, yaitu ' + analysis.minVoc + '–' + analysis.maxVoc + ' Vdc. Dengan kondisi irradiance yang juga relatif berdekatan, tidak terlihat indikasi adanya kehilangan sejumlah besar modul secara seri, open circuit, atau kegagalan string berdasarkan parameter Voc.'
        );
        continue;
      }
    }

    // VMP SECTION PARAGRAPHS
    if (activeSection === 'VMP') {
      if (textContent === 'String 1' || textContent === 'String 1:') { currentVmpString = 1; continue; }
      if (textContent === 'String 2' || textContent === 'String 2:') { currentVmpString = 2; continue; }
      if (textContent === 'String 3' || textContent === 'String 3:') { currentVmpString = 3; continue; }

      if (currentVmpString > 0 && textContent.startsWith('Vmp aktual =')) {
        const vmpVal = analysis.strings[currentVmpString - 1]?.vmp ?? 0;
        setParagraphText(p, 'Vmp aktual = ' + vmpVal + ' Vdc');
        continue;
      }
      if (currentVmpString > 0 && (textContent.includes('× 100% =') || textContent.includes('x 100% =') || textContent.includes('* 100% ='))) {
        const str = analysis.strings[currentVmpString - 1];
        const vmpVal = str?.vmp ?? 0;
        const vmpStc = formatIndoNumber(analysis.vmpSTC, 0);
        const dev = formatIndoNumber(str?.deviasiVmp ?? 0, 2);
        setParagraphText(p, '(' + vmpVal + ' − ' + vmpStc + ') / ' + vmpStc + ' × 100% = ' + dev + '%');
        continue;
      }
      if (textContent.includes('Dengan demikian, Vmp aktual berada pada rentang')) {
        setParagraphText(p, 'Dengan demikian, Vmp aktual berada pada rentang ' + analysis.minVmp + '–' + analysis.maxVmp + ' Vdc.');
        continue;
      }
      if (textContent.startsWith('Vmp =')) {
        const strIdx = currentVmpString > 0 ? currentVmpString - 1 : 0;
        setParagraphText(p, 'Vmp = ' + (analysis.strings[strIdx]?.vmp ?? 0) + ' V');
        continue;
      }
      if (textContent.includes('V atau sekitar')) {
        const diff12 = Math.abs((analysis.strings[0]?.vmp ?? 0) - (analysis.strings[1]?.vmp ?? 0));
        const pct12 = formatIndoNumber((diff12 / (analysis.strings[0]?.vmp || 1)) * 100, 2);
        setParagraphText(p, diff12 + ' V atau sekitar ' + pct12 + '%');
        continue;
      }
      if (textContent.includes('602 − 574 =') || (textContent.includes('−') && textContent.endsWith('V') && currentVmpString === 1)) {
        const diff13 = (analysis.strings[0]?.vmp ?? 0) - (analysis.strings[2]?.vmp ?? 0);
        setParagraphText(p, (analysis.strings[0]?.vmp ?? 0) + ' − ' + (analysis.strings[2]?.vmp ?? 0) + ' = ' + diff13 + ' V');
        continue;
      }
      if (textContent.includes('597 − 574 =') || (textContent.includes('−') && textContent.endsWith('V') && currentVmpString === 2)) {
        const diff23 = (analysis.strings[1]?.vmp ?? 0) - (analysis.strings[2]?.vmp ?? 0);
        setParagraphText(p, (analysis.strings[1]?.vmp ?? 0) + ' − ' + (analysis.strings[2]?.vmp ?? 0) + ' = ' + diff23 + ' V');
        continue;
      }
      if (textContent.includes('mempunyai Voc yang sama dengan String 1') || (textContent.includes('Artinya, perbedaan Vmp') && textContent.includes('String 3'))) {
        setParagraphText(
          p,
          'String ' + analysis.outlierString.name + ' mempunyai Voc sebesar ' + analysis.outlierString.voc + ' V dan irradiance ' + analysis.outlierString.irr + ' W/m², dengan Vmp sebesar ' + analysis.outlierString.vmp + ' V. Dibandingkan string lainnya, terdapat deviasi tegangan kerja yang perlu dimonitor.'
        );
        continue;
      }
    }

    // PV MODULE CONCLUSION SECTION
    if (activeSection === 'KESIMPULAN_PV') {
      if (textContent.includes('performa PV array')) {
        setParagraphText(
          p,
          'Berdasarkan hasil pengukuran Voc, Vmp dan irradiance setelah pekerjaan maintenance, performa PV array ' + (state.location.lokasi.trim() || 'Lokasi') + ' dapat dianalisa sebagai berikut.'
        );
        continue;
      }
      if (textContent.startsWith('String 1 =') && textContent.includes('V') && !textContent.includes('A')) {
        setParagraphText(p, 'String 1 = ' + (analysis.strings[0]?.voc ?? 0) + ' V ');
        continue;
      }
      if (textContent.startsWith('String 2 =') && textContent.includes('V') && !textContent.includes('A')) {
        setParagraphText(p, 'String 2 = ' + (analysis.strings[1]?.voc ?? 0) + ' V ');
        continue;
      }
      if (textContent.startsWith('String 3 =') && textContent.includes('V') && !textContent.includes('A')) {
        setParagraphText(p, 'String 3 = ' + (analysis.strings[2]?.voc ?? 0) + ' V ');
        continue;
      }
      if (textContent.startsWith('Vmp String 1 =')) {
        setParagraphText(
          p,
          'Vmp ' + analysis.strings[0]?.name + ' = ' + analysis.strings[0]?.vmp + ' V dan ' + analysis.strings[1]?.name + ' = ' + analysis.strings[1]?.vmp + ' V.'
        );
        continue;
      }
      if (textContent.startsWith('String 3 memiliki Vmp') || (textContent.includes('memiliki Vmp') && textContent.includes('sedangkan Voc-nya'))) {
        setParagraphText(
          p,
          analysis.outlierString.name + ' memiliki Vmp ' + analysis.outlierString.vmp + ' V, sedangkan Voc-nya tetap ' + analysis.outlierString.voc + ' V.'
        );
        continue;
      }
      if (textContent.startsWith('String 1 =') && textContent.includes('A')) {
        setParagraphText(p, 'String 1 = ' + formatIndoNumber(analysis.strings[0]?.imp ?? 0, 2) + ' A ');
        continue;
      }
      if (textContent.startsWith('String 2 =') && textContent.includes('A')) {
        setParagraphText(p, 'String 2 = ' + formatIndoNumber(analysis.strings[1]?.imp ?? 0, 2) + ' A ');
        continue;
      }
      if (textContent.startsWith('String 3 =') && textContent.includes('A')) {
        setParagraphText(p, 'String 3 = ' + formatIndoNumber(analysis.strings[2]?.imp ?? 0, 2) + ' A. ');
        continue;
      }
    }

    // SECTION IV.1 EXECUTIVE CONCLUSION (5 PARAGRAPHS 1-TO-1, NO DUPLICATES)
    if (activeSection === 'IV') {
      if (textContent.includes('Berdasarkan hasil inspeksi') && textContent.includes('pembersihan')) {
        const customExec = narrative?.executiveSummary || (
          state.conclusions.pvModuleSummary &&
          !state.conclusions.pvModuleSummary.startsWith('PV Module di [LOKASI_CAPS]')
            ? state.conclusions.pvModuleSummary
            : ''
        );
        if (customExec) {
          setParagraphText(p, customExec);
          hasSetExecutiveSummary = true;
        } else {
          setParagraphText(
            p,
            'Berdasarkan hasil inspeksi, pembersihan, pengukuran kelistrikan dan analisa parameter PV setelah maintenance, PLTS Rooftop ' + (state.location.lokasi.trim() || 'Lokasi') + ' secara umum masih berada dalam kondisi operasional.'
          );
        }
        continue;
      }
      if (textContent.includes('Hasil pengukuran Voc menunjukkan nilai')) {
        if (hasSetExecutiveSummary) {
          setParagraphText(p, '', true);
        } else {
          const vocListStr = analysis.strings.map((s) => s.voc + ' V').join(', ');
          setParagraphText(
            p,
            'Hasil pengukuran Voc menunjukkan nilai ' + vocListStr + ' untuk ' + analysis.strings.map((s) => s.name).join(', ') + '. Keseragaman tersebut menunjukkan bahwa karakteristik open circuit string relatif baik dan tidak menunjukkan indikasi kuat adanya kehilangan modul seri atau kegagalan string berdasarkan parameter Voc.'
          );
        }
        continue;
      }
      if (textContent.includes('Nilai Vmp yang diperoleh adalah')) {
        if (hasSetExecutiveSummary) {
          setParagraphText(p, '', true);
        } else {
          const vmpListStr = analysis.strings.map((s) => s.vmp + ' V').join(', ');
          setParagraphText(
            p,
            'Nilai Vmp yang diperoleh adalah ' + vmpListStr + '. ' + analysis.balancedStrings.map((s) => s.name).join(' dan ') + ' menunjukkan nilai yang sangat berdekatan, sedangkan ' + analysis.outlierString.name + ' memiliki Vmp lebih rendah dibandingkan string lainnya.'
          );
        }
        continue;
      }
      if (textContent.includes('Hal yang perlu menjadi perhatian adalah')) {
        if (hasSetExecutiveSummary) {
          setParagraphText(p, '', true);
        } else {
          setParagraphText(
            p,
            'Hal yang perlu menjadi perhatian adalah ' + analysis.outlierString.name + ' memiliki deviasi Vmp yang lebih rendah, sehingga kondisi tersebut merupakan indikasi yang layak untuk dilakukan monitoring dan pemeriksaan lanjutan.'
          );
        }
        continue;
      }
      if (textContent.includes('Secara keseluruhan, tidak ditemukan indikasi dari data pengukuran')) {
        if (hasSetExecutiveSummary) {
          setParagraphText(p, '', true);
        } else {
          setParagraphText(
            p,
            'Secara keseluruhan, tidak ditemukan indikasi dari data pengukuran yang menunjukkan kegagalan total pada salah satu string. Namun, ' + analysis.outlierString.name + ' sebaiknya ditetapkan sebagai string yang perlu dipantau lebih lanjut pada maintenance berikutnya.'
          );
        }
        continue;
      }
    }

    // Other conclusion paragraphs
    if (textContent.startsWith('Kondisi Operasional Normal:')) {
      setParagraphText(p, state.conclusions.operationalCondition);
      continue;
    }
    if (textContent.startsWith('Keseimbangan Antar String:')) {
      setParagraphText(p, state.conclusions.stringBalance);
      continue;
    }
    if (textContent.startsWith('Efektivitas Pemeliharaan:')) {
      setParagraphText(p, state.conclusions.maintenanceEffectiveness);
      continue;
    }

    if (textContent.includes('PV Module di') && textContent.includes('masih dalam kondisi baik')) {
      const updatedP397 = updateConclusionWithLocation(
        state.conclusions.pvModuleSummary,
        state.location.lokasi
      );
      setParagraphText(p, updatedP397);
    }
  }
}

async function populateTemplatePhotos(
  zip: JSZip,
  state: MaintenanceReportState,
  plBytes: Uint8Array
): Promise<void> {
  for (const meta of PHOTO_SLOTS_CATALOG) {
    const slot = state.photoSlots[meta.id];
    const zipPath = `word/${meta.mediaTarget}`;
    const bytes = await resolveSlotBytes(slot, plBytes);
    zip.file(zipPath, bytes);
  }
}

function resolveExportFileName(locationName: string, customFileName?: string): string {
  if (customFileName && customFileName.trim()) {
    const trimmed = customFileName.trim();
    return trimmed.toLowerCase().endsWith('.docx') ? trimmed : `${trimmed}.docx`;
  }
  const safeName = locationName.trim()
    ? locationName.trim().replace(/[^a-zA-Z0-9_-]/g, '_')
    : 'LOKASI';
  return `REPORT_MT_PLTS_JKT_${safeName}.docx`;
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function exportReportToDocx(
  state: MaintenanceReportState,
  fileNameOrProgress?: string | ((msg: string) => void),
  progressCallback?: (msg: string) => void
): Promise<void> {
  const customFileName = typeof fileNameOrProgress === 'string' ? fileNameOrProgress : undefined;
  const onProgress = typeof fileNameOrProgress === 'function' ? fileNameOrProgress : progressCallback;

  onProgress?.('Memuat template dokumen...');
  const templateRes = await fetch(`${import.meta.env.BASE_URL}template.docx`);
  if (!templateRes.ok) throw new Error('Gagal memuat /template.docx');
  const templateArrayBuffer = await templateRes.arrayBuffer();

  const plRes = await fetch(`${import.meta.env.BASE_URL}pl.jpg`);
  if (!plRes.ok) throw new Error('Gagal memuat /pl.jpg');
  const plArrayBuffer = await plRes.arrayBuffer();
  const plBytes = new Uint8Array(plArrayBuffer);

  onProgress?.('Mempersiapkan arsip dokumen...');
  const zip = await JSZip.loadAsync(templateArrayBuffer);

  onProgress?.('Menyisipkan foto dokumentasi...');
  await populateTemplatePhotos(zip, state, plBytes);

  onProgress?.('Mengisi data formulir dan tabel...');
  const xmlStr = await zip.file('word/document.xml')?.async('string');
  if (!xmlStr) throw new Error('word/document.xml tidak ditemukan dalam arsip');

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlStr, 'application/xml');
  const tables = xmlDoc.getElementsByTagNameNS(W_NS, 'tbl');

  updateCoverAndLocationTables(tables, state);
  updateRealizationDatesTable(tables, state);
  updatePhotoCaptionsAndDates(tables, state);
  updateChecklistTable(tables, state);

  if (tables.length > 25) updateMeasurementTable(tables[25], state, false);
  if (tables.length > 52) updateMeasurementTable(tables[52], state, true);

  updateComparisonTables(tables, state);
  updateSTCTables(tables, state);
  updateDamageAndRecTables(tables, state);
  updateDynamicParagraphs(xmlDoc, state);

  await injectCustomPhotos(zip, tables, state, plBytes);
  cleanPhotoTableCells(xmlDoc.getElementsByTagNameNS(W_NS, 'tbl'));

  onProgress?.('Mengompilasi berkas DOCX...');
  const serializer = new XMLSerializer();
  zip.file('word/document.xml', serializer.serializeToString(xmlDoc));

  onProgress?.('Menghasilkan berkas untuk diunduh...');
  const outBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const fileName = resolveExportFileName(state.location.lokasi, customFileName);
  triggerBlobDownload(outBlob, fileName);
}
