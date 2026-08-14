// Centralized Staff & Fleet Resolution Engine for Guides, Drivers & Transport Companies

export interface RegisteredGuideInfo {
  id: string; // 6-digit ID
  name: string;
  nickname?: string;
  originCity?: string;
  languages?: string[];
  phone?: string;
  status?: 'Active' | 'On-Call' | 'Inactive';
  badgeColor?: string;
}

export interface RegisteredDriverInfo {
  id?: string;
  name: string;
  vanType: 'Big van' | 'Mini van';
  companyName: string;
  originCity?: string;
  phone?: string;
  status?: 'Active' | 'Inactive';
}

// Levenshtein distance calculation for fuzzy matching
export function getLevenshteinDistance(s1: string, s2: string): number {
  if (s1.length < s2.length) return getLevenshteinDistance(s2, s1);
  if (s2.length === 0) return s1.length;
  let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const insertions = previousRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }
  return previousRow[previousRow.length - 1];
}

export interface ResolvedGuide {
  canonicalName: string;
  guideId?: string;
  nickname?: string;
  profileKey: string;
  isRegistered: boolean;
  registeredGuide?: RegisteredGuideInfo;
}

/**
 * Resolves a raw guide input string (which may be a 6-digit ID, a name, a nickname, or a typo)
 * to a canonical Guide with registered ID and accurate profile key.
 */
export function resolveGuide(
  rawInput: string,
  registeredGuides: RegisteredGuideInfo[] = [],
  knownGuidesList: string[] = []
): ResolvedGuide | null {
  const clean = (rawInput || '').trim();
  const cleanUpper = clean.toUpperCase();

  if (
    !clean ||
    cleanUpper === 'WITHOUT GUIDE' ||
    cleanUpper === 'H1' ||
    cleanUpper === '?' ||
    cleanUpper === 'NONE' ||
    cleanUpper === 'NO GUIDE'
  ) {
    return null;
  }

  // 1. Direct ID match (exact or numeric digits)
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length >= 3) {
    const matchedById = registeredGuides.find(rg => {
      const rgDigits = (rg.id || '').replace(/\D/g, '');
      return rgDigits === digitsOnly || (rg.id && rg.id.toUpperCase() === cleanUpper);
    });
    if (matchedById) {
      return {
        canonicalName: matchedById.name,
        guideId: matchedById.id,
        nickname: matchedById.nickname,
        profileKey: `guide_${matchedById.name.toUpperCase().replace(/\s+/g, '_')}`,
        isRegistered: true,
        registeredGuide: matchedById
      };
    }
  }

  // 2. Exact Name or Nickname match against Registered Guides
  const matchExactReg = registeredGuides.find(rg => {
    const nameMatch = rg.name.trim().toUpperCase() === cleanUpper;
    const nickMatch = rg.nickname && rg.nickname.trim().toUpperCase() === cleanUpper;
    const idMatch = rg.id && rg.id.trim().toUpperCase() === cleanUpper;
    return nameMatch || nickMatch || idMatch;
  });

  if (matchExactReg) {
    return {
      canonicalName: matchExactReg.name,
      guideId: matchExactReg.id,
      nickname: matchExactReg.nickname,
      profileKey: `guide_${matchExactReg.name.toUpperCase().replace(/\s+/g, '_')}`,
      isRegistered: true,
      registeredGuide: matchExactReg
    };
  }

  // 3. Fuzzy match against Registered Guides
  for (const rg of registeredGuides) {
    const nameUpper = rg.name.trim().toUpperCase();
    const nickUpper = (rg.nickname || '').trim().toUpperCase();
    const distName = getLevenshteinDistance(cleanUpper, nameUpper);
    const maxDist = cleanUpper.length <= 4 ? 1 : cleanUpper.length <= 8 ? 2 : 3;

    if (distName <= maxDist) {
      return {
        canonicalName: rg.name,
        guideId: rg.id,
        nickname: rg.nickname,
        profileKey: `guide_${rg.name.toUpperCase().replace(/\s+/g, '_')}`,
        isRegistered: true,
        registeredGuide: rg
      };
    }

    if (nickUpper && getLevenshteinDistance(cleanUpper, nickUpper) <= (nickUpper.length <= 4 ? 1 : 2)) {
      return {
        canonicalName: rg.name,
        guideId: rg.id,
        nickname: rg.nickname,
        profileKey: `guide_${rg.name.toUpperCase().replace(/\s+/g, '_')}`,
        isRegistered: true,
        registeredGuide: rg
      };
    }
  }

  // 4. Match known guides list
  for (const known of knownGuidesList) {
    if (cleanUpper === known.trim().toUpperCase()) {
      return {
        canonicalName: known,
        profileKey: `guide_${known.toUpperCase().replace(/\s+/g, '_')}`,
        isRegistered: false
      };
    }
  }

  let bestKnown = cleanUpper;
  let minDist = 999;
  for (const known of knownGuidesList) {
    const kUpper = known.trim().toUpperCase();
    if (!kUpper || kUpper === 'WITHOUT GUIDE' || kUpper === '?') continue;
    const dist = getLevenshteinDistance(cleanUpper, kUpper);
    const maxDist = cleanUpper.length <= 4 ? 1 : cleanUpper.length <= 8 ? 2 : 3;
    if (dist <= maxDist && dist < minDist) {
      minDist = dist;
      bestKnown = known;
    }
  }

  return {
    canonicalName: bestKnown,
    profileKey: `guide_${bestKnown.toUpperCase().replace(/\s+/g, '_')}`,
    isRegistered: false
  };
}

export interface ResolvedDriver {
  canonicalName: string;
  driverId?: string;
  vanType: 'Big van' | 'Mini van';
  role: 'big_driver' | 'mini_driver';
  companyName: string;
  profileKey: string;
  isRegistered: boolean;
  registeredDriver?: RegisteredDriverInfo;
}

/**
 * Resolves a raw driver input string (and optional van type & company)
 * to a canonical Driver with accurate role and profile key.
 */
export function resolveDriver(
  rawInput: string,
  rawVanType: string = 'Big van',
  rawCompany: string = 'AGM',
  registeredDrivers: RegisteredDriverInfo[] = [],
  knownDriversList: string[] = []
): ResolvedDriver | null {
  const clean = (rawInput || '').trim();
  const cleanUpper = clean.toUpperCase();

  if (!clean || cleanUpper === '?' || cleanUpper === 'NONE' || cleanUpper === 'NO DRIVER') {
    return null;
  }

  const isMini = (rawVanType || '').toLowerCase().includes('mini');
  const initialRole: 'mini_driver' | 'big_driver' = isMini ? 'mini_driver' : 'big_driver';
  const defaultCompany = (rawCompany || 'AGM').trim() || 'AGM';

  // 1. Direct ID / Name match against registered drivers
  const matchReg = registeredDrivers.find(rd => {
    const idMatch = rd.id && rd.id.trim().toUpperCase() === cleanUpper;
    const nameMatch = rd.name.trim().toUpperCase() === cleanUpper;
    return idMatch || nameMatch;
  });

  if (matchReg) {
    const role: 'mini_driver' | 'big_driver' = matchReg.vanType === 'Mini van' ? 'mini_driver' : 'big_driver';
    return {
      canonicalName: matchReg.name,
      driverId: matchReg.id,
      vanType: matchReg.vanType,
      role: role,
      companyName: matchReg.companyName || defaultCompany,
      profileKey: `${role}_${matchReg.name.toUpperCase().replace(/\s+/g, '_')}`,
      isRegistered: true,
      registeredDriver: matchReg
    };
  }

  // 2. Fuzzy match against registered drivers
  for (const rd of registeredDrivers) {
    const nameUpper = rd.name.trim().toUpperCase();
    const dist = getLevenshteinDistance(cleanUpper, nameUpper);
    const maxDist = cleanUpper.length <= 4 ? 1 : cleanUpper.length <= 8 ? 2 : 3;
    if (dist <= maxDist) {
      const role: 'mini_driver' | 'big_driver' = rd.vanType === 'Mini van' ? 'mini_driver' : 'big_driver';
      return {
        canonicalName: rd.name,
        driverId: rd.id,
        vanType: rd.vanType,
        role: role,
        companyName: rd.companyName || defaultCompany,
        profileKey: `${role}_${rd.name.toUpperCase().replace(/\s+/g, '_')}`,
        isRegistered: true,
        registeredDriver: rd
      };
    }
  }

  // 3. Match against known drivers list
  for (const known of knownDriversList) {
    if (cleanUpper === known.trim().toUpperCase()) {
      return {
        canonicalName: known,
        vanType: isMini ? 'Mini van' : 'Big van',
        role: initialRole,
        companyName: defaultCompany,
        profileKey: `${initialRole}_${known.toUpperCase().replace(/\s+/g, '_')}`,
        isRegistered: false
      };
    }
  }

  let bestKnown = cleanUpper;
  let minDist = 999;
  for (const known of knownDriversList) {
    const kUpper = known.trim().toUpperCase();
    if (!kUpper || kUpper === '?') continue;
    const dist = getLevenshteinDistance(cleanUpper, kUpper);
    const maxDist = cleanUpper.length <= 4 ? 1 : cleanUpper.length <= 8 ? 2 : 3;
    if (dist <= maxDist && dist < minDist) {
      minDist = dist;
      bestKnown = known;
    }
  }

  return {
    canonicalName: bestKnown,
    vanType: isMini ? 'Mini van' : 'Big van',
    role: initialRole,
    companyName: defaultCompany,
    profileKey: `${initialRole}_${bestKnown.toUpperCase().replace(/\s+/g, '_')}`,
    isRegistered: false
  };
}
