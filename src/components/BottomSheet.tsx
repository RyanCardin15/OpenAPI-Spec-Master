import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  closable?: boolean;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  showHandle = true,
  closable = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const bottomSheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Manage visibility states for smooth animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsAnimating(true);
      // Trigger animation after render
      setTimeout(() => setIsAnimating(false), 50);
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsAnimating(false);
      }, 300);
    }
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && closable) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closable, onClose]);

  // Touch event handlers for swipe to close
  const handleTouchStart = (event: TouchEvent) => {
    startY.current = event.touches[0].clientY;
    currentY.current = startY.current;
    isDragging.current = true;
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isDragging.current) return;
    
    currentY.current = event.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    // Only allow dragging down (positive deltaY)
    if (deltaY > 0 && bottomSheetRef.current) {
      const sheet = bottomSheetRef.current;
      sheet.style.transform = `translateY(${deltaY}px)`;
      
      // Add resistance when dragging
      const opacity = Math.max(0.1, 1 - deltaY / 300);
      sheet.style.opacity = opacity.toString();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || !bottomSheetRef.current) return;
    
    const deltaY = currentY.current - startY.current;
    const sheet = bottomSheetRef.current;
    
    // If dragged more than 100px down, close the sheet
    if (deltaY > 100 && closable) {
      onClose();
    } else {
      // Snap back to original position
      sheet.style.transform = 'translateY(0)';
      sheet.style.opacity = '1';
    }
    
    isDragging.current = false;
  };

  // Attach touch listeners
  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (!sheet) return;

    const options = { passive: false };
    sheet.addEventListener('touchstart', handleTouchStart, options);
    sheet.addEventListener('touchmove', handleTouchMove, options);
    sheet.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isVisible]);

  const getHeightClass = () => {
    switch (height) {
      case 'full':
        return 'h-[90vh]';
      case 'half':
        return 'h-[50vh]';
      default:
        return 'max-h-[80vh]';
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isAnimating ? 'opacity-0' : 'opacity-50'
        }`}
        onClick={closable ? onClose : undefined}
      />

      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className={`
          fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl z-50
          ${getHeightClass()}
          transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-y-full' : 'translate-y-0'}
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 id="bottom-sheet-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          {closable && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target"
              aria-label="Close bottom sheet"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* Mobile-specific hint */}
        <div className="lg:hidden px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center gap-1">
            <ChevronDown className="h-3 w-3" />
            <span>Swipe down to close</span>
          </div>
        </div>
      </div>
    </>
  );
}; 