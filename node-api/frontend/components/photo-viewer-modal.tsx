'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, ZoomIn, ZoomOut, Download, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/api-client';

interface PhotoViewerModalProps {
  isOpen: boolean;
  confidence?: number;
  photoId?: string;
  onClose: () => void;
  onDownload: () => void;
}

export function PhotoViewerModal({ isOpen, confidence = 0.95, photoId, onClose, onDownload }: PhotoViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imageUrl = photoId ? getImageUrl(photoId) : '';

  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setIsLoading(true);
      setImageError(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in' && zoom < 200) {
      setZoom(zoom + 20);
    } else if (direction === 'out' && zoom > 50) {
      setZoom(zoom - 20);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      {/* Modal Container */}
      <div className="bg-card rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Photo Viewer</h2>
            {confidence && (
              <span className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                 {(confidence * 100).toFixed(2)}% Match
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center bg-background overflow-auto">
          {isLoading && (
            <Loader2 size={48} className="text-primary animate-spin" />
          )}
          {imageError ? (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-muted-foreground">Failed to load image</p>
            </div>
          ) : photoId && imageUrl ? (
            <div className="flex items-center justify-center" style={{ transform: `scale(${zoom / 100})` }}>
              <Image
                src={imageUrl}
                alt="Full photo view"
                width={600}
                height={600}
                className="max-w-full max-h-full"
                onLoadingComplete={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setImageError(true);
                }}
                crossOrigin="anonymous"
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-muted-foreground">No image selected</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 50}
            >
              <ZoomOut size={16} />
            </Button>
            <span className="text-sm font-medium px-3 py-1 bg-muted rounded">{zoom}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 200}
            >
              <ZoomIn size={16} />
            </Button>
          </div>
          <Button
            onClick={onDownload}
            className="bg-gradient-to-r from-primary to-accent hover:from-accent hover:to-primary text-primary-foreground gap-2"
          >
            <Download size={16} />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
