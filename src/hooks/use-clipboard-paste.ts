"use client";

import { useEffect, useCallback } from "react";

interface UseClipboardPasteProps {
  onPaste: (files: FileList) => void;
  acceptedFileTypes: string[];
}

export function useClipboardPaste({
  onPaste,
  acceptedFileTypes,
}: UseClipboardPasteProps) {
  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;
      const items_array = Array.from(items);
      const acceptedFilesItems = new ClipboardEvent("").clipboardData;
      for (const item of items_array) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;

          const isAcceptedType = acceptedFileTypes.some(
            (type) =>
              type === "image/*" ||
              type === item.type ||
              file.name.toLowerCase().endsWith(type.replace("*", "")),
          );

          if (isAcceptedType) {
            event.preventDefault();
            acceptedFilesItems?.items.add(file);
          }
        }
      }
      if (acceptedFilesItems?.items) {
        onPaste(acceptedFilesItems.files);
      }
    },
    [onPaste, acceptedFileTypes],
  );

  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      void handlePaste(event);
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [handlePaste]);
}
