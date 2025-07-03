export interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  duration: number;
}

export interface PinchGesture {
  scale: number;
  center: { x: number; y: number };
}

export interface PullRefreshGesture {
  distance: number;
  isTriggered: boolean;
}

export class TouchGestureHandler {
  private touchStart: TouchPoint | null = null;
  private touchEnd: TouchPoint | null = null;
  private touches: TouchPoint[] = [];
  private initialDistance: number = 0;
  private initialScale: number = 1;
  private pullStartY: number = 0;
  private isPulling: boolean = false;

  // Thresholds
  private readonly SWIPE_THRESHOLD = 50; // Minimum distance for swipe
  private readonly SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity for swipe
  private readonly PULL_THRESHOLD = 100; // Distance to trigger pull refresh
  private readonly PINCH_THRESHOLD = 0.1; // Minimum scale change for pinch

  constructor(
    private element: HTMLElement,
    private callbacks: TouchGestureCallbacks
  ) {
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.element.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
  }

  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    this.touchStart = touchPoint;
    this.touches = [touchPoint];

    // Handle pinch gesture initialization
    if (event.touches.length === 2) {
      this.initialDistance = this.getDistance(event.touches[0], event.touches[1]);
      this.initialScale = 1;
    }

    // Handle pull-to-refresh initialization
    if (this.isAtTop() && touch.clientY < 100) {
      this.pullStartY = touch.clientY;
      this.isPulling = true;
    }

    // Long press detection
    setTimeout(() => {
      if (this.touchStart && this.isSameTouch(this.touchStart, touchPoint, 10)) {
        this.callbacks.onLongPress?.(touchPoint);
      }
    }, 500);
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.touchStart) return;

    const touch = event.touches[0];
    const touchPoint: TouchPoint = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    this.touches.push(touchPoint);

    // Handle pinch gesture
    if (event.touches.length === 2 && this.callbacks.onPinch) {
      const currentDistance = this.getDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / this.initialDistance;
      
      if (Math.abs(scale - this.initialScale) > this.PINCH_THRESHOLD) {
        const center = this.getCenter(event.touches[0], event.touches[1]);
        this.callbacks.onPinch({
          scale,
          center
        });
        this.initialScale = scale;
      }
    }

    // Handle pull-to-refresh
    if (this.isPulling && this.callbacks.onPullRefresh) {
      const distance = Math.max(0, touch.clientY - this.pullStartY);
      const isTriggered = distance > this.PULL_THRESHOLD;
      
      this.callbacks.onPullRefresh({
        distance,
        isTriggered
      });

      if (isTriggered) {
        event.preventDefault();
      }
    }

    // Prevent default for significant movements to avoid scrolling conflicts
    const deltaX = Math.abs(touch.clientX - this.touchStart.x);
    const deltaY = Math.abs(touch.clientY - this.touchStart.y);
    
    if (deltaX > 30 || deltaY > 30) {
      event.preventDefault();
    }
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.touchStart || this.touches.length < 2) return;

    const touch = event.changedTouches[0];
    this.touchEnd = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    this.detectGestures();
    this.reset();
  }

  private handleTouchCancel(): void {
    this.reset();
  }

  private detectGestures(): void {
    if (!this.touchStart || !this.touchEnd) return;

    const deltaX = this.touchEnd.x - this.touchStart.x;
    const deltaY = this.touchEnd.y - this.touchStart.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const duration = this.touchEnd.timestamp - this.touchStart.timestamp;
    const velocity = distance / duration;

    // Detect tap vs swipe
    if (distance < this.SWIPE_THRESHOLD) {
      this.detectTap();
      return;
    }

    // Detect swipe direction and trigger callback
    if (velocity > this.SWIPE_VELOCITY_THRESHOLD && this.callbacks.onSwipe) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction: SwipeGesture['direction'];
      
      if (absDeltaX > absDeltaY) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      this.callbacks.onSwipe({
        direction,
        distance,
        velocity,
        duration
      });
    }
  }

  private detectTap(): void {
    if (!this.touchStart || !this.touchEnd) return;

    const duration = this.touchEnd.timestamp - this.touchStart.timestamp;
    
    // Quick tap
    if (duration < 200) {
      this.callbacks.onTap?.(this.touchStart);
      
      // Check for double tap
      setTimeout(() => {
        if (this.touchStart && this.isSameTouch(this.touchStart, this.touchEnd!, 20)) {
          this.callbacks.onDoubleTap?.(this.touchStart);
        }
      }, 300);
    }
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const deltaX = touch1.clientX - touch2.clientX;
    const deltaY = touch1.clientY - touch2.clientY;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  private getCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    };
  }

  private isSameTouch(touch1: TouchPoint, touch2: TouchPoint, threshold: number = 10): boolean {
    const deltaX = Math.abs(touch1.x - touch2.x);
    const deltaY = Math.abs(touch1.y - touch2.y);
    return deltaX < threshold && deltaY < threshold;
  }

  private isAtTop(): boolean {
    return window.scrollY === 0 || document.documentElement.scrollTop === 0;
  }

  private reset(): void {
    this.touchStart = null;
    this.touchEnd = null;
    this.touches = [];
    this.isPulling = false;
    this.pullStartY = 0;
  }

  public destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.handleTouchCancel.bind(this));
  }
}

import React from 'react';

export type TouchGestureCallbacks = {
  onSwipe?: (gesture: SwipeGesture) => void;
  onPinch?: (gesture: PinchGesture) => void;
  onPullRefresh?: (gesture: PullRefreshGesture) => void;
  onTap?: (point: TouchPoint) => void;
  onDoubleTap?: (point: TouchPoint) => void;
  onLongPress?: (point: TouchPoint) => void;
};

// Hook for React components
export const useTouchGestures = (
  elementRef: React.RefObject<HTMLElement>,
  callbacks: TouchGestureCallbacks,
  dependencies: React.DependencyList = []
) => {
  React.useEffect(() => {
    if (!elementRef.current) return;

    const handler = new TouchGestureHandler(elementRef.current, callbacks);
    
    return () => {
      handler.destroy();
    };
  }, [elementRef.current, ...dependencies]);
};

// Utility functions for common gesture patterns
export const detectSwipeDirection = (startX: number, startY: number, endX: number, endY: number): SwipeGesture['direction'] | null => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  // Minimum distance threshold
  const threshold = 50;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  if (distance < threshold) return null;

  if (absDeltaX > absDeltaY) {
    return deltaX > 0 ? 'right' : 'left';
  } else {
    return deltaY > 0 ? 'down' : 'up';
  }
};

export const createPullToRefreshIndicator = (container: HTMLElement, onRefresh: () => Promise<void>) => {
  const indicator = document.createElement('div');
  indicator.className = 'pull-refresh-indicator';
  indicator.style.cssText = `
    position: absolute;
    top: -60px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #3B82F6;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    transition: all 0.3s ease;
    z-index: 1000;
  `;
  indicator.innerHTML = '↓';
  
  container.style.position = 'relative';
  container.appendChild(indicator);

  return {
    update: (distance: number, isTriggered: boolean) => {
      const translateY = Math.min(distance * 0.5, 60);
      const rotate = Math.min(distance * 2, 180);
      
      indicator.style.transform = `translateX(-50%) translateY(${translateY}px) rotate(${rotate}deg)`;
      indicator.style.opacity = Math.min(distance / 100, 1).toString();
      
      if (isTriggered) {
        indicator.innerHTML = '↻';
        indicator.style.background = '#10B981';
      } else {
        indicator.innerHTML = '↓';
        indicator.style.background = '#3B82F6';
      }
    },
    
    trigger: async () => {
      indicator.innerHTML = '⟳';
      indicator.style.animation = 'spin 1s linear infinite';
      
      try {
        await onRefresh();
      } finally {
        indicator.style.animation = '';
        indicator.style.transform = 'translateX(-50%) translateY(-60px)';
        indicator.style.opacity = '0';
      }
    },
    
    destroy: () => {
      indicator.remove();
    }
  };
}; 