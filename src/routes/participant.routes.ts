import { Router } from "express";
import * as ctrl from "../controllers/participant.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

// Join Events
router.post("/join/event/:id", requireAuth , ctrl.joinEventController);

// Update participent Status
router.patch("/event/:eventId/participant/:participantId/status", requireAuth , requireRole("ORGANIZER") , ctrl.updateParticipantStatusController);

// Get Particiopant All Events
router.get("/events/all", requireAuth , ctrl.getParticipantAllEventController);

export default router;