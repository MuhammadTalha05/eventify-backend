// import { Router } from "express";
// import * as ctrl from"../controllers/host.controller";
// import { requireAuth, requireRole } from "../middlewares/auth.middleware";


// const router = Router();

// // Delete Host
// router.delete("/delete/event/:eventId/host/:hostId", requireAuth, requireRole("ORGANIZER"), ctrl.deleteHostController);

// export default router;

import { Router } from "express";
import * as ctrl from "../controllers/host.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * /hosts/delete/event/{eventId}/host/{hostId}:
 *   delete:
 *     summary: Delete a host from an event
 *     description: Allows the event organizer to remove a host from their event. The organizer cannot remove themselves.
 *     tags: [Hosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the event
 *       - in: path
 *         name: hostId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the host to remove
 *     responses:
 *       200:
 *         description: Host deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Host deleted successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Host deleted successfully
 *                     deletedHost:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: hst_123456
 *                         email:
 *                           type: string
 *                           example: host@example.com
 *       400:
 *         description: Invalid input or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Host not found in this event
 *       401:
 *         description: Unauthorized (no token provided)
 *       403:
 *         description: Forbidden - only the organizer can remove hosts
 *       404:
 *         description: Event or host not found
 */
router.delete(
  "/delete/event/:eventId/host/:hostId",
  requireAuth,
  requireRole("ORGANIZER"),
  ctrl.deleteHostController
);

export default router;
