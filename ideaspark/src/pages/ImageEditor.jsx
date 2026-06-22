/**
 * ImageEditor.jsx  — SoCreates themed image editor
 * Features: Crop (toggle + drag handles), Rotate ±90, Flip H/V, Reset
 * Optional — Skip returns originals unchanged.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getEditorInput,
  getReturnPath,
  setEditorOutput,
} from '../state/imageEditorStore';

// ─── Icons ─────────────────────────────────────────────────────────────────

const RotateCCWIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const RotateCWIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
  </svg>
);

const FlipHIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/>
    <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
    <line x1="12" y1="3" x2="12" y2="21"/>
  </svg>
);

const FlipVIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/>
    <path d="M21 16v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
  </svg>
);

const CropIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2v14a2 2 0 0 0 2 2h14"/>
    <path d="M18 22V8a2 2 0 0 0-2-2H2"/>
  </svg>
);

const ResetIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 4-7.5"/>
    <path d="M3 4v5h5"/>
  </svg>
);

const CheckIcon = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Crop overlay ───────────────────────────────────────────────────────────

const HANDLE = 22;
const MIN_SZ = 50;

function CropOverlay({ imgRect, crop, onCropChange }) {
  const startRef = useRef(null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const startDrag = useCallback((corner, e) => {
    e.preventDefault();
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
      const c  = { ...startRef.current.crop };

      if (corner === 'tl') {
        const nx = clamp(c.x + dx, 0, c.x + c.w - MIN_SZ);
        const ny = clamp(c.y + dy, 0, c.y + c.h - MIN_SZ);
        onCropChange({ x: nx, y: ny, w: c.w + (c.x - nx), h: c.h + (c.y - ny) });
      } else if (corner === 'tr') {
        const nw = clamp(c.w + dx, MIN_SZ, imgRect.width - c.x);
        const ny = clamp(c.y + dy, 0, c.y + c.h - MIN_SZ);
        onCropChange({ x: c.x, y: ny, w: nw, h: c.h + (c.y - ny) });
      } else if (corner === 'bl') {
        const nx = clamp(c.x + dx, 0, c.x + c.w - MIN_SZ);
        const nh = clamp(c.h + dy, MIN_SZ, imgRect.height - c.y);
        onCropChange({ x: nx, y: c.y, w: c.w + (c.x - nx), h: nh });
      } else {
        const nw = clamp(c.w + dx, MIN_SZ, imgRect.width  - c.x);
        const nh = clamp(c.h + dy, MIN_SZ, imgRect.height - c.y);
        onCropChange({ x: c.x, y: c.y, w: nw, h: nh });
      }
    };

    const onUp = () => {
      startRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend',  onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend',  onUp);
  }, [crop, imgRect, onCropChange]);

  const { x, y, w, h } = crop;

  const corners = [
    { id: 'tl', left: x - HANDLE / 2,     top: y - HANDLE / 2 },
    { id: 'tr', left: x + w - HANDLE / 2, top: y - HANDLE / 2 },
    { id: 'bl', left: x - HANDLE / 2,     top: y + h - HANDLE / 2 },
    { id: 'br', left: x + w - HANDLE / 2, top: y + h - HANDLE / 2 },
  ];

  return (
    <div style={{ position: 'absolute', top: 0, left: 0,
                  width: imgRect.width, height: imgRect.height,
                  pointerEvents: 'none' }}>

      {/* Dimmed area outside crop */}
      <svg width={imgRect.width} height={imgRect.height}
           style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <mask id="cmask">
            <rect width="100%" height="100%" fill="white"/>
            <rect x={x} y={y} width={w} height={h} fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(13,33,55,0.62)" mask="url(#cmask)"/>
        {/* Border */}
        <rect x={x} y={y} width={w} height={h}
              fill="none" stroke="#1565C0" strokeWidth={2} strokeDasharray="7 4"/>
        {/* Rule-of-thirds */}
        {[1,2].map(n => (
          <g key={n}>
            <line x1={x + w*n/3} y1={y} x2={x + w*n/3} y2={y+h}
                  stroke="rgba(21,101,192,0.45)" strokeWidth={1}/>
            <line x1={x} y1={y + h*n/3} x2={x+w} y2={y + h*n/3}
                  stroke="rgba(21,101,192,0.45)" strokeWidth={1}/>
          </g>
        ))}
      </svg>

      {/* Corner handles */}
      {corners.map(({ id, left, top }) => (
        <div key={id}
          style={{
            position: 'absolute', left, top,
            width: HANDLE, height: HANDLE,
            pointerEvents: 'all',
            cursor: 'nwse-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'none',
            zIndex: 10,
          }}
          onMouseDown={(e) => startDrag(id, e)}
          onTouchStart={(e) => startDrag(id, e)}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 4,
            background: '#1565C0',
            boxShadow: '0 2px 8px rgba(21,101,192,0.5)',
            border: '2.5px solid white',
          }}/>
        </div>
      ))}
    </div>
  );
}

// ─── Canvas renderer ────────────────────────────────────────────────────────

async function renderEditedImage(imgEl, edit, mimeType = 'image/jpeg') {
  const { rotation, flipH, flipV, crop } = edit;
  const nw = imgEl.naturalWidth;
  const nh = imgEl.naturalHeight;
  const displayW = imgEl.clientWidth  || nw;
  const displayH = imgEl.clientHeight || nh;
  const sx = nw / displayW;
  const sy = nh / displayH;

  const cropX = (crop?.x || 0) * sx;
  const cropY = (crop?.y || 0) * sy;
  const cropW = (crop?.w || displayW) * sx;
  const cropH = (crop?.h || displayH) * sy;

  const isOdd = Math.abs(rotation) % 180 !== 0;
  const outW  = isOdd ? cropH : cropW;
  const outH  = isOdd ? cropW : cropH;

  const canvas = document.createElement('canvas');
  canvas.width  = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(imgEl, cropX, cropY, cropW, cropH, -cropW/2, -cropH/2, cropW, cropH);
  ctx.restore();

  return new Promise((res, rej) =>
    canvas.toBlob((b) => b ? res(b) : rej(new Error('toBlob failed')), mimeType, 0.93)
  );
}

// ─── Tool button ────────────────────────────────────────────────────────────

function ToolBtn({ label, onClick, active, children }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform"
    >
      <div style={{
        width: 50, height: 50,
        borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? '#1565C0' : '#EEF4FF',
        color:      active ? '#fff'     : '#1565C0',
        boxShadow: active ? '0 2px 12px rgba(21,101,192,0.35)' : 'none',
        transition: 'all 0.18s',
        border: active ? 'none' : '1.5px solid #BBDEFB',
      }}>
        {children}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: 0.2,
        color: active ? '#1565C0' : '#546E7A',
      }}>
        {label}
      </span>
    </button>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ImageEditor() {
  const navigate   = useNavigate();
  const files      = getEditorInput();
  const returnPath = getReturnPath();

  useEffect(() => {
    if (!files || files.length === 0) navigate(returnPath, { replace: true });
  }, []);

  const [edits, setEdits] = useState(() =>
    (files || []).map(() => ({ rotation: 0, flipH: false, flipV: false, crop: null }))
  );
  const [current,    setCurrent]    = useState(0);
  const [previews,   setPreviews]   = useState([]);
  const [imgRect,    setImgRect]    = useState(null);
  const [cropActive, setCropActive] = useState(false); // toggle crop mode
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef(null);
  const boxRef = useRef(null);

  // Build object URLs once
  useEffect(() => {
    const urls = (files || []).map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const measureImg = useCallback(() => {
    if (!imgRef.current) return;
    const el = imgRef.current;
    const w  = el.clientWidth;
    const h  = el.clientHeight;
    if (!w || !h) return;
    setImgRect({ width: w, height: h });
    setEdits((prev) => {
      const next = [...prev];
      if (!next[current]?.crop) {
        next[current] = { ...next[current], crop: { x: 0, y: 0, w, h } };
      }
      return next;
    });
  }, [current]);

  useEffect(() => {
    measureImg();
    window.addEventListener('resize', measureImg);
    return () => window.removeEventListener('resize', measureImg);
  }, [measureImg, current]);

  // Reset crop-active when switching images
  useEffect(() => { setCropActive(false); }, [current]);

  const edit = edits[current] || { rotation: 0, flipH: false, flipV: false, crop: null };

  const updateEdit = (patch) => setEdits((prev) => {
    const next = [...prev];
    next[current] = { ...next[current], ...patch };
    return next;
  });

  const handleRotate = (deg) => {
    const newRot = ((edit.rotation + deg) % 360 + 360) % 360;
    const newCrop = imgRect ? { x: 0, y: 0, w: imgRect.width, h: imgRect.height } : edit.crop;
    updateEdit({ rotation: newRot, crop: newCrop });
  };

  const handleReset = () => {
    updateEdit({
      rotation: 0, flipH: false, flipV: false,
      crop: imgRect ? { x: 0, y: 0, w: imgRect.width, h: imgRect.height } : null,
    });
    setCropActive(false);
  };

  const handleDone = async () => {
    setProcessing(true);
    try {
      const out = [];
      for (let i = 0; i < files.length; i++) {
        const el  = document.createElement('img');
        el.src    = previews[i];
        await new Promise((res) => { el.onload = res; });
        el.width  = el.naturalWidth;
        el.height = el.naturalHeight;

        const displayW = imgRef.current?.clientWidth  || el.naturalWidth;
        const displayH = imgRef.current?.clientHeight || el.naturalHeight;
        const ed       = edits[i];
        const crop     = ed.crop || { x: 0, y: 0, w: displayW, h: displayH };

        const blob    = await renderEditedImage(el, { ...ed, crop }, files[i].type || 'image/jpeg');
        out.push(new File([blob], files[i].name, { type: files[i].type || 'image/jpeg' }));
      }
      setEditorOutput(out);
    } catch (err) {
      console.error('ImageEditor error:', err);
      setEditorOutput([...files]);
    } finally {
      setProcessing(false);
      navigate(returnPath + '?edited=1', { replace: true });
    }
  };

  const handleSkip = () => {
    setEditorOutput(null);
    navigate(returnPath, { replace: true });
  };

  if (!files || files.length === 0) return null;

  const imgTransform = [
    `rotate(${edit.rotation}deg)`,
    edit.flipH ? 'scaleX(-1)' : '',
    edit.flipV ? 'scaleY(-1)' : '',
  ].filter(Boolean).join(' ');

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: '#F4F7FF',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none', WebkitUserSelect: 'none',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#1565C0',
        padding: '44px 16px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(21,101,192,0.18)',
      }}>
        <button onClick={handleSkip} style={{
          color: 'rgba(255,255,255,0.82)', fontSize: 14, fontWeight: 600,
          padding: '6px 4px', background: 'none', border: 'none', cursor: 'pointer',
        }}>
          Skip
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>
            Edit {files.length > 1 ? `Image ${current + 1}/${files.length}` : 'Image'}
          </p>
          {cropActive && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: 0 }}>
              Drag corners to crop
            </p>
          )}
        </div>

        <button onClick={handleDone} disabled={processing} style={{
          background: processing ? 'rgba(255,255,255,0.25)' : 'white',
          color: '#1565C0', fontWeight: 700, fontSize: 13,
          padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          opacity: processing ? 0.7 : 1,
          transition: 'opacity 0.2s',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        }}>
          {processing
            ? <span style={{
                width: 15, height: 15, border: '2px solid #BBDEFB',
                borderTopColor: '#1565C0', borderRadius: '50%',
                display: 'inline-block', animation: 'spin 0.7s linear infinite',
              }}/>
            : <CheckIcon />
          }
          Done
        </button>
      </div>

      {/* ── Image canvas area ───────────────────────────────────────────── */}
      <div ref={boxRef} style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', overflow: 'hidden', position: 'relative',
        background: '#EEF4FF',
      }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            ref={imgRef}
            key={current}
            src={previews[current]}
            alt={`Image ${current + 1}`}
            onLoad={measureImg}
            draggable={false}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 280px)',
              objectFit: 'contain',
              transform: imgTransform,
              transformOrigin: 'center',
              display: 'block',
              borderRadius: 12,
              boxShadow: '0 4px 24px rgba(21,101,192,0.15)',
            }}
          />

          {/* Crop overlay — only shown when crop mode is active */}
          {cropActive && imgRect && edit.crop && (
            <div style={{
              position: 'absolute', top: 0, left: 0,
              width: imgRect.width, height: imgRect.height,
              borderRadius: 12, overflow: 'hidden',
              pointerEvents: 'none',
            }}>
              <CropOverlay
                imgRect={imgRect}
                crop={edit.crop}
                onCropChange={(c) => updateEdit({ crop: c })}
              />
            </div>
          )}
        </div>

        {/* Crop hint badge when inactive */}
        {!cropActive && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(21,101,192,0.10)',
            border: '1px solid #BBDEFB',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, color: '#1565C0', fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            Tap Crop to trim · editing is optional
          </div>
        )}
      </div>

      {/* ── Tool bar ────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        borderTop: '1.5px solid #EEF4FF',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        flexShrink: 0,
        boxShadow: '0 -2px 12px rgba(21,101,192,0.07)',
      }}>

        {/* 5 tools row */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 16, padding: '14px 20px 4px',
        }}>
          <ToolBtn label="Crop" active={cropActive}
            onClick={() => setCropActive((v) => !v)}>
            <CropIcon />
          </ToolBtn>

          <ToolBtn label="Rotate ←" onClick={() => handleRotate(-90)}>
            <RotateCCWIcon />
          </ToolBtn>

          <ToolBtn label="Rotate →" onClick={() => handleRotate(90)}>
            <RotateCWIcon />
          </ToolBtn>

          <ToolBtn label="Flip H" active={edit.flipH}
            onClick={() => updateEdit({ flipH: !edit.flipH })}>
            <FlipHIcon />
          </ToolBtn>

          <ToolBtn label="Flip V" active={edit.flipV}
            onClick={() => updateEdit({ flipV: !edit.flipV })}>
            <FlipVIcon />
          </ToolBtn>

          <ToolBtn label="Reset" onClick={handleReset}>
            <ResetIcon />
          </ToolBtn>
        </div>

        {/* Thumbnail strip */}
        {files.length > 1 && (
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center',
            padding: '10px 16px 14px', overflowX: 'auto',
          }}>
            {previews.map((src, i) => (
              <button key={i} onClick={() => setCurrent(i)} style={{
                width: 48, height: 48, borderRadius: 10, overflow: 'hidden',
                border: i === current ? '2.5px solid #1565C0' : '2.5px solid #EEF4FF',
                flexShrink: 0, opacity: i === current ? 1 : 0.5,
                transition: 'all 0.18s', padding: 0, cursor: 'pointer',
                boxShadow: i === current ? '0 0 0 2px rgba(21,101,192,0.25)' : 'none',
              }}>
                <img src={src} alt={`t${i}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
              </button>
            ))}
          </div>
        )}

        {/* Single image spacing */}
        {files.length === 1 && <div style={{ height: 14 }}/>}
      </div>

      {/* spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
