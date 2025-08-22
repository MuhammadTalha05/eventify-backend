import { Router } from "express";
import * as ctrl from"../controllers/event.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { uploadEventMedia } from "../utils/event.cloudinary.util";

const router = Router();

// Create Event
router.post("/create", requireAuth, requireRole("ORGANIZER"), uploadEventMedia , ctrl.createEventController);

// Update Event
router.put("/update/:id", requireAuth, requireRole("ORGANIZER"), uploadEventMedia , ctrl.updateEventController);

// Update Event Status
router.put("/status/:id", requireAuth, requireRole("ORGANIZER"), ctrl.updateEventStatusController);

// Delete Event
router.delete("/delete/:id", requireAuth, requireRole("ORGANIZER") , ctrl.deleteEventController);

// Delete a specific attachment by ID (attachmentId in params)
router.delete("/delete/attachment/:id", requireAuth, requireRole("ORGANIZER"), ctrl.deleteEventAttachmentController);

// Get My Events
router.get("/all/me", requireAuth, requireRole("ORGANIZER") , ctrl.getMyEventsController);

// Get All Events
router.get("/all", ctrl.getAllEventsController);

// Get single event
router.get("/:id", ctrl.getEventByIdController);


export default router;
