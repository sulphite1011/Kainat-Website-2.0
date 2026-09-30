import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Upload, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface LogoCropperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoUpdated: (newLogoUrl: string) => void;
}

const STAGE_SIZE = 320;
const CROP_SIZE = 260; // 260px diameter circle
const CROP_RADIUS = CROP_SIZE / 2;
const CENTER = STAGE_SIZE / 2;

export const LogoCropperModal: React.FC<LogoCropperModalProps> = ({ isOpen, onClose, onLogoUpdated }) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Transformations
  const [zoom, setZoom] = useState<number>(1.0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState<number>(1.0);

  // Interaction tracking
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      showToast('Please select a PNG, JPG, WEBP, or SVG file.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      setImageSrc(src);

      const img = new Image();
      img.onload = () => {
        setImageObj(img);
        // Initially fit correctly: entire image comfortably fits inside crop circle
        const scale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
        setBaseScale(scale);
        setZoom(1.0);
        setOffset({ x: 0, y: 0 });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Reset to initial fitted state
  const handleReset = () => {
    setZoom(1.0);
    setOffset({ x: 0, y: 0 });
  };

  // Draw main stage canvas and live circular preview
  const drawCanvases = useCallback(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!canvas || !imageObj) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentScale = baseScale * zoom;
    const drawW = imageObj.naturalWidth * currentScale;
    const drawH = imageObj.naturalHeight * currentScale;
    const drawX = CENTER + offset.x - drawW / 2;
    const drawY = CENTER + offset.y - drawH / 2;

    // Clear stage
    ctx.clearRect(0, 0, STAGE_SIZE, STAGE_SIZE);

    // Draw background
    ctx.fillStyle = '#05080f';
    ctx.fillRect(0, 0, STAGE_SIZE, STAGE_SIZE);

    // Draw the scaled and translated image
    ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);

    // Draw circular mask overlay (darkened outside, dashed circle border)
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 15, 0.72)';
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_SIZE, STAGE_SIZE);
    ctx.arc(CENTER, CENTER, CROP_RADIUS, 0, Math.PI * 2, true);
    ctx.fill();

    // Circle border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, CROP_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Live Circular Preview (72x72)
    if (previewCanvas) {
      const pCtx = previewCanvas.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, 72, 72);
        pCtx.save();
        pCtx.beginPath();
        pCtx.arc(36, 36, 36, 0, Math.PI * 2);
        pCtx.clip();

        const previewScaleRatio = 72 / CROP_SIZE;
        const pDrawW = drawW * previewScaleRatio;
        const pDrawH = drawH * previewScaleRatio;
        const pDrawX = 36 + offset.x * previewScaleRatio - pDrawW / 2;
        const pDrawY = 36 + offset.y * previewScaleRatio - pDrawH / 2;

        pCtx.drawImage(imageObj, pDrawX, pDrawY, pDrawW, pDrawH);
        pCtx.restore();
      }
    }
  }, [imageObj, baseScale, zoom, offset]);

  useEffect(() => {
    drawCanvases();
  }, [drawCanvases]);

  // Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(4.5, Math.max(0.5, prev + delta)));
  };

  // Touch Handlers for Drag & Pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const dx = e.touches[0].clientX - lastMousePosRef.current.x;
      const dy = e.touches[0].clientY - lastMousePosRef.current.y;
      lastMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartDistRef.current;
      const newZoom = Math.min(4.5, Math.max(0.5, pinchStartZoomRef.current * ratio));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    pinchStartDistRef.current = null;
  };

  // Save & Upload the exact circular crop
  const handleSaveCrop = async () => {
    if (!imageObj) return;

    try {
      setIsSaving(true);

      // Create high-res 512x512 canvas for export
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 512;
      exportCanvas.height = 512;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      // Clip to full circle
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.clip();

      // Precise math: map the visible crop area directly to the 512x512 export canvas
      const exportRatio = 512 / CROP_SIZE;
      const currentScale = baseScale * zoom;
      const drawW = imageObj.naturalWidth * currentScale * exportRatio;
      const drawH = imageObj.naturalHeight * currentScale * exportRatio;
      const drawX = 256 + offset.x * exportRatio - drawW / 2;
      const drawY = 256 + offset.y * exportRatio - drawH / 2;

      ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);

      // Convert to blob
      exportCanvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Failed to export cropped image.', 'error');
          setIsSaving(false);
          return;
        }

        const formData = new FormData();
        formData.append('logo', blob, 'kainat_logo.png');

        try {
          const res = await api.uploadLogo(formData);
          if (res.success && res.logoUrl) {
            showToast('Logo updated and published successfully!', 'success');
            onLogoUpdated(res.logoUrl);
            onClose();
          } else {
            showToast('Failed to save logo on server', 'error');
          }
        } catch (err: any) {
          showToast(err.message || 'Server upload failed', 'error');
        } finally {
          setIsSaving(false);
        }
      }, 'image/png');
    } catch (err: any) {
      showToast(err.message || 'Error processing crop', 'error');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Circular Logo</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: 'center' }}>
          {!imageSrc ? (
            <div
              style={{
                padding: '40px 20px',
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: 'var(--bg-tertiary)',
                cursor: 'pointer',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={40} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Select New Logo Image</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                PNG, JPG, WEBP, or SVG (Up to 5MB)
              </div>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Drag with mouse/finger to center. Scroll or pinch to zoom.
              </p>

              {/* Stage Canvas */}
              <div className="cropper-stage">
                <canvas
                  ref={canvasRef}
                  width={STAGE_SIZE}
                  height={STAGE_SIZE}
                  className="cropper-canvas"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </div>

              {/* Controls bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
                  title="Zoom Out"
                >
                  <ZoomOut size={16} /> Zoom Out
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleReset}
                  title="Reset to Fit"
                >
                  <RotateCcw size={16} /> Fit
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setZoom((z) => Math.min(4.5, z + 0.15))}
                  title="Zoom In"
                >
                  <ZoomIn size={16} /> Zoom In
                </button>
              </div>

              {/* Live Preview & Change button */}
              <div className="cropper-preview-row">
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    LIVE PREVIEW
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Exact look on header & cards
                  </div>
                </div>
                <div className="cropper-preview-circle">
                  <canvas ref={previewCanvasRef} width={72} height={72} />
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Different
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveCrop}
            disabled={!imageSrc || isSaving}
          >
            {isSaving ? 'Saving & Publishing...' : (
              <>
                <Check size={16} /> Save Circular Logo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
