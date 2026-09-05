"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

export function useBreakpoint(): {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  currentBreakpoint: "mobile" | "tablet" | "desktop" | "large-desktop";
} {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  const isDesktop = useMediaQuery("(min-width: 1024px) and (max-width: 1535px)");
  const isLargeDesktop = useMediaQuery("(min-width: 1536px)");

  const currentBreakpoint = isLargeDesktop
    ? "large-desktop"
    : isDesktop
      ? "desktop"
      : isTablet
        ? "tablet"
        : "mobile";

  return { isMobile, isTablet, isDesktop, isLargeDesktop, currentBreakpoint };
}

export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export function usePrefersColorScheme(): "light" | "dark" | "no-preference" {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const prefersLight = useMediaQuery("(prefers-color-scheme: light)");

  if (prefersDark) return "dark";
  if (prefersLight) return "light";
  return "no-preference";
}

export function useOrientation(): {
  angle: number;
  type: "portrait" | "landscape";
} {
  const [orientation, setOrientation] = useState(() => {
    if (typeof window === "undefined") return { angle: 0, type: "landscape" as const };
    const o = window.screen.orientation;
    return {
      angle: o.angle,
      type: o.type.includes("portrait") ? "portrait" : "landscape",
    };
  });

  useEffect(() => {
    const handleChange = () => {
      const o = window.screen.orientation;
      setOrientation({
        angle: o.angle,
        type: o.type.includes("portrait") ? "portrait" : "landscape",
      });
    };

    window.screen.orientation.addEventListener("change", handleChange);
    return () => window.screen.orientation.removeEventListener("change", handleChange);
  }, []);

  return orientation;
}

export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return { width: 0, height: 0 };
    return { width: window.innerWidth, height: window.innerHeight };
  });

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight });
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return size;
}

export function useScrollPosition(): { x: number; y: number } {
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    return { x: window.scrollX, y: window.scrollY };
  });

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setPosition({ x: window.scrollX, y: window.scrollY });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return position;
}

export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefCallback<Element>, IntersectionObserverEntry | null] {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback((node: Element | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (node) {
      observerRef.current = new IntersectionObserver(([e]) => {
        setEntry(e);
      }, options);
      observerRef.current.observe(node);
    }
  }, [options]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return [ref, entry];
}
