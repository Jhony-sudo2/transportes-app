"use client";

import { toast } from "sonner";

interface ToastResult {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

/**
 * Centralized toast hook. Re-exports sonner toast with typed methods.
 * Use this import path across all components instead of importing sonner directly.
 */
export function useToast(): ToastResult {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    warning: (message: string) => toast.warning(message),
  };
}
