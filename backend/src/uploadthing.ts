import { createUploadthing, type FileRouter } from "uploadthing/express";

const f = createUploadthing();

export const uploadRouter = {
  resourceUploader: f({
    "application/pdf": { maxFileSize: "32MB", maxFileCount: 10 },
    "application/vnd.ms-powerpoint": { maxFileSize: "32MB", maxFileCount: 10 },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
      maxFileSize: "32MB",
      maxFileCount: 10,
    },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    audio: { maxFileSize: "64MB", maxFileCount: 10 },
  })
    .onUploadComplete(({ file }) => {
      console.log("Upload complete:", file.name);
      return { url: file.ufsUrl, name: file.name, size: file.size, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
