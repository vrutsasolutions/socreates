// ════════════════════════════════════════════════════════════════════════
//  useAnchoredPosition
//  Positions a fixed/portaled dropdown panel directly below a trigger
//  element (e.g. a header icon button), keeping it flush against the
//  bottom of that trigger and clamped so it never runs off-screen.
//  Also returns an `arrowRight` offset so a caret can be drawn pointing
//  back at the exact trigger, and keeps everything in sync on resize /
//  scroll (important on mobile, where the browser chrome and sticky
//  headers shift the trigger's position after the panel first opens).
// ════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

const EDGE_MARGIN = 8; // min gap kept between the panel and the screen edge

export default function useAnchoredPosition(open, anchorRef, panelWidth = 320, gap = 8) {
  const [pos, setPos] = useState({ top: 0, right: EDGE_MARGIN, arrowRight: 18 });

  const recalc = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const viewportW = window.innerWidth;

    // Right-align the panel to the trigger's right edge, then clamp so it
    // never overflows either side of the viewport.
    const maxRight = Math.max(EDGE_MARGIN, viewportW - panelWidth - EDGE_MARGIN);
    const right = Math.min(Math.max(viewportW - r.right, EDGE_MARGIN), maxRight);

    // Point the caret at the horizontal center of the trigger, clamped so
    // it stays within the panel's own bounds.
    const panelRightEdgeX = viewportW - right;
    const anchorCenterX = r.left + r.width / 2;
    const arrowRight = Math.min(Math.max(panelRightEdgeX - anchorCenterX, 16), panelWidth - 16);

    setPos({ top: r.bottom + gap, right, arrowRight });
  }, [anchorRef, panelWidth, gap]);

  // Compute synchronously before paint so the panel never flashes in the
  // wrong spot when it first opens.
  useLayoutEffect(() => {
    if (open) recalc();
  }, [open, recalc]);

  // Keep it anchored if the layout shifts while it's open (address bar
  // show/hide, orientation change, sticky header settling, etc.)
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', recalc, true);
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', recalc, true);
    };
  }, [open, recalc]);

  return pos;
}
