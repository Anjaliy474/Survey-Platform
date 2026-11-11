"use client";

import qrcode from "qrcode-generator";
import { useMemo } from "react";

const QUIET = 4; // modules of white border, as the QR spec asks

function matrix(text: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** QR code for the survey link: an SVG on screen, a crisp PNG to download (DESIGN.md §6.11). */
export function QrCard({ url, fileName }: { url: string; fileName: string }) {
  const cells = useMemo(() => (url ? matrix(url) : []), [url]);
  const n = cells.length;
  const size = n + QUIET * 2;
  const path = useMemo(
    () =>
      cells
        .flatMap((row, r) => row.map((dark, c) => (dark ? `M${c + QUIET} ${r + QUIET}h1v1h-1z` : "")))
        .join(""),
    [cells],
  );

  function download() {
    const scale = 12;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#22192e";
    cells.forEach((row, r) => row.forEach((dark, c) => dark && ctx.fillRect((c + QUIET) * scale, (r + QUIET) * scale, scale, scale)));
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  }

  return (
    <div className="qrcard">
      {n > 0 ? (
        <svg className="qrcard__code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR code for the survey link" shapeRendering="crispEdges">
          <rect width={size} height={size} fill="#ffffff" />
          <path d={path} fill="#22192e" />
        </svg>
      ) : (
        <span className="skeleton qrcard__code" aria-hidden="true" />
      )}
      <div className="qrcard__text">
        <strong>Print it or put it on a slide</strong>
        <span>People scan it with their phone camera to open the survey.</span>
        <button type="button" className="btn btn--sm btn--secondary" onClick={download} disabled={n === 0}>
          Download QR (PNG)
        </button>
      </div>
    </div>
  );
}
