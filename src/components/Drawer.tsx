import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  className?: string;
  hideHeader?: boolean;
  bodyClassName?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'left',
  className,
  hideHeader = false,
  bodyClassName,
  triggerRef,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus restoration & Escape / Focus trap
  useEffect(() => {
    if (!isOpen) return;

    // Save current active element before drawer opened
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element or container
    const focusTimer = setTimeout(() => {
      if (drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          drawerRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const triggerElement = triggerRef?.current;

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);

      // Return focus on close to triggerElement or previous active element
      setTimeout(() => {
        if (triggerElement && typeof triggerElement.focus === 'function') {
          triggerElement.focus();
        } else if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
      }, 0);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const positionClasses = {
    left: 'left-0 translate-x-0',
    right: 'right-0 translate-x-0',
  }[position];

  return (
    <div
      ref={drawerRef}
      className="fixed inset-0 z-50 overflow-hidden flex"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      {/* Dim overlay only — no extra backdrop-filter (budget / no nested blur) */}
      <div
        className="fixed inset-0 bg-bg/60 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        className={clsx(
          'fixed inset-y-0 max-w-full flex z-10',
          position === 'left' ? 'left-0' : 'right-0'
        )}
      >
        <div
          className={clsx(
            'w-screen max-w-md glass-g1 flex flex-col',
            position === 'left' ? 'border-r' : 'border-l',
            positionClasses,
            className
          )}
        >
          {/* Header */}
          {!hideHeader && (
            <div className="px-5 py-4 border-b border-border-1/60 flex items-center justify-between">
              {title && (
                <h2 className="text-subheading text-text">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-text-muted hover:text-text glass-g3 transition-colors ml-auto focus:outline-none"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className={clsx('flex-1 overflow-y-auto', bodyClassName ?? 'p-5')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
