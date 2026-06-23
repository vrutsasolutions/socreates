// ─────────────────────────────────────────────────────────────────────────
// Image <-> base64 conversion for sessionStorage persistence.
//
// Raw File objects can't survive a page refresh (sessionStorage only stores
// strings, and object URLs from URL.createObjectURL are invalidated on
// reload). To let an in-progress Add Idea draft survive a refresh, we
// convert each image into a compressed base64 data URL (a plain string)
// before saving, and rebuild a real File from it after restore.
//
// Images are downscaled (max dimension) and re-encoded as JPEG at a
// moderate quality to keep sessionStorage usage well under browser limits
// (~5-10MB per origin) even with several photos in one draft.
// ─────────────────────────────────────────────────────────────────────────

const MAX_DIMENSION = 1280;   // longest side, in px, after resize
const JPEG_QUALITY   = 0.72;  // 0–1

// File -> compressed base64 data URL (downscaled JPEG).
export function fileToCompressedDataURL(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width  = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image for compression'));
    };

    img.src = objectUrl;
  });
}

// Convert an array of Files to compressed data URLs, in original order.
// Skips/falls back gracefully — if one image fails to compress, it's
// dropped from the result rather than failing the whole draft save.
export async function filesToCompressedDataURLs(files) {
  const results = await Promise.all(
    files.map(async (file) => {
      try {
        return await fileToCompressedDataURL(file);
      } catch {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

// base64 data URL -> File, so the rest of the app can keep treating
// `images` as File[] without any changes elsewhere.
export function dataURLToFile(dataURL, filename = 'image.jpg') {
  const [header, base64] = dataURL.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

export function dataURLsToFiles(dataURLs, namePrefix = 'image') {
  return dataURLs.map((url, i) => dataURLToFile(url, `${namePrefix}-${i}.jpg`));
}
