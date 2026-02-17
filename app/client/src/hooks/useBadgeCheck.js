import { useCallback } from 'react';
import { badges as badgesApi } from '../api';
import { useToast } from '../components/Toast';

export function useBadgeCheck() {
  let showToast;
  try {
    const ctx = useToast();
    showToast = ctx?.showToast;
  } catch {
    showToast = null;
  }

  const checkBadges = useCallback(async () => {
    try {
      const data = await badgesApi.check();
      if (data.newBadges && data.newBadges.length > 0) {
        data.newBadges.forEach(badge => {
          if (showToast) {
            showToast(`${badge.icon} Badge earned: ${badge.name}!`, 'success');
          }
        });
      }
      return data.newBadges || [];
    } catch {
      return [];
    }
  }, [showToast]);

  return { checkBadges };
}
