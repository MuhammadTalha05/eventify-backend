import { Response } from "express";
import * as hostService from "../services//host.service";
import { AuthRequest } from "../middlewares/auth.middleware";

// Delete Host Controller
export async function deleteHostController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { eventId, hostId } = req.params;
    const organizerId = req.user.sub;

    if (!eventId || !hostId) {
      return res.status(400).json({ 
        success: false, 
        message: "Event ID and Host ID are required" 
      });
    }

    const result = await hostService.deleteHost(eventId, hostId, organizerId);

    return res.status(200).json({
      success: true,
      message: "Host deleted successfully",
      data: result
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ 
        success: false, 
        message: err.message 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
}