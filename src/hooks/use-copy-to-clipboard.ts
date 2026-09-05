"use client";

import { useState, useCallback, useRef } from "react";

interface UseCopyToClipboardResult {
  copiedText: string | null;
  isCopied: boolean;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useCopyToClipboard(options?: {
  timeout?: number;
  onSuccess?: (text: string) => void;
  onError?: (error: Error) => void;
}): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { timeout = 2000, onSuccess, onError } = options ?? {};

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.left = "-9999px";
          textarea.style.top = "-9999px";
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }

        setCopiedText(text);
        setIsCopied(true);
        onSuccess?.(text);

        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
        }, timeout);

        return true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Failed to copy");
        onError?.(err);
        return false;
      }
    },
    [timeout, onSuccess, onError]
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCopiedText(null);
    setIsCopied(false);
  }, []);

  return { copiedText, isCopied, copy, reset };
}
