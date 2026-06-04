'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isPdfUrl } from '@/lib/utils';

interface DocumentPreviewModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export function DocumentPreviewModal({ url, title, onClose }: DocumentPreviewModalProps) {
  const [isPdf, setIsPdf] = useState(isPdfUrl(url));
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    if (isPdf && !blobUrl) {
      setLoadingPdf(true);
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          setBlobUrl(URL.createObjectURL(pdfBlob));
        })
        .catch(console.error)
        .finally(() => setLoadingPdf(false));
    }
  }, [url, isPdf, blobUrl]);

  // Limpiar el blobUrl al cerrar
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/45 p-4">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#EEF2F7] px-5 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{title}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPdf(!isPdf)}>
              {isPdf ? 'Ver como imagen' : 'Ver como PDF'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
              <Download className="mr-1 h-4 w-4" />
              Abrir en pestaña
            </Button>
            <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-[#F1F5F9]">
              <X className="h-5 w-5 text-[#64748B]" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center p-5">
          {isPdf ? (
            loadingPdf ? (
              <div className="flex h-[70vh] w-full items-center justify-center rounded-lg border border-[#E6ECF5] bg-[#F8FAFC]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B5CFF] border-t-transparent" />
              </div>
            ) : (
              <iframe
                src={blobUrl || url}
                className="h-[70vh] w-full rounded-lg border border-[#E6ECF5]"
                title={title}
              />
            )
          ) : (
            <img
              src={url}
              alt={title}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
              onError={() => {
                if (!isPdf) setIsPdf(true);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
