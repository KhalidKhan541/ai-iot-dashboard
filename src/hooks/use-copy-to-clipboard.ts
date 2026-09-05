"use client";

import { useState, useCallback } from "react";

interface UseCopyToClipboardResult {
  copiedText: string | null;
  isCopied: boolean;
  copy: (text: string) => Promise<boolean>;
  reset: () => void;
}

export function useCopyToClipboard(): UseCopyToClipboardResult {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setCopiedText(null);
      }, 2000);
      return true;
    } catch (error) {
      // Fallback for older browsers
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedText(text);
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
          setCopiedText(null);
        }, 2000);
        return true;
      } catch {
        console.error("Failed to copy:", error);
        return false;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
  }, []);

  return { copiedText, isCopied, copy, reset };
}
