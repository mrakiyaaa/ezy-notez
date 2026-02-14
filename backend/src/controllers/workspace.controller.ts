import { Request, Response } from "express";
import { workspaceService } from "../services/workspace.service";

export const workspaceController = {
  async create(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, description, color } = req.body;
      
      const workspace = await workspaceService.create({
        name,
        description,
        color,
        owner: userId,
      });
      
      res.status(201).json({
        success: true,
        data: workspace,
        message: "Workspace created successfully",
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create workspace",
      });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      const workspaces = await workspaceService.getAllByUser(userId);
      
      res.status(200).json({
        success: true,
        data: workspaces,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch workspaces",
      });
    }
  },
};
