// ---
// Summary:
// - Purpose: Pure domain logic for selective swapping of Phase II.II (Pra) and Phase II.IV (Pasca) photo cards and measurements
// - Role: Domain service / state transformer
// - Depends on: src/types/schema.ts, src/constants/photoSlots.ts
// - Key Responsibilities: Pair semantic catalog and matching custom slots, relocate unpaired custom slots, swap selected measurement rows, and build grouped checklist preview data
// ---

import type { ElectricalMeasurement, MaintenanceReportState, PhotoSlot } from '../types/schema';
import { PHOTO_SLOTS_CATALOG } from '../constants/photoSlots';

export interface SwapSlotFilePair {
  a: string;
  b: string;
}

export interface SwapPrePostOptions {
  selectedPhotoPairPreIds: string[];
  selectedCustomSlotIds: string[];
  selectedMeasurementIds: string[];
}

export interface SwapPrePostResult {
  nextState: MaintenanceReportState;
  fileSwapPairs: SwapSlotFilePair[];
  swappedCatalogPairs: number;
  movedCustomSlots: number;
  swappedMeasurements: number;
}

export interface PrePostPhotoPairPreview {
  preId: string;
  postId: string;
  preSlot: PhotoSlot;
  postSlot: PhotoSlot;
  hasAnyPhoto: boolean;
  isCustomPair: boolean;
}

export interface PrePostCustomSlotPreview {
  slot: PhotoSlot;
  directionLabel: 'Pra -> Pasca' | 'Pasca -> Pra';
  hasPhoto: boolean;
}

export interface PrePostMeasurementGroups {
  vmp: ElectricalMeasurement[];
  imp: ElectricalMeasurement[];
  voc: ElectricalMeasurement[];
  otherDc: ElectricalMeasurement[];
  acAndGround: ElectricalMeasurement[];
}

export interface PrePostSwapPreviewData {
  photoPairs: PrePostPhotoPairPreview[];
  unpairedCustomSlots: PrePostCustomSlotPreview[];
  measurements: ElectricalMeasurement[];
  measurementGroups: PrePostMeasurementGroups;
}

// Catalog slots between II.II (pre_measure) and II.IV (post_measure) appear in different
// orders and post_measure includes 12 extra post-cleaning condition slots (slot_055..066) plus
// slot_094, so pairing must be semantic rather than positional.
export const PRE_POST_SLOT_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['slot_016', 'slot_077'],
  ['slot_017', 'slot_078'],
  ['slot_018', 'slot_079'],
  ['slot_019', 'slot_067'],
  ['slot_020', 'slot_068'],
  ['slot_021', 'slot_069'],
  ['slot_022', 'slot_070'],
  ['slot_023', 'slot_071'],
  ['slot_024', 'slot_072'],
  ['slot_025', 'slot_073'],
  ['slot_026', 'slot_074'],
  ['slot_027', 'slot_075'],
  ['slot_028', 'slot_076'],
  ['slot_028b', 'slot_076b'],
  ['slot_029', 'slot_080'],
  ['slot_030', 'slot_081'],
  ['slot_031', 'slot_082'],
  ['slot_032', 'slot_083'],
  ['slot_033', 'slot_084'],
  ['slot_034', 'slot_085'],
  ['slot_034b', 'slot_085b'],
  ['slot_034c', 'slot_085c'],
  ['slot_034d', 'slot_085d'],
  ['slot_034e', 'slot_085e'],
  ['slot_035', 'slot_086'],
  ['slot_036', 'slot_087'],
  ['slot_037', 'slot_088'],
  ['slot_038', 'slot_089'],
  ['slot_039', 'slot_090'],
  ['slot_040', 'slot_091'],
  ['slot_041', 'slot_092'],
  ['slot_042', 'slot_093'],
];

const PRE_TO_POST = new Map<string, string>(PRE_POST_SLOT_PAIRS);
const POST_TO_PRE = new Map<string, string>(PRE_POST_SLOT_PAIRS.map(([pre, post]) => [post, pre]));
const CATALOG_IDS = new Set<string>(PHOTO_SLOTS_CATALOG.map((c) => c.id));

const PRE_SECTION = 'II.II. PENGUKURAN PRA PEMBERSIHAN';
const POST_SECTION = 'II.IV. PENGUKURAN PASCA PEMBERSIHAN';

const GENERIC_CUSTOM_CAPTIONS = new Set([
  '',
  'foto dokumentasi tambahan',
  'foto dokumentasi pengukuran pra pembersihan',
  'foto dokumentasi pengukuran pasca pembersihan',
]);

export function isPhotoSlotFilled(slot: PhotoSlot | undefined): boolean {
  return Boolean(slot && slot.isUploaded && (slot.imagePath || slot.imageDataUrl));
}

function normalizeCaptionKey(caption: string): string {
  return caption
    .toLowerCase()
    .split(/[,=]/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

interface CustomSlotEntry {
  id: string;
  slot: PhotoSlot;
  anchorPreId: string | null;
  captionKey: string;
}

interface CustomPairingResult {
  matchedPairs: Array<{ preId: string; postId: string; anchorPreId: string | null }>;
  matchedPreIds: Set<string>;
  matchedPostIds: Set<string>;
  unpairedPre: CustomSlotEntry[];
  unpairedPost: CustomSlotEntry[];
}

function resolveCustomSlotPairing(photoSlots: Record<string, PhotoSlot>): CustomPairingResult {
  const preCustoms: CustomSlotEntry[] = [];
  const postCustoms: CustomSlotEntry[] = [];

  let lastPreCatalogId: string | null = null;
  let lastPostCatalogId: string | null = null;

  for (const [id, slot] of Object.entries(photoSlots)) {
    if (CATALOG_IDS.has(id)) {
      if (slot.phaseKey === 'pre_measure') lastPreCatalogId = id;
      if (slot.phaseKey === 'post_measure') lastPostCatalogId = id;
      continue;
    }

    const captionKey = normalizeCaptionKey(slot.caption || slot.defaultCaption || '');
    if (slot.phaseKey === 'pre_measure') {
      preCustoms.push({
        id,
        slot,
        anchorPreId: lastPreCatalogId && PRE_TO_POST.has(lastPreCatalogId) ? lastPreCatalogId : null,
        captionKey,
      });
    } else if (slot.phaseKey === 'post_measure') {
      const mappedPre = lastPostCatalogId
        ? POST_TO_PRE.get(lastPostCatalogId) ?? (lastPostCatalogId === 'slot_094' ? 'slot_042' : null)
        : null;
      postCustoms.push({
        id,
        slot,
        anchorPreId: mappedPre,
        captionKey,
      });
    }
  }

  const matchedPairs: Array<{ preId: string; postId: string; anchorPreId: string | null }> = [];
  const matchedPreIds = new Set<string>();
  const matchedPostIds = new Set<string>();

  // Pass 1: Match by specific normalized caption (preferring matching anchor position).
  for (const preEntry of preCustoms) {
    if (GENERIC_CUSTOM_CAPTIONS.has(preEntry.captionKey)) continue;
    const match =
      postCustoms.find(
        (p) =>
          !matchedPostIds.has(p.id) &&
          p.captionKey === preEntry.captionKey &&
          p.anchorPreId === preEntry.anchorPreId
      ) ||
      postCustoms.find(
        (p) => !matchedPostIds.has(p.id) && p.captionKey === preEntry.captionKey
      );

    if (match) {
      matchedPreIds.add(preEntry.id);
      matchedPostIds.add(match.id);
      matchedPairs.push({
        preId: preEntry.id,
        postId: match.id,
        anchorPreId: preEntry.anchorPreId ?? match.anchorPreId,
      });
    }
  }

  // Pass 2: Match remaining custom slots sitting at the same catalog anchor position.
  for (const preEntry of preCustoms) {
    if (matchedPreIds.has(preEntry.id) || !preEntry.anchorPreId) continue;
    const match = postCustoms.find(
      (p) => !matchedPostIds.has(p.id) && p.anchorPreId === preEntry.anchorPreId
    );
    if (match) {
      matchedPreIds.add(preEntry.id);
      matchedPostIds.add(match.id);
      matchedPairs.push({
        preId: preEntry.id,
        postId: match.id,
        anchorPreId: preEntry.anchorPreId,
      });
    }
  }

  return {
    matchedPairs,
    matchedPreIds,
    matchedPostIds,
    unpairedPre: preCustoms.filter((p) => !matchedPreIds.has(p.id)),
    unpairedPost: postCustoms.filter((p) => !matchedPostIds.has(p.id)),
  };
}

export function groupMeasurements(measurements: ElectricalMeasurement[]): PrePostMeasurementGroups {
  const vmp: ElectricalMeasurement[] = [];
  const imp: ElectricalMeasurement[] = [];
  const voc: ElectricalMeasurement[] = [];
  const otherDc: ElectricalMeasurement[] = [];
  const acAndGround: ElectricalMeasurement[] = [];

  for (const m of measurements) {
    if (m.id.startsWith('dc_vmp_')) {
      vmp.push(m);
    } else if (m.id.startsWith('dc_imp_')) {
      imp.push(m);
    } else if (m.id.startsWith('dc_voc_')) {
      voc.push(m);
    } else if (m.id.startsWith('ac_') || m.id.startsWith('ground_')) {
      acAndGround.push(m);
    } else {
      otherDc.push(m);
    }
  }

  return { vmp, imp, voc, otherDc, acAndGround };
}

/**
 * Builds the checklist items for paired PhotoCards (catalog + matched custom pairs),
 * truly unpaired custom slots, and grouped measurement rows.
 */
export function getPrePostSwapPreviewData(state: MaintenanceReportState): PrePostSwapPreviewData {
  const customPairing = resolveCustomSlotPairing(state.photoSlots);

  const customByAnchor = new Map<string, Array<{ preId: string; postId: string }>>();
  const unanchoredCustomPairs: Array<{ preId: string; postId: string }> = [];

  for (const pair of customPairing.matchedPairs) {
    if (pair.anchorPreId) {
      const list = customByAnchor.get(pair.anchorPreId) || [];
      list.push({ preId: pair.preId, postId: pair.postId });
      customByAnchor.set(pair.anchorPreId, list);
    } else {
      unanchoredCustomPairs.push({ preId: pair.preId, postId: pair.postId });
    }
  }

  const photoPairs: PrePostPhotoPairPreview[] = [];

  const pushPair = (preId: string, postId: string, isCustomPair: boolean) => {
    const preSlot = state.photoSlots[preId];
    const postSlot = state.photoSlots[postId];
    if (!preSlot || !postSlot) return;
    photoPairs.push({
      preId,
      postId,
      preSlot,
      postSlot,
      hasAnyPhoto: isPhotoSlotFilled(preSlot) || isPhotoSlotFilled(postSlot),
      isCustomPair,
    });
  };

  for (const [preId, postId] of PRE_POST_SLOT_PAIRS) {
    pushPair(preId, postId, false);
    const anchoredCustoms = customByAnchor.get(preId);
    if (anchoredCustoms) {
      for (const cp of anchoredCustoms) {
        pushPair(cp.preId, cp.postId, true);
      }
    }
  }

  for (const cp of unanchoredCustomPairs) {
    pushPair(cp.preId, cp.postId, true);
  }

  const unpairedCustomSlots: PrePostCustomSlotPreview[] = [
    ...customPairing.unpairedPre.map((entry) => ({
      slot: entry.slot,
      directionLabel: 'Pra -> Pasca' as const,
      hasPhoto: isPhotoSlotFilled(entry.slot),
    })),
    ...customPairing.unpairedPost.map((entry) => ({
      slot: entry.slot,
      directionLabel: 'Pasca -> Pra' as const,
      hasPhoto: isPhotoSlotFilled(entry.slot),
    })),
  ];

  return {
    photoPairs,
    unpairedCustomSlots,
    measurements: state.measurements,
    measurementGroups: groupMeasurements(state.measurements),
  };
}

function applySlotPayload(
  target: PhotoSlot,
  source: PhotoSlot,
  reportId: string,
  now: number
): PhotoSlot {
  const hasImagePath = Boolean(source.imagePath);
  const hasRawPath = Boolean(source.rawImagePath);

  return {
    ...target,
    caption: source.caption,
    date: source.date,
    imageDataUrl: source.imageDataUrl,
    rawImageDataUrl: source.rawImageDataUrl,
    imagePath: hasImagePath ? `data/reports/${reportId}/${target.id}.jpg` : undefined,
    rawImagePath: hasRawPath ? `data/reports/${reportId}/${target.id}_raw.jpg` : undefined,
    panX: source.panX,
    panY: source.panY,
    isFitted: source.isFitted,
    isUploaded: source.isUploaded,
    excludeFromDocx: source.excludeFromDocx,
    updatedAt: now,
  };
}

function swapPhotoSlotsMap(
  photoSlots: Record<string, PhotoSlot>,
  reportId: string,
  selectedPhotoPairSet: Set<string>,
  selectedCustomSlotSet: Set<string>,
  now: number
): {
  nextPhotoSlots: Record<string, PhotoSlot>;
  fileSwapPairs: SwapSlotFilePair[];
  swappedCatalogPairs: number;
  movedCustomSlots: number;
} {
  const customPairing = resolveCustomSlotPairing(photoSlots);
  const allSwapPairs: Array<readonly [string, string]> = [
    ...PRE_POST_SLOT_PAIRS,
    ...customPairing.matchedPairs.map((p) => [p.preId, p.postId] as const),
  ];

  const fileSwapPairs: SwapSlotFilePair[] = [];
  const swappedMap = new Map<string, PhotoSlot>();
  let swappedCatalogPairs = 0;

  for (const [preId, postId] of allSwapPairs) {
    if (!selectedPhotoPairSet.has(preId)) continue;
    const preSlot = photoSlots[preId];
    const postSlot = photoSlots[postId];
    if (!preSlot || !postSlot) continue;

    swappedMap.set(preId, applySlotPayload(preSlot, postSlot, reportId, now));
    swappedMap.set(postId, applySlotPayload(postSlot, preSlot, reportId, now));
    fileSwapPairs.push({ a: preId, b: postId });
    swappedCatalogPairs += 1;
  }

  // Only selected unpaired custom slots move across phases; matched custom pairs swap in place.
  const matchedIds = new Set<string>([
    ...customPairing.matchedPreIds,
    ...customPairing.matchedPostIds,
  ]);
  const anchoredCustomSlots = new Map<string, PhotoSlot[]>();
  const movedCustomIds = new Set<string>();
  const pushAnchored = (anchorKey: string, slot: PhotoSlot) => {
    const list = anchoredCustomSlots.get(anchorKey) || [];
    list.push(slot);
    anchoredCustomSlots.set(anchorKey, list);
  };

  let lastPreCatalogId: string | null = null;
  let lastPostCatalogId: string | null = null;
  let movedCustomSlots = 0;

  for (const [id, slot] of Object.entries(photoSlots)) {
    if (CATALOG_IDS.has(id)) {
      if (slot.phaseKey === 'pre_measure') lastPreCatalogId = id;
      if (slot.phaseKey === 'post_measure') lastPostCatalogId = id;
      continue;
    }

    if (matchedIds.has(id) || !selectedCustomSlotSet.has(id)) continue;

    if (slot.phaseKey === 'pre_measure') {
      const mappedPost = lastPreCatalogId ? PRE_TO_POST.get(lastPreCatalogId) : undefined;
      const anchorKey = mappedPost ? `after:${mappedPost}` : 'before:slot_067';
      pushAnchored(anchorKey, {
        ...slot,
        phaseKey: 'post_measure',
        section: POST_SECTION,
        updatedAt: now,
      });
      movedCustomIds.add(id);
      movedCustomSlots += 1;
    } else if (slot.phaseKey === 'post_measure') {
      const mappedPre = lastPostCatalogId ? POST_TO_PRE.get(lastPostCatalogId) : undefined;
      const anchorKey = mappedPre
        ? `after:${mappedPre}`
        : lastPostCatalogId === 'slot_094'
        ? 'after:slot_042'
        : 'before:slot_016';
      pushAnchored(anchorKey, {
        ...slot,
        phaseKey: 'pre_measure',
        section: PRE_SECTION,
        updatedAt: now,
      });
      movedCustomIds.add(id);
      movedCustomSlots += 1;
    }
  }

  const emittedAnchors = new Set<string>();
  const emitAnchor = (anchorKey: string, target: Record<string, PhotoSlot>) => {
    const list = anchoredCustomSlots.get(anchorKey);
    if (!list) return;
    emittedAnchors.add(anchorKey);
    for (const item of list) {
      target[item.id] = item;
    }
  };

  const nextPhotoSlots: Record<string, PhotoSlot> = {};
  for (const [id, slot] of Object.entries(photoSlots)) {
    if (movedCustomIds.has(id)) continue;

    if (id === 'slot_016') emitAnchor('before:slot_016', nextPhotoSlots);
    if (id === 'slot_067') emitAnchor('before:slot_067', nextPhotoSlots);

    nextPhotoSlots[id] = swappedMap.get(id) || slot;
    emitAnchor(`after:${id}`, nextPhotoSlots);
  }

  for (const [anchorKey, list] of anchoredCustomSlots.entries()) {
    if (emittedAnchors.has(anchorKey)) continue;
    for (const item of list) {
      nextPhotoSlots[item.id] = item;
    }
  }

  return { nextPhotoSlots, fileSwapPairs, swappedCatalogPairs, movedCustomSlots };
}

/**
 * Produces a new report state with only the checked Pra (II.II) and Pasca (II.IV)
 * photo cards and/or measurement rows swapped.
 */
export function swapPrePostData(
  state: MaintenanceReportState,
  reportId: string,
  options: SwapPrePostOptions
): SwapPrePostResult {
  const now = Date.now();
  const selectedPhotoPairSet = new Set(options.selectedPhotoPairPreIds);
  const selectedCustomSlotSet = new Set(options.selectedCustomSlotIds);
  const selectedMeasurementSet = new Set(options.selectedMeasurementIds);

  const hasPhotoSelection = selectedPhotoPairSet.size > 0 || selectedCustomSlotSet.size > 0;
  let nextPhotoSlots = state.photoSlots;
  let fileSwapPairs: SwapSlotFilePair[] = [];
  let swappedCatalogPairs = 0;
  let movedCustomSlots = 0;

  if (hasPhotoSelection) {
    const photoResult = swapPhotoSlotsMap(
      state.photoSlots,
      reportId,
      selectedPhotoPairSet,
      selectedCustomSlotSet,
      now
    );
    nextPhotoSlots = photoResult.nextPhotoSlots;
    fileSwapPairs = photoResult.fileSwapPairs;
    swappedCatalogPairs = photoResult.swappedCatalogPairs;
    movedCustomSlots = photoResult.movedCustomSlots;
  }

  let swappedMeasurements = 0;
  const nextMeasurements =
    selectedMeasurementSet.size > 0
      ? state.measurements.map((m) => {
          if (!selectedMeasurementSet.has(m.id)) return m;
          swappedMeasurements += 1;
          return {
            ...m,
            hasilBefore: m.hasilAfter,
            hasilAfter: m.hasilBefore,
          };
        })
      : state.measurements;

  return {
    nextState: {
      ...state,
      photoSlots: nextPhotoSlots,
      measurements: nextMeasurements,
    },
    fileSwapPairs,
    swappedCatalogPairs,
    movedCustomSlots,
    swappedMeasurements,
  };
}
