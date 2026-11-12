// ---
// Summary:
// - Purpose: Floating action button group for quick jump to document top and bottom
// - Role: Navigation helper component
// - Depends on: React
// - Key Responsibilities: Provide one-tap smooth scroll to page top (0) and document bottom
// - Notes: Anchored above mobile sticky action bar and responsive to scrollable document height
// ---

import React, { useEffect, useState } from 'react';

export const ScrollButtons: React.FC = () => {
  const [isScrollable, setIsScrollable] = useState(false);

  useEffect(() => {
    const checkScrollable = () => {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight + 80;
      setIsScrollable(scrollable);
    };

    checkScrollable();
    window.addEventListener('scroll', checkScrollable, { passive: true });
    window.addEventListener('resize', checkScrollable);
    return () => {
      window.removeEventListener('scroll', checkScrollable);
      window.removeEventListener('resize', checkScrollable);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  if (!isScrollable) return null;

  return (
    <div
      className="fixed right-2 sm:right-4 bottom-16 md:bottom-6 z-40 flex flex-col gap-1.5"
      role="region"
      aria-label="Navigasi Halaman Cepat"
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Gulir ke atas"
        title="Gulir ke paling atas"
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white flex items-center justify-center border border-black shadow-md transition-all hover:scale-105 active:scale-95"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={scrollToBottom}
        aria-label="Gulir ke bawah"
        title="Gulir ke paling bawah"
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-white flex items-center justify-center border border-black shadow-md transition-all hover:scale-105 active:scale-95"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
};