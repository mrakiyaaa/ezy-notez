import type { Variants, Transition } from "framer-motion";

export const fadeSlideIn: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const fadeSlideOut: Variants = {
  initial: { opacity: 1, y: 0 },
  animate: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const slideInFromLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
  exit: {},
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const scaleUp: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const popInSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 20,
};

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: popInSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.6,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

export const resultStaggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
  exit: {},
};

export const resultStaggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: 6,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};
