import { Response } from "express";
import * as eventService from "../services/event.service";
import { CreateEvent } from "../types/event.type";
import { AuthRequest } from "../middlewares/auth.middleware";


// Create Event Controller
export async function createEventController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (req.user.role !== "ORGANIZER") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only organizers can create events",
      });
    }

    const organizerId = req.user.sub;
    const body = req.body as CreateEvent;

    // ✅ Now frontend sends URLs directly
    const featuredImage = body.featuredImage ?? null;
    const attachments = body.attachments ?? [];

    // Pass URLs to service (no file handling anymore)
    const event = await eventService.createEvent(
      body,
      organizerId,
      featuredImage,
      attachments
    );

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      message:
        err instanceof Error ? err.message : "An unexpected error occurred",
    });
  }
}

// Update Created Event
export async function updateEventController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const eventId = req.params.id;
    const userId = req.user.sub;

    // ✅ Expect frontend to send URLs instead of files
    const { featuredImage, attachments } = req.body;

    // featuredImageUrl: string | null
    // attachments: [{ url: string; type: "image" | "video" }]

    const event = await eventService.updateEvent(
      eventId,
      userId,
      req.body,                // other event fields (title, desc, etc.)
      featuredImage || null, // ✅ pass URL instead of multer file
      attachments || []         // ✅ pass array of { fileUrl, fileType }
    );

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// Delete Event Attachemnts Controller
export async function deleteEventAttachmentController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { id: attachmentId } = req.params;
    const userId = req.user.sub;

    if (!attachmentId) return res.status(400).json({ success: false, message: "Attachment ID is required" });

    const result = await eventService.deleteEventAttachment(attachmentId, userId);

    return res.status(200).json({ ...result });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
}

// Delete Event
export async function deleteEventController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const eventId = req.params.id;
    const userId = req.user.sub;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "eventId is required" });
    }

    // --- Call service ---
    await eventService.deleteEvent(eventId, userId);

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (err) {
    if (err instanceof Error) {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}

// Get All my event controller
export async function getMyEventsController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const userId = req.user.sub;
    const page = Number(req.query.page) || 1;
    const search = (req.query.search as string) || undefined;

    const result = await eventService.getMyEvents(userId, { page, search });

    return res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
}

// Get All Eventa Controller
export async function getAllEventsController(req: AuthRequest, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const search = (req.query.search as string) || undefined;

    const result = await eventService.getAllEvents({ page, search });

    return res.status(200).json({
      success: true,
      pagination: result.pagination,
      data: result.data,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
}

// Get Event by Id
export async function getEventByIdController(req: AuthRequest, res: Response) {
  try {
    const eventId = req.params.id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: "Event ID is required" });
    }

    const event = await eventService.getEventById(eventId);

    return res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err: unknown) {
    return res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
}

// Update Event Status Controller
export async function updateEventStatusController(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const { id } = req.params; 
    const { status } = req.body;
    const userId = req.user.sub; 

    if (!status || !["ACTIVE", "ENDED", "CANCELLED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid Status" });
    }

    const event = await eventService.updateEventStatus(id, userId, status as "ACTIVE" | "ENDED" | "CANCELLED");

    return res.status(200).json({
      success: true,
      message: "Event status updated successfully",
      data: event,
    });
  } catch (err: unknown) {
    return res.status(400).json({
      success: false,
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
}