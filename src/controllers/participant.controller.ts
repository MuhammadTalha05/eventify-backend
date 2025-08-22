import { Response } from "express";
import * as participantService from "../services/participant.service";
import { AuthRequest } from "../middlewares/auth.middleware";

// Join Participent Controller
export async function joinEventController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const eventId = req.params.id; 
    if (!eventId) {
      return res.status(400).json({ success: false, error: "Valid event id is required" });
    }

    const userId = req.user.sub;

    const participant = await participantService.joinEvent(userId, eventId);

    return res.status(200).json({
      success: true,
      data: participant,
    });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}

// Update Participent Status Controller
export async function updateParticipantStatusController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { eventId, participantId } = req.params;
    const { status } = req.body; 

    if (!eventId || !participantId) {
      return res.status(400).json({ success: false, error: "Valid Event ID and Participant ID are required" });
    }
    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const userId = req.user.sub;

    const updated = await participantService.updateParticipantStatus(
      eventId,
      participantId,
      status,
      userId
    );

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}


// Get Participant Events Controller
export async function getParticipantAllEventController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const userId = req.user.sub;

    const page = Number(req.query.page) || 1;
    const search = (req.query.search as string) || undefined;

    const result = await participantService.getParticpantAllEvents(userId, { page, search });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "An unknown error occurred",
    });
  }
}