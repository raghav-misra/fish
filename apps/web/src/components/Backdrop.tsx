import type { ReactNode } from "react";
import { motion } from "framer-motion";

/** Dimmed, click-outside-to-close modal shell. */
export function Backdrop({
  children,
  onClose,
  width = "max-w-lg",
}: {
  children: ReactNode;
  onClose?: () => void;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        className={`w-full ${width} rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </div>
  );
}
