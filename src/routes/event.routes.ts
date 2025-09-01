// import { Router } from "express";
// import * as ctrl from"../controllers/event.controller";
// import { requireAuth, requireRole } from "../middlewares/auth.middleware";

// const router = Router();

// router.post("/create", requireAuth, requireRole("ORGANIZER"), ctrl.createEventController);

// // Update Event
// router.put("/update/:id", requireAuth, requireRole("ORGANIZER"), ctrl.updateEventController);

// // Delete a specific attachment by ID (attachmentId in params)
// router.delete("/delete/attachment/:id", requireAuth, requireRole("ORGANIZER"), ctrl.deleteEventAttachmentController);

// // Delete Event
// router.delete("/delete/:id", requireAuth, requireRole("ORGANIZER") , ctrl.deleteEventController);

// // Get My Events
// router.get("/all/me", requireAuth, requireRole("ORGANIZER") , ctrl.getMyEventsController);

// // Get All Events
// router.get("/all", ctrl.getAllEventsController);

// // Get single event
// router.get("/:id", ctrl.getEventByIdController);

// // Update Event Status
// router.put("/status/:id", requireAuth, requireRole("ORGANIZER"), ctrl.updateEventStatusController);



// export default router;


import { Router } from "express";
import * as ctrl from "../controllers/event.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /events/create:
 *   post:
 *     summary: Create a new event
 *     description: Only organizers can create events. Requires title, description, type, timings, contact details, and featured image.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - type
 *               - startTime
 *               - endTime
 *               - contactEmail
 *               - contactPhone
 *               - featuredImage
 *             properties:
 *               title: { type: string, example: "Tech Conference 2025" }
 *               description: { type: string, example: "Annual conference on modern technologies." }
 *               type: { type: string, enum: [ONLINE, ONSITE], example: ONSITE }
 *               startTime: { type: string, format: date-time, example: "2025-10-01T10:00:00Z" }
 *               endTime: { type: string, format: date-time, example: "2025-10-01T16:00:00Z" }
 *               contactEmail: { type: string, example: "organizer@example.com" }
 *               contactPhone: { type: string, example: "+923001234567" }
 *               venue: { type: string, example: "Expo Center Lahore" }
 *               joinLink: { type: string, example: "https://zoom.com/meeting/123" }
 *               featuredImage: { type: string, example: "https://cdn.com/event/cover.jpg" }
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileUrl: { type: string, example: "https://cdn.com/file.pdf" }
 *                     fileType: { type: string, enum: [image, video], example: image }
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Validation error
 */
router.post("/create", requireAuth, requireRole("ORGANIZER"), ctrl.createEventController);

/**
 * @swagger
 * /events/update/{id}:
 *   put:
 *     summary: Update an event
 *     description: Organizers can update their own events. Accepts URLs for images/attachments.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               featuredImage: { type: string, example: "https://cdn.com/new-cover.jpg" }
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileUrl: { type: string }
 *                     fileType: { type: string, enum: [image, video] }
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       403:
 *         description: Forbidden
 */
router.put("/update/:id", requireAuth, requireRole("ORGANIZER"), ctrl.updateEventController);

/**
 * @swagger
 * /events/delete/attachment/{id}:
 *   delete:
 *     summary: Delete a specific event attachment
 *     description: Remove an attachment by its ID. Only the event creator can delete.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Attachment ID
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 */
router.delete("/delete/attachment/:id", requireAuth, requireRole("ORGANIZER"), ctrl.deleteEventAttachmentController);

/**
 * @swagger
 * /events/delete/{id}:
 *   delete:
 *     summary: Delete an event
 *     description: Organizers can delete only their own events. Attachments and hosts are cleaned up.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 */
router.delete("/delete/:id", requireAuth, requireRole("ORGANIZER"), ctrl.deleteEventController);

/**
 * @swagger
 * /events/all/me:
 *   get:
 *     summary: Get my events
 *     description: Returns paginated events created by the logged-in organizer.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: search
 *         schema: { type: string, example: "conference" }
 *     responses:
 *       200:
 *         description: List of organizer’s events
 */
router.get("/all/me", requireAuth, requireRole("ORGANIZER"), ctrl.getMyEventsController);

/**
 * @swagger
 * /events/all:
 *   get:
 *     summary: Get all events
 *     description: Returns paginated list of all events created by organizers.
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: search
 *         schema: { type: string, example: "expo" }
 *     responses:
 *       200:
 *         description: List of events
 */
router.get("/all", ctrl.getAllEventsController);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     description: Fetch full event details including hosts, attachments, and participants.
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get("/:id", ctrl.getEventByIdController);

/**
 * @swagger
 * /events/status/{id}:
 *   put:
 *     summary: Update event status
 *     description: Organizers can update the status of their own events.
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ACTIVE, ENDED, CANCELLED], example: ACTIVE }
 *     responses:
 *       200:
 *         description: Event status updated
 */
router.put("/status/:id", requireAuth, requireRole("ORGANIZER"), ctrl.updateEventStatusController);

export default router;
