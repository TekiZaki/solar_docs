// ---
// Summary:
// - Purpose: Manage server-side lease lock per report file so only one device edits at a time
// - Role: Context hook for concurrency control
// - Depends on: src/lib/deviceIdentity.ts, src/lib/reportApi.ts
// - Key Responsibilities: Acquire lock on report load, renew via heartbeat, release on switch/unload, expose read-only lock status
// ---

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getDeviceId,
  getDeviceName,
  saveDeviceName,
} from '../lib/deviceIdentity';
import {
  acquireReportLock,
  releaseReportLock,
  releaseReportLockBeacon,
  type ReportLockInfo,
} from '../lib/reportApi';

const HEARTBEAT_MS = 3_000;

export function useReportLock(
  currentReportId: string,
  onRemoteUpdate: () => void
) {
  const [deviceId] = useState<string>(() => getDeviceId());
  const [deviceName, setDeviceNameState] = useState<string>(() => getDeviceName(deviceId));
  const [lockActive, setLockActive] = useState(false);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockOwner, setLockOwner] = useState<ReportLockInfo | null>(null);
  const wasLockedRef = useRef(false);

  const setDeviceName = useCallback((name: string) => {
    const updated = saveDeviceName(name);
    setDeviceNameState(updated);
  }, []);

  useEffect(() => {
    if (!currentReportId || !lockActive) {
      setIsLockedByOther(false);
      setLockOwner(null);
      wasLockedRef.current = false;
      return;
    }
    let active = true;

    const syncLock = async () => {
      const res = await acquireReportLock(currentReportId, deviceId, deviceName);
      if (!active || !res) return;

      const lockedByAnother = !res.acquired && Boolean(res.lock);
      setIsLockedByOther(lockedByAnother);
      setLockOwner(res.lock);

      // Refresh data while watching a locked file or right when lock is released
      if (lockedByAnother || wasLockedRef.current) {
        onRemoteUpdate();
      }
      wasLockedRef.current = lockedByAnother;
    };

    syncLock();
    const timer = setInterval(syncLock, HEARTBEAT_MS);

    const handlePageHide = () => {
      releaseReportLockBeacon(currentReportId, deviceId);
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
      releaseReportLock(currentReportId, deviceId);
    };
  }, [currentReportId, lockActive, deviceId, deviceName, onRemoteUpdate]);

  return {
    deviceId,
    deviceName,
    setDeviceName,
    setLockActive,
    isLockedByOther,
    lockOwner,
  };
}
