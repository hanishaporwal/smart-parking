import React, { useEffect, useState, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { Drawer } from '@/components/Drawer';
import { AmbientLayer } from '@/components/AmbientLayer';
import { initSimulationLoop } from '@/store';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'smart_parking_sidebar_collapsed';

export const AppShell: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Desktop sidebar collapse state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Sync collapse state with localStorage (desktop only)
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  // Keyboard shortcut: Cmd/Ctrl + B toggles desktop sidebar (ignores input focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        const active = document.activeElement;
        const isInput =
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement ||
          (active as HTMLElement | null)?.isContentEditable;

        if (!isInput) {
          e.preventDefault();
          setIsCollapsed(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize and drive the simulation engine loop
  useEffect(() => {
    const cleanup = initSimulationLoop();
    return cleanup;
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => !prev);
  };

  const handleExpandAndOpenSensorLab = () => {
    setIsCollapsed(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text font-ui">
      <AmbientLayer />
      {/* Desktop Sidebar (Full Height, 1024px+ / lg breakpoint) */}
      <div
        className={clsx(
          'hidden lg:flex h-full shrink-0 relative z-20',
          shouldReduceMotion
            ? 'transition-none'
            : 'transition-[width] duration-100 ease-out',
          isCollapsed ? 'w-[72px]' : 'w-[280px]'
        )}
      >
        <Sidebar
          isCollapsed={isCollapsed}
          onExpandAndOpenSensorLab={handleExpandAndOpenSensorLab}
          className="w-full"
        />

        {/* Edge Toggle Handle: vertical centre of right edge, sits on the seam between sidebar and content */}
        <motion.button
          id="sidebar-collapse-toggle"
          type="button"
          onClick={handleToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          aria-controls="sidebar-navigation"
          title={isCollapsed ? 'Expand sidebar (⌘B)' : 'Collapse sidebar (⌘B)'}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.15 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.90 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className={clsx(
            '!absolute top-1/2 -translate-y-1/2 -right-3.5 z-30 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-200 focus-visible:outline-none cursor-pointer group',
            isCollapsed
              ? 'glass-g3 glass-tint-gold glass-rim-gold text-gold shadow-[0_0_14px_rgba(224,168,75,0.4)]'
              : 'glass-g3 text-text-3 hover:text-gold shadow-glass-g3 hover:shadow-[0_0_12px_rgba(224,168,75,0.25)]'
          )}
        >
          {/* Subtle pulsating halo ring when collapsed to guide expansion */}
          {isCollapsed && (
            <span
              className="absolute inset-0 rounded-full bg-gold/20 animate-ping pointer-events-none motion-reduce:hidden"
              style={{ animationDuration: '3s' }}
            />
          )}

          {/* Smooth rotating chevron with spring physics (0deg pointing left when open, 180deg pointing right when collapsed) */}
          <motion.div
            animate={{ rotate: isCollapsed ? 180 : 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 420, damping: 24 }
            }
            className="flex items-center justify-center shrink-0"
          >
            <ChevronLeft
              className={clsx(
                'w-3.5 h-3.5 transition-colors duration-150',
                isCollapsed ? 'text-gold' : 'text-text-3 group-hover:text-gold'
              )}
            />
          </motion.div>
        </motion.button>
      </div>

      {/* Mobile Drawer Sidebar (< 1024px) */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        position="left"
        hideHeader
        bodyClassName="p-0 overflow-hidden h-full flex flex-col"
        className="w-[280px] max-w-[85vw] p-0 glass-g1"
        triggerRef={menuButtonRef}
      >
        <div className="relative h-full flex flex-col">
          {/* Close button in mobile drawer */}
          <motion.button
            whileHover={shouldReduceMotion ? undefined : { scale: 1.12, rotate: 90 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-3 z-30 p-1.5 rounded-full glass-g3 text-text-muted hover:text-text focus:outline-none transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </motion.button>
          <Sidebar
            isMobile
            onNavClick={() => setMobileMenuOpen(false)}
            className="w-full border-r-0"
          />
        </div>
      </Drawer>

      {/* Main Content Area (Takes all remaining width, no horizontal scroll) */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
        {/* Mobile Menu Trigger (< 1024px) */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden absolute top-3 left-3 z-30 p-2.5 rounded-full glass-g3 text-text-2 hover:text-text active:scale-[0.96] transition-colors focus:outline-none"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-8 sm:px-6 sm:pt-6 sm:pb-8 lg:px-8 lg:pt-6 lg:pb-8 bg-transparent">
          <div className="max-w-[1440px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
