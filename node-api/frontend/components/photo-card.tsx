'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Loader2 } from 'lucide-react';
import { getImageUrl } from '@/lib/api-client';

interface PhotoCardProps {
  id: string;
  confidence: number;
  onView: () => void;
  onDownload: () => void;
}

export function PhotoCard({ id, confidence, onView, onDownload }: PhotoCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(id);

  return (
    <Card className="overflow-hidden border-0 card-shadow group cursor-pointer">
      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
        {isLoading && (
          <Loader2 size={32} className="text-primary animate-spin absolute z-10" />
        )}
        {imageError ? (
          <div className="text-center">
            <div className="text-4xl mb-2">📷</div>
            <p className="text-xs text-muted-foreground">Failed to load</p>
          </div>
        ) : (
          <Image
            src={imageUrl}
            alt={`Photo ${id}`}
            fill
            className="object-cover"
            onLoadingComplete={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setImageError(true);
            }}
            crossOrigin="anonymous"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <Button
            size="sm"
            onClick={onView}
            className="bg-primary hover:bg-accent text-primary-foreground gap-1"
          >
            <Eye size={16} />
            View
          </Button>
          <Button
            size="sm"
            onClick={onDownload}
            variant="outline"
            className="gap-1"
          >
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Confidence</span>
          <span className="text-sm font-bold text-primary"> {(confidence * 100).toFixed(2)}%</span>
        </div>
        <div className="mt-2 w-full bg-muted rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary to-accent h-2 rounded-full"
            style={{ width: `${(confidence * 100).toFixed(2)}%` }}
          />
        </div>
      </div>
    </Card>
  );
}
