/**
 * ImageEditor.jsx  — SoCreate themed image editor
 * Features: Crop (toggle + drag handles), Rotate ±90, Flip H/V, Reset
 * Optional — Skip returns originals unchanged.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getEditorInput,
  getReturnPath,
  setEditorOutput,
} from "../state/imageEditorStore";

// ─── Icons ─────────────────────────────────────────────────────────────────

const RotateCCWIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const RotateCWIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
);

const FlipHIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

const FlipVIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3" />
    <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

const CropIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M18 22V8a2 2 0 0 0-2-2H2" />
  </svg>
);

const ResetIcon = () => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 4-7.5" />
    <path d="M3 4v5h5" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// Back-chevron icon — matches the circular back button used on every
// other page header (Checkout, GetVerified, Profile, Home, etc.)
const BackIcon = () => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 19l-7-7 7-7" />
  </svg>
);

// ─── Crop overlay ───────────────────────────────────────────────────────────

const HANDLE = 22;
const MIN_SZ = 50;

function CropOverlay({ imgRect, crop, onCropChange }) {
  const startRef = useRef(null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const startDrag = useCallback(
    (corner, e) => {
      e.stopPropagation();
      const cx0 = e.touches ? e.touches[0].clientX : e.clientX;
      const cy0 = e.touches ? e.touches[0].clientY : e.clientY;
      startRef.current = { corner, cx0, cy0, crop: { ...crop } };

      const onMove = (ev) => {
        if (!startRef.current) return;
        const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
        const dx = cx - startRef.current.cx0;
        const dy = cy - startRef.current.cy0;
        const c = { ...startRef.current.crop };

        if (corner === "tl") {
          const nx = clamp(c.x + dx, 0, c.x + c.w - MIN_SZ);
          const ny = clamp(c.y + dy, 0, c.y + c.h - MIN_SZ);
          onCropChange({
            x: nx,
            y: ny,
            w: c.w + (c.x - nx),
            h: c.h + (c.y - ny),
          });
        } else if (corner === "tr") {
          const nw = clamp(c.w + dx, MIN_SZ, imgRect.width - c.x);
          const ny = clamp(c.y + dy, 0, c.y + c.h - MIN_SZ);
          onCropChange({ x: c.x, y: ny, w: nw, h: c.h + (c.y - ny) });
        } else if (corner === "bl") {
          const nx = clamp(c.x + dx, 0, c.x + c.w - MIN_SZ);
          const nh = clamp(c.h + dy, MIN_SZ, imgRect.height - c.y);
          onCropChange({ x: nx, y: c.y, w: c.w + (c.x - nx), h: nh });
        } else {
          const nw = clamp(c.w + dx, MIN_SZ, imgRect.width - c.x);
          const nh = clamp(c.h + dy, MIN_SZ, imgRect.height - c.y);
          onCropChange({ x: c.x, y: c.y, w: nw, h: nh });
        }
      };

      const onUp = () => {
        startRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    },
    [crop, imgRect, onCropChange],
  );

  const { x, y, w, h } = crop;

  const corners = [
    { id: "tl", left: x - HANDLE / 2, top: y - HANDLE / 2 },
    { id: "tr", left: x + w - HANDLE / 2, top: y - HANDLE / 2 },
    { id: "bl", left: x - HANDLE / 2, top: y + h - HANDLE / 2 },
    { id: "br", left: x + w - HANDLE / 2, top: y + h - HANDLE / 2 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: imgRect.width,
        height: imgRect.height,
        pointerEvents: "none",
      }}
    >
      {/* Dimmed area outside crop */}
      <svg
        width={imgRect.width}
        height={imgRect.height}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          <mask id="cmask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={x} y={y} width={w} height={h} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(13,33,55,0.62)"
          mask="url(#cmask)"
        />
        {/* Border */}
        <rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="#1565C0"
          strokeWidth={2}
          strokeDasharray="7 4"
        />
        {/* Rule-of-thirds */}
        {[1, 2].map((n) => (
          <g key={n}>
            <line
              x1={x + (w * n) / 3}
              y1={y}
              x2={x + (w * n) / 3}
              y2={y + h}
              stroke="rgba(21,101,192,0.45)"
              strokeWidth={1}
            />
            <line
              x1={x}
              y1={y + (h * n) / 3}
              x2={x + w}
              y2={y + (h * n) / 3}
              stroke="rgba(21,101,192,0.45)"
              strokeWidth={1}
            />
          </g>
        ))}
      </svg>

      {/* Corner handles */}
      {corners.map(({ id, left, top }) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left,
            top,
            width: HANDLE,
            height: HANDLE,
            pointerEvents: "all",
            cursor: "nwse-resize",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            touchAction: "none",
            zIndex: 10,
          }}
          onMouseDown={(e) => startDrag(id, e)}
          onTouchStart={(e) => startDrag(id, e)}
        >
          <div
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              background: "#1565C0",
              boxShadow: "0 2px 8px rgba(21,101,192,0.5)",
              border: "2.5px solid white",
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Canvas renderer ────────────────────────────────────────────────────────

async function renderEditedImage(
  imgEl,
  edit = {},
  mimeType = "image/jpeg",
  displaySize = null,
) {
  await new Promise((resolve, reject) => {
    if (imgEl.complete && imgEl.naturalWidth) {
      resolve();
      return;
    }
    imgEl.onload = resolve;
    imgEl.onerror = reject;
  });

  const rotation = edit.rotation || 0;
  const flipH = !!edit.flipH;
  const flipV = !!edit.flipV;

  const nw = imgEl.naturalWidth || imgEl.width;
  const nh = imgEl.naturalHeight || imgEl.height;

  const displayW = displaySize?.width || imgEl.clientWidth || nw;
  const displayH = displaySize?.height || imgEl.clientHeight || nh;

  const crop = edit.crop || { x: 0, y: 0, w: displayW, h: displayH };

  const sx = nw / displayW;
  const sy = nh / displayH;

  const cropX = Math.max(0, Math.min(nw, crop.x * sx));
  const cropY = Math.max(0, Math.min(nh, crop.y * sy));
  const cropW = Math.max(1, Math.min(nw - cropX, crop.w * sx));
  const cropH = Math.max(1, Math.min(nh - cropY, crop.h * sy));

  const isOdd = Math.abs(rotation) % 180 !== 0;
  const outW = Math.round(isOdd ? cropH : cropW);
  const outH = Math.round(isOdd ? cropW : cropH);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(
    imgEl,
    cropX,
    cropY,
    cropW,
    cropH,
    -cropW / 2,
    -cropH / 2,
    cropW,
    cropH,
  );
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Image export failed"));
      },
      mimeType,
      0.93,
    );
  });
}

// ─── Tool button ────────────────────────────────────────────────────────────

function ToolBtn({ label, onClick, active, children }) {
  return (
    <button
      onClick={onClick}
      style={{ flexShrink: 0 }}
      className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
    >
      <div
        style={{
          width: 50,
          height: 50,
          // Aligned to the app's rounded-2xl scale (16px) instead of an
          // off-scale 14px, so these tiles match other icon tiles
          // (Profile avatar frame, Premium category icons, etc.)
          borderRadius: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? "#1565C0" : "#F0F6FF",
          color: active ? "#fff" : "#1565C0",
          boxShadow: active ? "0 2px 12px rgba(21,101,192,0.35)" : "none",
          transition: "all 0.18s",
          border: active ? "none" : "1.5px solid #BBDEFB",
        }}
      >
        {children}
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: 0.2,
          color: active ? "#1565C0" : "#546E7A",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ImageEditor() {
  const navigate = useNavigate();
  const files = getEditorInput();
  const returnPath = getReturnPath();

  useEffect(() => {
    if (!files || files.length === 0) navigate(returnPath, { replace: true });
  }, []);

  const [edits, setEdits] = useState(() =>
    (files || []).map(() => ({
      rotation: 0,
      flipH: false,
      flipV: false,
      crop: null,
    })),
  );
  const [current, setCurrent] = useState(0);
  const [previews, setPreviews] = useState([]);
  const [imgRect, setImgRect] = useState(null);
  const [cropActive, setCropActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  // cropConfirmed[i] = true once the user tapped "Apply Crop" for image i
  const [cropConfirmed, setCropConfirmed] = useState(() =>
    (files || []).map(() => false),
  );
  // order[i] = original index of the image now at position i
  const [order, setOrder] = useState(() => (files || []).map((_, i) => i));

  const imgRef = useRef(null);
  const boxRef = useRef(null);
  // drag state for thumbnail reorder
  const dragIdx = useRef(null); // position being dragged
  const dragOver = useRef(null); // position being hovered
  // Tracks every object URL we've ever created (originals + crop swaps)
  // so we can revoke all of them on unmount, even ones created later
  // by handleApplyCrop.
  const allUrlsRef = useRef([]);
  const displaySizesRef = useRef({});

  // Build object URLs once
  useEffect(() => {
    const urls = (files || []).map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    allUrlsRef.current.push(...urls);
    return () => {
      allUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      allUrlsRef.current = [];
    };
  }, []);

  const measureImg = useCallback(() => {
    if (!imgRef.current) return;
    const el = imgRef.current;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;

    displaySizesRef.current[current] = { width: w, height: h };
    setImgRect({ width: w, height: h });
  }, [current]);

  useEffect(() => {
    measureImg();
    window.addEventListener("resize", measureImg);
    return () => window.removeEventListener("resize", measureImg);
  }, [measureImg, current]);

  // Reset crop-active when switching images
  useEffect(() => {
    setCropActive(false);
  }, [current]);

  const edit = edits[current] || {
    rotation: 0,
    flipH: false,
    flipV: false,
    crop: null,
  };

  const updateEdit = (patch) =>
    setEdits((prev) => {
      const next = [...prev];
      next[current] = { ...next[current], ...patch };
      return next;
    });

  const ensureCropForCurrent = () => {
    const size = displaySizesRef.current[current] || imgRect;
    if (!size) return;

    setEdits((prev) => {
      const next = [...prev];
      if (!next[current]?.crop) {
        next[current] = {
          ...next[current],
          crop: { x: 0, y: 0, w: size.width, h: size.height },
        };
      }
      return next;
    });
  };

  const handleRotate = (deg) => {
    const newRot = (((edit.rotation + deg) % 360) + 360) % 360;
    const newCrop = imgRect
      ? { x: 0, y: 0, w: imgRect.width, h: imgRect.height }
      : edit.crop;
    updateEdit({ rotation: newRot, crop: newCrop });
  };

  const handleReset = () => {
    updateEdit({
      rotation: 0,
      flipH: false,
      flipV: false,
      crop: imgRect
        ? { x: 0, y: 0, w: imgRect.width, h: imgRect.height }
        : null,
    });
    setCropActive(false);
    // clear confirmed status for this image on reset
    setCropConfirmed((prev) => {
      const next = [...prev];
      next[current] = false;
      return next;
    });
  };

  // Confirm the crop for the current image: actually render the crop
  // (+ any rotate/flip already applied) to a canvas, swap the preview
  // URL to the cropped result, exit crop mode, and auto-advance to the
  // next unconfirmed image if any.
  const handleApplyCrop = async () => {
    const idx = current;
    const imgEl = imgRef.current;

    try {
      if (imgEl && edit.crop) {
        const blob = await renderEditedImage(
          imgEl,
          edit,
          files[idx].type || "image/jpeg",
          displaySizesRef.current[idx] || imgRect,
        );
        const newUrl = URL.createObjectURL(blob);
        const oldUrl = previews[idx];
        allUrlsRef.current.push(newUrl);

        setPreviews((prev) => {
          const next = [...prev];
          next[idx] = newUrl;
          return next;
        });
        // Release the old object URL only after the browser has had a
        // chance to paint the new <img src>, avoiding a flash/broken
        // image mid-swap.
        if (oldUrl) {
          requestAnimationFrame(() => URL.revokeObjectURL(oldUrl));
        }

        // The crop/rotate/flip are now baked into the new preview image,
        // so reset this image's edit state to identity. The crop box
        // will be re-measured against the new image's dimensions once
        // it loads (see measureImg / onLoad).
        setEdits((prev) => {
          const next = [...prev];
          next[idx] = { rotation: 0, flipH: false, flipV: false, crop: null };
          return next;
        });
      }
    } catch (err) {
      console.error("Apply crop failed:", err);
    }

    setCropConfirmed((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
    setCropActive(false);
    // Find next image in order that hasn't been confirmed yet
    const remaining = order
      .map((origIdx) => origIdx)
      .filter((origIdx) => origIdx !== idx && !cropConfirmed[origIdx]);
    if (remaining.length > 0) {
      setCurrent(remaining[0]);
    }
  };

  const handleDone = async () => {
    setProcessing(true);
    try {
      const out = [];
      // Iterate in the user-defined order
      for (let pos = 0; pos < order.length; pos++) {
        const i = order[pos]; // original index
        const el = document.createElement("img");
        el.src = previews[i];
        await new Promise((res) => {
          el.onload = res;
        });
        el.width = el.naturalWidth;
        el.height = el.naturalHeight;

        const ed = edits[i] || {
          rotation: 0,
          flipH: false,
          flipV: false,
          crop: null,
        };
        const displaySize = displaySizesRef.current[i] || null;

        const blob = await renderEditedImage(
          el,
          ed,
          files[i].type || "image/jpeg",
          displaySize,
        );
        out.push(
          new File([blob], files[i].name, {
            type: files[i].type || "image/jpeg",
          }),
        );
      }
      setEditorOutput(out);
    } catch (err) {
      console.error("ImageEditor error:", err);
      setEditorOutput([...files]);
    } finally {
      setProcessing(false);
      navigate(returnPath + "?edited=1", { replace: true });
    }
  };

  const handleSkip = () => {
    setEditorOutput(null);
    navigate(returnPath, { replace: true });
  };

  if (!files || files.length === 0) return null;

  const imgTransform = [
    `rotate(${edit.rotation}deg)`,
    edit.flipH ? "scaleX(-1)" : "",
    edit.flipV ? "scaleY(-1)" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#F4F7FF",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#1565C0",
          // Aligned to the app's standard header rhythm: pt-4 (16px) base
          // padding plus safe-area inset, instead of a hardcoded 44px that
          // didn't match any other page's spacing scale.
          padding:
            "calc(16px + env(safe-area-inset-top, 0px)) 16px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 2px 12px rgba(21,101,192,0.18)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative rings — every other header in the app (Home, Profile,
            Checkout, GetVerified, AddIdea...) has this pair of faint rings.
            This header was missing them entirely. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: "50%",
              border: "28px solid rgba(255,255,255,0.05)",
              top: -64,
              right: -40,
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 128,
              height: 128,
              borderRadius: "50%",
              border: "22px solid rgba(255,255,255,0.05)",
              bottom: -40,
              left: -32,
            }}
          />
        </div>

        {/* Back / Skip — same circular tap-target sizing (36px) and
            rounded-full shape as the back button used on every other
            header, just with text instead of only a chevron since this
            action is "Skip" not strictly "back". */}
        <button
          onClick={handleSkip}
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            gap: 5,
            color: "rgba(255,255,255,0.92)",
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 12px",
            height: 36,
            borderRadius: 18,
            background: "rgba(255,255,255,0.15)",
            border: "none",
            cursor: "pointer",
          }}
        >
          <BackIcon />
          Skip
        </button>

        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <p
            style={{ color: "#fff", fontWeight: 700, fontSize: 15, margin: 0 }}
          >
            Edit{" "}
            {files.length > 1
              ? `Image ${current + 1}/${files.length}`
              : "Image"}
          </p>
          {cropActive && (
            <p
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
                margin: 0,
              }}
            >
              Drag corners to crop
            </p>
          )}
        </div>

        <button
          onClick={handleDone}
          disabled={processing}
          style={{
            position: "relative",
            zIndex: 1,
            background: processing ? "rgba(255,255,255,0.25)" : "white",
            color: "#1565C0",
            fontWeight: 700,
            fontSize: 13,
            padding: "8px 14px",
            height: 36,
            borderRadius: 18,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
            opacity: processing ? 0.7 : 1,
            transition: "opacity 0.2s",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          }}
        >
          {processing ? (
            <span
              style={{
                width: 15,
                height: 15,
                border: "2px solid #BBDEFB",
                borderTopColor: "#1565C0",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : (
            <CheckIcon />
          )}
          Done
        </button>
      </div>

      {/* ── Image canvas area ───────────────────────────────────────────── */}
      <div
        ref={boxRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          overflow: "hidden",
          position: "relative",
          background: "#F4F7FF",
        }}
      >
        <div
          style={{
            position: "relative",
            // Deliberately NOT display:"flex" here. As a flex container,
            // the <img> below becomes a flex item whose width/height get
            // resolved independently by the flex algorithm (flex-basis:auto
            // + the default cross-axis "stretch"), which can inflate the
            // img's own rendered box beyond its actual visible
            // (letterboxed) picture once object-fit:contain shrinks the
            // content inside it. imgRect / the crop overlay are sized to
            // that box via clientWidth/clientHeight, so the crop selection
            // ends up larger than the photo with a visible gap around it.
            // Plain block layout lets the <img> size itself with the
            // normal CSS2.1 dual max-width/max-height algorithm, which
            // preserves its intrinsic aspect ratio directly — so the
            // rendered box always matches the visible photo exactly.
            maxWidth: "100%",
            maxHeight: "100%",
          }}
        >
          <img
            ref={imgRef}
            key={current}
            src={previews[current]}
            alt={`Image ${current + 1}`}
            onLoad={measureImg}
            draggable={false}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              transform: imgTransform,
              transformOrigin: "center",
              display: "block",
              // Aligned to rounded-2xl (16px) scale used for image tiles
              // elsewhere (IdeaCard covers, PreviewTile in AddIdea, etc.)
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(21,101,192,0.15)",
            }}
          />

          {/* Crop overlay — only shown when crop mode is active */}
          {cropActive && imgRect && edit.crop && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: imgRect.width,
                height: imgRect.height,
                borderRadius: 16,
                overflow: "hidden",
                pointerEvents: "none",
              }}
            >
              <CropOverlay
                imgRect={imgRect}
                crop={edit.crop}
                onCropChange={(c) => updateEdit({ crop: c })}
              />
            </div>
          )}

          {/* Confirmed tick badge on the image */}
          {cropConfirmed[current] && !cropActive && (
            <div
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                background: "#1565C0",
                borderRadius: "50%",
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(21,101,192,0.4)",
                border: "2px solid white",
              }}
            >
              <svg
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )}
        </div>

        {/* ── Apply Crop button — floats above toolbar when crop is active ── */}
        {cropActive && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            {/* Cancel crop */}
            <button
              onClick={() => setCropActive(false)}
              style={{
                background: "white",
                border: "1.5px solid #BBDEFB",
                borderRadius: 24,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                color: "#546E7A",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 2px 12px rgba(21,101,192,0.10)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Cancel
            </button>

            {/* Apply Crop — primary CTA */}
            <button
              onClick={handleApplyCrop}
              style={{
                background: "#1565C0",
                border: "none",
                borderRadius: 24,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                cursor: "pointer",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(21,101,192,0.35)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Apply Crop
              {/* hint: next image exists */}
              {order.filter((idx) => idx !== current).length > 0 && (
                <span
                  style={{
                    background: "rgba(255,255,255,0.25)",
                    borderRadius: 10,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  → Next
                </span>
              )}
            </button>
          </div>
        )}

        {/* Hint badge when crop is inactive */}
        {!cropActive && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(21,101,192,0.09)",
              border: "1px solid #BBDEFB",
              borderRadius: 20,
              padding: "5px 14px",
              fontSize: 11,
              color: "#1565C0",
              fontWeight: 600,
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {cropConfirmed[current] ? (
              <>
                <svg
                  width={11}
                  height={11}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1565C0"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Crop applied · tap Crop to adjust
              </>
            ) : (
              "Tap Crop to trim · editing is optional"
            )}
          </div>
        )}
      </div>

      {/* ── Tool bar ────────────────────────────────────────────────────── */}
      <div
        style={{
          background: "#fff",
          borderTop: "1.5px solid #DBEAFE",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
          flexShrink: 0,
          boxShadow: "0 -4px 20px rgba(21,101,192,0.07)",
        }}
      >
        {/* 5 tools row — horizontally scrollable so nothing gets squished
            or clipped on narrow screens; scrollbar hidden for a clean look
            (see .sc-toolbar-scroll rule injected in the spinner <style> tag
            below the component). */}
        <div
          className="sc-toolbar-scroll"
          style={{
            display: "flex",
            justifyContent: "flex-start",
            gap: 16,
            padding: "14px 20px 4px",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <ToolBtn
            label="Crop"
            active={cropActive}
            onClick={() => {
              ensureCropForCurrent();
              setCropActive((v) => !v);
            }}
          >
            <CropIcon />
          </ToolBtn>

          <ToolBtn label="Rotate ←" onClick={() => handleRotate(-90)}>
            <RotateCCWIcon />
          </ToolBtn>

          <ToolBtn label="Rotate →" onClick={() => handleRotate(90)}>
            <RotateCWIcon />
          </ToolBtn>

          <ToolBtn
            label="Flip H"
            active={edit.flipH}
            onClick={() => updateEdit({ flipH: !edit.flipH })}
          >
            <FlipHIcon />
          </ToolBtn>

          <ToolBtn
            label="Flip V"
            active={edit.flipV}
            onClick={() => updateEdit({ flipV: !edit.flipV })}
          >
            <FlipVIcon />
          </ToolBtn>

          <ToolBtn label="Reset" onClick={handleReset}>
            <ResetIcon />
          </ToolBtn>
        </div>

        {/* Thumbnail strip — drag to reorder */}
        {files.length > 1 && (
          <div>
            <p
              style={{
                textAlign: "center",
                fontSize: 10,
                fontWeight: 700,
                color: "#90A4AE",
                letterSpacing: 1,
                textTransform: "uppercase",
                margin: "10px 0 6px",
              }}
            >
              Hold &amp; drag to reorder
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                padding: "0 16px 16px",
                overflowX: "auto",
              }}
            >
              {order.map((origIdx, pos) => {
                const src = previews[origIdx];
                const isSelected = origIdx === current;
                const isDraggingThis = dragIdx.current === pos;
                return (
                  <div
                    key={origIdx}
                    draggable
                    onDragStart={(e) => {
                      dragIdx.current = pos;
                      e.dataTransfer.effectAllowed = "move";
                      // ghost image
                      try {
                        e.dataTransfer.setDragImage(e.currentTarget, 24, 24);
                        // eslint-disable-next-line no-unused-vars
                      } catch (_) {
                        // ignore failures setting the drag image
                      }
                    }}
                    onDragEnter={() => {
                      dragOver.current = pos;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      dragOver.current = pos;
                    }}
                    onDragEnd={() => {
                      const from = dragIdx.current;
                      const to = dragOver.current;
                      if (from !== null && to !== null && from !== to) {
                        setOrder((prev) => {
                          const next = [...prev];
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          return next;
                        });
                        // keep current pointing to the same original image
                        // (its position may have shifted)
                      }
                      dragIdx.current = null;
                      dragOver.current = null;
                    }}
                    // Touch drag (mobile)
                    onTouchStart={() => {
                      dragIdx.current = pos;
                    }}
                    onTouchMove={(e) => {
                      const touch = e.touches[0];
                      const el = document.elementFromPoint(
                        touch.clientX,
                        touch.clientY,
                      );

                      const idx = el?.closest("[data-pos]")?.dataset?.pos;

                      if (idx !== undefined) {
                        dragOver.current = Number(idx);
                      }
                    }}
                    onTouchEnd={() => {
                      const from = dragIdx.current;
                      const to = dragOver.current;
                      if (from !== null && to !== null && from !== to) {
                        setOrder((prev) => {
                          const next = [...prev];
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          return next;
                        });
                      }
                      dragIdx.current = null;
                      dragOver.current = null;
                    }}
                    data-pos={pos}
                    onClick={() => setCurrent(origIdx)}
                    style={{
                      position: "relative",
                      width: 52,
                      height: 52,
                      // Aligned to rounded-xl (10-14px range used for small
                      // tiles elsewhere); kept close to original 10 since
                      // that already matched the app's --radius-md scale.
                      borderRadius: 10,
                      overflow: "hidden",
                      flexShrink: 0,
                      cursor: "grab",
                      border: isSelected
                        ? "2.5px solid #1565C0"
                        : "2.5px solid #DBEAFE",
                      opacity: isDraggingThis ? 0.4 : isSelected ? 1 : 0.65,
                      boxShadow: isSelected
                        ? "0 0 0 3px rgba(21,101,192,0.2)"
                        : "none",
                      transition: "opacity 0.15s, border-color 0.15s",
                      touchAction: "none",
                    }}
                  >
                    <img
                      src={src}
                      alt={`t${pos}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                      }}
                    />
                    {/* Position badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 3,
                        left: 3,
                        background:
                          pos === 0 ? "#1565C0" : "rgba(13,33,55,0.55)",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 5,
                        lineHeight: "14px",
                        pointerEvents: "none",
                      }}
                    >
                      {pos === 0 ? "Cover" : pos + 1}
                    </div>
                    {/* Crop-confirmed tick */}
                    {cropConfirmed[origIdx] && (
                      <div
                        style={{
                          position: "absolute",
                          top: 3,
                          right: 3,
                          background: "#1565C0",
                          borderRadius: "50%",
                          width: 14,
                          height: 14,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1.5px solid white",
                          pointerEvents: "none",
                        }}
                      >
                        <svg
                          width={8}
                          height={8}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth={3.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    {/* Drag handle dots */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 3,
                        right: 3,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 2,
                        pointerEvents: "none",
                      }}
                    >
                      {[0, 1, 2, 3].map((d) => (
                        <div
                          key={d}
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            background: "rgba(255,255,255,0.8)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Single image spacing */}
        {files.length === 1 && <div style={{ height: 14 }} />}
      </div>

      {/* spinner keyframe */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .sc-toolbar-scroll::-webkit-scrollbar { display: none; }
        .sc-toolbar-scroll { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>
    </div>
  );
}
