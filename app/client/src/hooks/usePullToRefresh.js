import { useEffect, useRef, useState } from 'react';

export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    maxPullDistance = 120,
    resistance = 0.5,
    enabled = true
  } = options;

  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e) => {
      // Only trigger if scrolled to top
      if (window.scrollY === 0 || (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0)) {
        touchStartY.current = e.touches[0].clientY;
        setIsPulling(true);
      }
    };

    const handleTouchMove = (e) => {
      if (!isPulling || isRefreshing) return;

      const touchY = e.touches[0].clientY;
      const pullDist = (touchY - touchStartY.current) * resistance;

      if (pullDist > 0) {
        e.preventDefault(); // Prevent overscroll
        setPullDistance(Math.min(pullDist, maxPullDistance));
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling) return;

      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isPulling, pullDistance, threshold, maxPullDistance, resistance, isRefreshing, onRefresh]);

  const getRefreshIndicatorStyle = () => {
    const opacity = Math.min(pullDistance / threshold, 1);
    const rotation = (pullDistance / threshold) * 360;
    
    return {
      transform: `translateY(${pullDistance}px)`,
      opacity,
      pointerEvents: 'none'
    };
  };

  const getSpinnerRotation = () => {
    return {
      transform: `rotate(${(pullDistance / threshold) * 360}deg)`
    };
  };

  return {
    isPulling: isPulling || isRefreshing,
    pullDistance,
    isRefreshing,
    pullProgress: pullDistance / threshold,
    isTriggered: pullDistance >= threshold,
    getRefreshIndicatorStyle,
    getSpinnerRotation,
    scrollContainerRef
  };
}
