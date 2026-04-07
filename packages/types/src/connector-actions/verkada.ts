export interface VerkadaDoorLockResult {
  locked: true;
}

export interface VerkadaDoorUnlockResult {
  unlocked: true;
}

export interface VerkadaActionResults {
  door_lock: VerkadaDoorLockResult;
  door_unlock: VerkadaDoorUnlockResult;
}
