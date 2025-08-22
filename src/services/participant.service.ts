import prisma from "../config/db.config";
import { sendEmail } from "../utils/email.util";
import { GetAllOptions } from "../types/event.type";

// Join Event Service
export async function joinEvent(userId: string, eventId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found.");
  }
  if (user.role !== "PARTICIPANT") {
    throw new Error("Only participants can join events.");
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new Error("Event not found.");
  }
  if (event.status !== "ACTIVE") {
    throw new Error(`This event cannot be joined because it is ${event.status}.`);
  }

  // Check if user already joined this event
  const existing = await prisma.eventParticipant.findFirst({
    where: { eventId, userId },
  });
  if (existing) {
    throw new Error("You have already requested to join this event.");
  }

  // Create participant record
  return prisma.eventParticipant.create({
    data: {
      eventId,
      userId,
      status: "PENDING",
    },
    include: {
      event: true,
      user: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });
}


// Update Participent Status
export async function updateParticipantStatus(
  eventId: string,
  participantId: string,
  status: "APPROVED" | "REJECTED",
  organizerId: string
) {
  // Fetch participant with event + hosts
  const participant = await prisma.eventParticipant.findUnique({
    where: { id: participantId },
    include: {
      event: {
        include: { hosts: { select: { id: true } } }, 
      },
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  if (!participant) {
    throw new Error("Participant not found.");
  }

  const event = participant.event;
  if (!event || event.id !== eventId) {
    throw new Error("Participant does not belong to this event.");
  }

  // Check if current user is host of this event
  const isHost = event.hosts.some((host) => host.id === organizerId);
  if (!isHost) {
    throw new Error("You are not authorized to update participants of this event.");
  }

  // Prevent double processing
  if (participant.status !== "PENDING") {
    throw new Error("This participant request has already been processed.");
  }

  // Handle seat limit
  if (status === "APPROVED") {
    if (event.totalSeats !== null && event.totalSeats !== undefined) {
      if (event.confirmedParticipants >= event.totalSeats) {
        throw new Error("No seats available for this event.");
      }
    }
  }

  // Update participant status
  const updated = await prisma.eventParticipant.update({
    where: { id: participantId },
    data: { status },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      event: { select: { id: true, title: true, type: true } },
    },
  });

  // If approved, increment confirmedParticipants
  if (status === "APPROVED") {
    await prisma.event.update({
      where: { id: event.id },
      data: { confirmedParticipants: { increment: 1 } },
    });
  }

//   Notify participent about their event
  if (updated.user?.email) {
    const subject =
      status === "APPROVED"
        ? `🎉 Your registration for ${updated.event.title} is approved!`
        : `❌ Your registration for ${updated.event.title} was rejected`;

    const text =
      status === "APPROVED"
        ? `Hi ${updated.user.fullName},\n\nYour participation request for the event "${updated.event.title}" has been approved. See you there!`
        : `Hi ${updated.user.fullName},\n\nUnfortunately, your request for the event "${updated.event.title}" has been rejected.`;

    const html =
      status === "APPROVED"
        ? `<p>Hi <strong>${updated.user.fullName}</strong>,</p>
           <p>Your participation request for <strong>${updated.event.title}</strong> has been <span style="color:green;"><strong>approved</strong></span>.</p>
           <p>We look forward to seeing you at the event 🎉</p>`
        : `<p>Hi <strong>${updated.user.fullName}</strong>,</p>
           <p>Unfortunately, your participation request for <strong>${updated.event.title}</strong> has been <span style="color:red;"><strong>rejected</strong></span>.</p>`;

    await sendEmail(updated.user.email, subject, text, html);
  }

  return updated;
}


// Get Participant Events
export async function getParticpantAllEvents(
  userId: string,
  options: GetAllOptions = {}
) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  const searchFilter = options.search
    ? {
        event: {
          OR: [
            { title: { contains: options.search, mode: "insensitive" as const } },
          ],
        },
      }
    : {};

  // Count total requested events
  const totalCount = await prisma.eventParticipant.count({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED", "REJECTED"] },
      ...searchFilter,
    },
  });

  // Fetch requested events with search + pagination
  const requests = await prisma.eventParticipant.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "APPROVED", "REJECTED"] },
      ...searchFilter,
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          endTime: true,
          venue: true,
          featuredImage: true,
          confirmedParticipants: true,
          totalSeats: true,
          status: true,
        },
      },
    },
    orderBy: { joinedAt: "desc" },
    skip,
    take: limit,
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    pagination: {
      totalItems: totalCount,
      totalPages,
      currentPage: page,
      perPage: limit,
      currentCount: requests.length,
    },
    data: requests,
  };
}