"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { fadeSlideIn, slideInFromLeft } from "@/lib/animations";

let navDirection: "forward" | "back" = "forward";
let popstateBound = false;

if (typeof window !== "undefined" && !popstateBound) {
  popstateBound = true;
  window.addEventListener("popstate", () => {
    navDirection = "back";
  });
}

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  const variant = navDirection === "back" ? slideInFromLeft : fadeSlideIn;

  useEffect(() => {
    navDirection = "forward";
  }, []);

  return (
    <motion.div variants={variant} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}
