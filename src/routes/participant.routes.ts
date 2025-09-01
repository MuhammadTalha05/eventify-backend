// import { Router } from "express";
// import * as ctrl from "../controllers/participant.controller";
// import { requireAuth, requireRole } from "../middlewares/auth.middleware";

// const router = Router();

// // Join Events
// router.post("/join/event/:id", requireAuth , ctrl.joinEventController);

// // Update participent Status
// router.patch("/event/:eventId/participant/:participantId/status", requireAuth , requireRole("ORGANIZER") , ctrl.updateParticipantStatusController);

// // Get Particiopant All Events
// router.get("/events/all", requireAuth , ctrl.getParticipantAllEventController);

// export default router;


import { Router } from "express";
import * as ctrl from "../controllers/participant.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /participants/join/event/{id}:
 *   post:
 *     summary: Join an event
 *     description: Allows a participant to request joining an active event.
 *     tags: [Participants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID
 *     responses:
 *       200:
 *         description: Successfully joined the event (pending approval).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: part_123456
 *                     status:
 *                       type: string
 *                       example: PENDING
 *                     event:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: evt_123456
 *                         title:
 *                           type: string
 *                           example: Tech Conference 2025
 *       400:
 *         description: Validation or business rule error
 *       401:
 *         description: Unauthorized
 */
router.post("/join/event/:id", requireAuth, ctrl.joinEventController);

/**
 * @swagger
 * /participants/event/{eventId}/participant/{participantId}/status:
 *   patch:
 *     summary: Update participant status
 *     description: Organizer (or event host) can approve or reject a participant's join request.
 *     tags: [Participants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The event ID
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The participant ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 example: APPROVED
 *     responses:
 *       200:
 *         description: Participant status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: part_123456
 *                     status:
 *                       type: string
 *                       example: APPROVED
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: usr_123456
 *                         fullName:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           example: john@example.com
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - only organizers/hosts can update
 *       404:
 *         description: Participant or event not found
 */
router.patch(
  "/event/:eventId/participant/:participantId/status",
  requireAuth,
  requireRole("ORGANIZER"),
  ctrl.updateParticipantStatusController
);

/**
 * @swagger
 * /participants/events/all:
 *   get:
 *     summary: Get all participant's events
 *     description: Retrieve all events the logged-in participant has joined (with pagination and search).
 *     tags: [Participants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: Tech
 *         description: Search by event title
 *     responses:
 *       200:
 *         description: Successfully retrieved participant events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       example: 12
 *                     totalPages:
 *                       type: integer
 *                       example: 2
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     perPage:
 *                       type: integer
 *                       example: 6
 *                     currentCount:
 *                       type: integer
 *                       example: 6
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       event:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: evt_123456
 *                           title:
 *                             type: string
 *                             example: Startup Meetup
 *                           description:
 *                             type: string
 *                             example: Networking event for founders and investors
 *                           startTime:
 *                             type: string
 *                             format: date-time
 *                           endTime:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                             example: ACTIVE
 *       401:
 *         description: Unauthorized
 */
router.get("/events/all", requireAuth, ctrl.getParticipantAllEventController);

export default router;
