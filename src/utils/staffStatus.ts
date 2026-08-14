export interface StaffStatusInfo {
  isInactive: boolean;
  isRemoved?: boolean;
  inactiveDate?: string;
  removedDate?: string;
  reason?: string;
  markedBy?: string;
}

const STORAGE_KEY = 'agm_inactive_staff_status';

export function getInactiveStaffMap(): Record<string, StaffStatusInfo> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading inactive staff map:', err);
    return {};
  }
}

export function saveInactiveStaffMap(map: Record<string, StaffStatusInfo>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error saving inactive staff map:', err);
  }
}

export function getStaffStatusInfo(nameOrId: string, map?: Record<string, StaffStatusInfo>): StaffStatusInfo | null {
  if (!nameOrId) return null;
  const currentMap = map || getInactiveStaffMap();
  const cleanKey = nameOrId.trim().toUpperCase();
  return currentMap[cleanKey] || null;
}

export function isStaffInactive(nameOrId: string, map?: Record<string, StaffStatusInfo>): boolean {
  if (!nameOrId) return false;
  const info = getStaffStatusInfo(nameOrId, map);
  return Boolean(info?.isInactive || info?.isRemoved);
}

export function isStaffRemoved(nameOrId: string, map?: Record<string, StaffStatusInfo>): boolean {
  if (!nameOrId) return false;
  const info = getStaffStatusInfo(nameOrId, map);
  return Boolean(info?.isRemoved || info?.isInactive);
}

export function markStaffInactiveStatus(
  nameOrId: string,
  isInactive: boolean,
  reason?: string,
  isRemoved: boolean = true
): Record<string, StaffStatusInfo> {
  const map = getInactiveStaffMap();
  const cleanKey = nameOrId.trim().toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  
  if (isInactive) {
    map[cleanKey] = {
      isInactive: true,
      isRemoved: isRemoved,
      inactiveDate: today,
      removedDate: today,
      reason: reason || 'Removed by Manager - past data preserved',
      markedBy: 'Manager'
    };
  } else {
    delete map[cleanKey];
  }
  
  saveInactiveStaffMap(map);
  return map;
}

export function clearAllInactiveStaff(): Record<string, StaffStatusInfo> {
  saveInactiveStaffMap({});
  return {};
}

