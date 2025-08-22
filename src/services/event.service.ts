import prisma from "../config/db.config";
import cloudinary from "../config/cloudinary.config";
import { CreateEvent } from "../types/event.type";
import { isEmail, isPhoneNumber } from "../utils/validation.util";
import { GetAllOptions } from "../types/event.type"


// Create Event Service
export async function createEvent(
  data: CreateEvent,
  hostId: string,
  featuredImage: Express.Multer.File | null,
  attachments: Express.Multer.File[]
) {

  const requiredFields: (keyof CreateEvent)[] = [
    "title",
    "description",
    "type",
    "startTime",
    "endTime",
    "contactEmail",
    "contactPhone",
  ];

  const missingFields = requiredFields.filter((field) => !data[field]);
  if (!featuredImage) missingFields.push("featuredImage");

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required fields: ${missingFields.join(", ")}`
    );
  }

  if (!isEmail(data.contactEmail)) {
    throw new Error("Invalid email format");
  }
  if (!isPhoneNumber(data.contactPhone)) {
    throw new Error(
      "Phone number must be in format +92XXXXXXXXXX or 03XXXXXXXXX"
    );
  }

  if (data.type === "ONSITE" && !data.venue) {
    throw new Error("Venue is required for ONSITE events");
  }
  if (data.type === "ONLINE" && !data.joinLink) {
    throw new Error("Join link is required for ONLINE events");
  }
  if (data.type === "ONSITE" && data.joinLink) {
    throw new Error("ONSITE events should not have joinLink");
  }
  if (data.type === "ONLINE" && data.venue) {
    throw new Error("ONLINE events should not have venue");
  }

  if (!featuredImage) {
    throw new Error("Featured image is required");
  }

  // --- Time validation ---
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (start >= end) {
    throw new Error("Start time must be before end time");
  }

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      totalSeats: Number(data.totalSeats),
      type: data.type,
      venue: data.venue ?? null,
      joinLink: data.joinLink ?? null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      featuredImage: featuredImage.path, // Cloudinary URL
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      hosts: { connect: [{ id: hostId }] },
      attachments: {
        create: (attachments ?? []).map((file) => ({
          fileUrl: file.path, // Cloudinary URL
          fileType: file.mimetype.startsWith("video") ? "video" : "image",
        })),
      },
    },
    include: {
      hosts: true,
      attachments: true,
    },
  });

  return event;
}


// Update Event Service
export async function updateEvent(
  eventId: string,
  userId: string,
  data: CreateEvent,
  featuredImage: Express.Multer.File | null,
  attachments: Express.Multer.File[]
) {
  // --- Fetch existing event ---
  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: { hosts: true, attachments: true },
  });

  if (!existingEvent) throw new Error("Event not found");

  // --- Ownership check ---
  const isOwner = existingEvent.hosts.some((host) => host.id === userId);
  if (!isOwner) throw new Error("Forbidden: You can only update your own events");

  // --- Required fields validation ---
  const requiredFields: (keyof CreateEvent)[] = [
    "title",
    "description",
    "type",
    "startTime",
    "endTime",
    "contactEmail",
    "contactPhone",
  ];
  const missingFields = requiredFields.filter((f) => !data[f]);
  if (!featuredImage && !existingEvent.featuredImage) missingFields.push("featuredImage");

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // --- Email & phone validation ---
  if (!isEmail(data.contactEmail)) throw new Error("Invalid email format");
  if (!isPhoneNumber(data.contactPhone))
    throw new Error("Phone must be in format +92XXXXXXXXXX or 03XXXXXXXXX");

  // --- Event type business logic ---
  if (data.type === "ONSITE" && !data.venue) throw new Error("Venue is required for ONSITE events");
  if (data.type === "ONLINE" && !data.joinLink) throw new Error("Join link is required for ONLINE events");
  if (data.type === "ONSITE" && data.joinLink) throw new Error("ONSITE events should not have joinLink");
  if (data.type === "ONLINE" && data.venue) throw new Error("ONLINE events should not have venue");

  const oldFeaturedImage = existingEvent.featuredImage;

  // --- Time validation ---
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (start >= end) {
    throw new Error("Start time must be before end time");
  }

  // --- Update event ---
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: data.title,
      description: data.description,
      totalSeats: Number(data.totalSeats),
      type: data.type,
      venue: data.venue ?? null,
      joinLink: data.joinLink ?? null,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      featuredImage: featuredImage ? featuredImage.path : existingEvent.featuredImage,
      attachments:
        attachments.length > 0
          ? {
              create: attachments.map((file) => ({
                fileUrl: file.path,
                fileType: file.mimetype.startsWith("video") ? "video" : "image",
              })),
            }
          : undefined,
    },
    include: { hosts: true, attachments: true },
  });

  // --- Delete old featured image from Cloudinary if replaced ---
  if (featuredImage && oldFeaturedImage) {
    try {
      const publicId = oldFeaturedImage.split("/").pop()?.split(".")[0];
      if (publicId) await cloudinary.uploader.destroy(`events/featured/${publicId}`);
    } catch (err) {
      console.error("Cloudinary featured image deletion failed:", err);
    }
  }

  return updatedEvent;
}


// Deleet Event Attachemnt Service
export async function deleteEventAttachment(
  attachmentId: string,
  userId: string
) {
  // --- Fetch attachment with event & hosts ---
  const attachment = await prisma.eventAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      event: {
        include: { hosts: true }
      }
    }
  });

  if (!attachment) throw new Error("Attachment not found");

  const event = attachment.event;

  // --- Ownership check ---
  const isOwner = event.hosts.some((host) => host.id === userId);
  if (!isOwner) throw new Error("Forbidden: You can only modify your own events");

  // --- Delete from Cloudinary ---
  try {
    const publicId = attachment.fileUrl.split("/").pop()?.split(".")[0];
    if (publicId) await cloudinary.uploader.destroy(`events/attachments/${publicId}`);
  } catch (err) {
    console.error("Cloudinary attachment deletion failed:", err);
  }

  // --- Delete from DB ---
  await prisma.eventAttachment.delete({
    where: { id: attachmentId },
  });

  return {success: true, message: "Attachment deleted successfully" };
}


// Delete event service
export async function deleteEvent(eventId: string, userId: string) {

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: { hosts: true, attachments: true },
  });

  if (!existingEvent) {
    throw new Error("Event not found");
  }

  const isOwner = existingEvent.hosts.some((host) => host.id === userId);
  if (!isOwner) {
    throw new Error("Forbidden: You can only delete your own events");
  }

  // --- Delete event in DB ---
  await prisma.event.delete({
    where: { id: eventId },
  });
}


// Get My Events Service
export async function getMyEvents(
  userId: string,
  options: GetAllOptions = {}
) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = 6; // fixed limit
  const skip = (page - 1) * limit;

  const searchFilter = options.search
    ? { title: { contains: options.search, mode: "insensitive" as const } }
    : {};

  // Total count of user's events
  const totalCount = await prisma.event.count({
    where: {
      hosts: { some: { id: userId } },
      ...searchFilter,
    },
  });

  const events = await prisma.event.findMany({
    where: {
      hosts: { some: { id: userId } },
      ...searchFilter,
    },
    include: {
      hosts: true,
      attachments: { select: { id: true, fileUrl: true, fileType: true } },
      participants: true

    },
    orderBy: { startTime: "desc" },
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
      currentCount: events.length,
    },
    data: events,
  };
}


// Get All Events Service
export async function getAllEvents(options: GetAllOptions = {}) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? options.limit : 6;
  const skip = (page - 1) * limit;

  // Search filter
  const searchFilter = options.search
    ? { title: { contains: options.search, mode: "insensitive" as const } }
    : {};

  // Total count of events
  const totalCount = await prisma.event.count({
    where: {
      hosts: { some: { role: "ORGANIZER" } },
      ...searchFilter,
    },
  });

  // Fetch paginated events
  const events = await prisma.event.findMany({
    where: {
      hosts: { some: { role: "ORGANIZER" } },
      ...searchFilter,
    },
    include: {
      hosts: { select: { id: true, fullName: true, email: true, role: true } },
      attachments: { select: { id: true, fileUrl: true, fileType: true } },
      participants: true
    },
    orderBy: { startTime: "desc" },
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
      currentCount: events.length,
    },
    data: events,
  };
}


// Get event by id service
export async function getEventById(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hosts: { select: { id: true, fullName: true, email: true, role: true } },
      attachments: true,
      participants:true
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  return event;
}


// Update Event Status Service
export async function updateEventStatus(
  eventId: string,
  userId: string,
  status: "ACTIVE" | "ENDED" | "CANCELLED"
) {
  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: { hosts: true },
  });

  if (!existingEvent) throw new Error("Event not found");

  // Only owner (host) can update status
  const isOwner = existingEvent.hosts.some((host) => host.id === userId);
  if (!isOwner) throw new Error("Forbidden: You can only update your own events");

  // Update status
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: { status },
    include: { hosts: true, attachments: true },
  });

  return updatedEvent;
}