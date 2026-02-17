import { useState, useRef, useEffect } from 'react';

export function useSwipeActions(options = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = 100,
    enabled = true
  } = options;

  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeTriggered, setSwipeTriggered] = useState(null);
  
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const elementRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!enabled) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e) => {
    if (!isSwiping || !enabled) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    // Only swipe horizontally if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault(); // Prevent scrolling
      setSwipeDistance(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping || !enabled) return;

    setIsSwiping(false);

    // Right swipe (save)
    if (swipeDistance > threshold && onSwipeRight) {
      setSwipeTriggered('right');
      setTimeout(() => {
        onSwipeRight();
        resetSwipe();
      }, 300);
    }
    // Left swipe (dismiss)
    else if (swipeDistance < -threshold && onSwipeLeft) {
      setSwipeTriggered('left');
      setTimeout(() => {
        onSwipeLeft();
        resetSwipe();
      }, 300);
    }
    // Reset if threshold not met
    else {
      resetSwipe();
    }
  };

  const resetSwipe = () => {
    setSwipeDistance(0);
    setSwipeTriggered(null);
  };

  const getSwipeStyle = () => {
    if (swipeTriggered) {
      // Animate out
      return {
        transform: swipeTriggered === 'right' 
          ? 'translateX(100%)' 
          : 'translateX(-100%)',
        opacity: 0,
        transition: 'all 0.3s ease-out'
      };
    }

    return {
      transform: `translateX(${swipeDistance}px)`,
      transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
    };
  };

  const getBackgroundStyle = () => {
    const distance = Math.abs(swipeDistance);
    const opacity = Math.min(distance / threshold, 1);

    if (swipeDistance > 0) {
      // Right swipe - green background (save)
      return {
        background: `rgba(34, 197, 94, ${opacity * 0.2})`,
        transition: 'background 0.2s'
      };
    } else if (swipeDistance < 0) {
      // Left swipe - red background (dismiss)
      return {
        background: `rgba(239, 68, 68, ${opacity * 0.2})`,
        transition: 'background 0.2s'
      };
    }

    return {};
  };

  const getIconOpacity = (direction) => {
    if (direction === 'right' && swipeDistance > 0) {
      return Math.min(swipeDistance / threshold, 1);
    }
    if (direction === 'left' && swipeDistance < 0) {
      return Math.min(Math.abs(swipeDistance) / threshold, 1);
    }
    return 0;
  };

  const bind = {
    ref: elementRef,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };

  return {
    bind,
    swipeDistance,
    isSwiping,
    swipeTriggered,
    isThresholdMet: Math.abs(swipeDistance) >= threshold,
    getSwipeStyle,
    getBackgroundStyle,
    getIconOpacity,
    elementRef
  };
}
