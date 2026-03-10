import { createUploadthing, type FileRouter } from "uploadthing/express";

const f = createUploadthing();

export const uploadRouter = {
  resourceUploader: f({
    // UploadThing v7 only accepts its built-in type shortcuts as router keys.
    // Using full MIME types (e.g. "application/pdf") causes the "/" to be
    // double-encoded in presigned URLs, resulting in a 500 from the ingest server.
    pdf: { maxFileSize: "32MB", maxFileCount: 10 },
    // No built-in PPT shorthand — use blob (accepts any MIME type).
    blob: { maxFileSize: "32MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    audio: { maxFileSize: "64MB", maxFileCount: 10 },
  })
    .onUploadComplete(({ file }) => {
      console.log("Upload complete:", file.name);
      return { url: file.ufsUrl, name: file.name, size: file.size, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
