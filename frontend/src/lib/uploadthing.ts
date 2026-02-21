import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { FileRouter } from "uploadthing/types";

// Mirror the backend's file‑router shape so the client helpers are typed.
// Keep in sync with backend/src/uploadthing.ts → uploadRouter
type OurFileRouter = FileRouter;

const UPLOADTHING_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api") +
  "/uploadthing";

export type { OurFileRouter };

export const UploadButton = generateUploadButton<OurFileRouter>({
  url: UPLOADTHING_URL,
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: UPLOADTHING_URL,
});
