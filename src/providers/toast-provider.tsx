"use client";

import * as React from "react";
import { ToastProvider as RadixToastProvider } from "@radix-ui/react-toast";
import {
  ToastProvider as CustomToastProvider,
  useToast as useCustomToast,
} from "@/components/ui/toast";

interface ToastProviderProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  maxToasts?: number;
  swipeDirection?: "right" | "left" | "up" | "down";
}

function ToastProvider({
  children,
  position = "top-right",
  maxToasts = 5,
  swipeDirection = "right",
}: ToastProviderProps) {
  return (
    <RadixToastProvider swipeDirection={swipeDirection}>
      <CustomToastProvider position={position} maxToasts={maxToasts}>
        {children}
      </CustomToastProvider>
    </RadixToastProvider>
  );
}

function useToast() {
  return useCustomToast();
}

export { ToastProvider, useToast };
