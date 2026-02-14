import { z } from "zod";

export const workspaceValidator = {
  create: z.object({
    name: z.string().min(1, "Workspace name is required"),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
  }),

  update: z.object({
    name: z.string().min(1, "Workspace name is required").optional(),
    description: z.string().optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format").optional(),
  }),
};
