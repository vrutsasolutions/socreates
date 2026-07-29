// ════════════════════════════════════════════════════════════════════════
//  backOverlayStack
//  ----------------------------------------------------------------------
//  A plain in-memory stack of "close me" callbacks for anything that opens
//  on top of a page without changing the route — share popovers, bottom
//  sheets, the image editor overlay, confirm dialogs, etc.
//
//  useAppBackButton (src/hooks/useAppBackButton.js) checks this stack
//  FIRST, before it touches router history or double-press-to-exit. So:
//  open modal → back button/gesture closes the modal → next back press
//  goes back a screen → next one exits (with the confirm toast), same as
//  a normal native Android app.
//
//  Usage in a modal/popover component:
//
//    import { useEffect } from 'react';
//    import { pushBackHandler } from '../../utils/backOverlayStack';
//
//    useEffect(() => {
//      if (!open) return;
//      return pushBackHandler(() => setOpen(false));
//    }, [open]);
//
//  That's it — pushBackHandler returns the cleanup function, so React's
//  effect cleanup pops it automatically when `open` becomes false or the
//  component unmounts. No need to call anything else.
// ════════════════════════════════════════════════════════════════════════

const stack = [];

// Registers `onClose` as the thing to run if the back button/gesture fires
// while this overlay is the top-most one open. Returns an unregister
// function — call it (or just let the effect cleanup call it) when the
// overlay closes for any other reason (e.g. the user tapped "copy link").
export function pushBackHandler(onClose) {
  const entry = { onClose };
  stack.push(entry);
  return () => {
    const i = stack.indexOf(entry);
    if (i !== -1) stack.splice(i, 1);
  };
}

// Called by useAppBackButton. If something is open, closes the top-most
// one and reports true (handled). If nothing is open, reports false so
// the caller falls through to normal back navigation.
export function consumeBack() {
  if (stack.length === 0) return false;
  const top = stack[stack.length - 1];
  stack.splice(stack.length - 1, 1);
  top.onClose();
  return true;
}

export function hasOpenOverlay() {
  return stack.length > 0;
}