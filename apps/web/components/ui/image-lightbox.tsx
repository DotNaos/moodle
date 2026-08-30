"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

function ImageLightbox({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-none items-center justify-center bg-transparent p-0 shadow-none sm:max-w-none"
        onClick={onClose}
        overlayClassName="bg-black/80 supports-backdrop-filter:backdrop-blur-sm"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Bildvorschau</DialogTitle>
        <DialogClose asChild>
          <Button
            aria-label="Schließen"
            className="absolute right-2 top-2 bg-white/10 text-white hover:bg-white/20"
            onClick={(event) => event.stopPropagation()}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-5" />
          </Button>
        </DialogClose>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={alt ?? ""}
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          src={src}
        />
      </DialogContent>
    </Dialog>
  );
}

export { ImageLightbox };
