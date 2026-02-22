"use client";

import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing";

const UPLOADTHING_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api") +
  "/uploadthing";

export const { useUploadThing } = generateReactHelpers<OurFileRouter>({
  url: UPLOADTHING_URL,
});
