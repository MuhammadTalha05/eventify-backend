import prisma from "../config/db.config";
import cloudinary from "../config/cloudinary.config";
import { CreateEvent } from "../types/event.type";
import { isEmail, isPhoneNumber } from "../utils/validation.util";
import { GetAllOptions } from "../types/event.type"


// Create Event Service
export async function createEvent(
  data: CreateEvent,
  organizerId: string,
  featuredImageUrl: string | null,   // ✅ URL instead of multer file
  attachmentUrls: { fileUrl: string; fileType: "image" | "video" }[] // ✅ array of urls + type
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
  if (!featuredImageUrl) missingFields.push("featuredImage");

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
  }

  // --- Validation ---
  if (!isEmail(data.contactEmail)) throw new Error("Invalid email format");
  if (!isPhoneNumber(data.contactPhone))
    throw new Error("Phone must be in format +92XXXXXXXXXX or 03XXXXXXXXX");

  if (data.type === "ONSITE" && !data.venue) throw new Error("Venue is required for ONSITE events");
  if (data.type === "ONLINE" && !data.joinLink) throw new Error("Join link is required for ONLINE events");
  if (data.type === "ONSITE" && data.joinLink) throw new Error("ONSITE events should not have joinLink");
  if (data.type === "ONLINE" && data.venue) throw new Error("ONLINE events should not have venue");

  if (!featuredImageUrl) throw new Error("Featured image is required");

  // --- Time validation ---
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  if (start >= end) throw new Error("Start time must be before end time");

  // --- Organizer info ---
  const organizer = await prisma.user.findUnique({
    where: { id: organizerId },
    select: { email: true },
  });
  if (!organizer) throw new Error("Organizer not found");

  // --- Parse hostEmails ---
  let parsedHostEmails: string[] = [];
  const hostEmailsValue = data.hostEmails as unknown;

  if (hostEmailsValue) {
    if (Array.isArray(hostEmailsValue)) {
      parsedHostEmails = hostEmailsValue.map((email: string) => email.trim());
    } else if (typeof hostEmailsValue === "string") {
      try {
        const parsed = JSON.parse(hostEmailsValue);
        if (Array.isArray(parsed)) {
          parsedHostEmails = parsed.map((email: string) => email.trim());
        } else {
          parsedHostEmails = hostEmailsValue
            .split(",")
            .map((email: string) => email.trim())
            .filter((email: string) => email.length > 0);
        }
      } catch {
        parsedHostEmails = hostEmailsValue
          .split(",")
          .map((email: string) => email.trim())
          .filter((email: string) => email.length > 0);
      }
    }

    // Validate host emails
    const invalidEmails = parsedHostEmails.filter((email) => !isEmail(email));
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid host email format: ${invalidEmails.join(", ")}`);
    }
  }

  // --- Organizer always first host, remove duplicates ---
  const hostEmails = [organizer.email, ...parsedHostEmails];

  // Remove duplicates while keeping first occurrence
  const uniqueHostEmails = hostEmails.filter((email, index) => hostEmails.indexOf(email) === index);

  // --- Create event ---
  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      totalSeats: data.totalSeats ? Number(data.totalSeats) : null,
      type: data.type,
      venue: data.type === "ONSITE" ? data.venue : null,
      joinLink: data.type === "ONLINE" ? data.joinLink : null,
      startTime: start,
      endTime: end,
      featuredImage: featuredImageUrl,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      createdById: organizerId,
      hosts: {
        create: uniqueHostEmails.map((email) => ({ email })), // ✅ Only unique emails
      },
      attachments: {
        create: (attachmentUrls ?? []).map((file) => ({
          fileUrl: file.fileUrl,
          fileType: file.fileType,
        })),
      },
    },
    include: {
      hosts: true,
      attachments: true,
      createdBy: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  return event;
}


// Update Event Service
export async function updateEvent(
  eventId: string,
  userId: string,
  data: CreateEvent,
  featuredImageUrl: string | null,
  attachments: { fileUrl: string; fileType: "image" | "video" }[]
) {
  // --- Fetch existing event ---
  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: { 
      hosts: true, 
      attachments: true,
      createdBy: true 
    },
  });

  if (!existingEvent) throw new Error("Event not found");

  // --- Ownership check ---
  if (existingEvent.createdById !== userId) {
    throw new Error("Forbidden: You can only update your own events");
  }

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
  if (!featuredImageUrl && !existingEvent.featuredImage) {
    missingFields.push("featuredImage");
  }

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

  // --- Time validation ---
  const start = new Date(data.startTime);
  const end = new Date(data.endTime);

  if (start >= end) {
    throw new Error("Start time must be before end time");
  }

  // --- Parse hostEmails ---
  let parsedHostEmails: string[] = [];
  const hostEmailsValue = data.hostEmails as unknown;
  
  if (hostEmailsValue) {
    if (Array.isArray(hostEmailsValue)) {
      parsedHostEmails = hostEmailsValue.map((email: string) => email.trim());
    } else if (typeof hostEmailsValue === "string") {
      try {
        const parsed = JSON.parse(hostEmailsValue);
        if (Array.isArray(parsed)) {
          parsedHostEmails = parsed.map((email: string) => email.trim());
        } else {
          parsedHostEmails = hostEmailsValue
            .split(",")
            .map((email: string) => email.trim())
            .filter((email: string) => email.length > 0);
        }
      } catch {
        parsedHostEmails = hostEmailsValue
          .split(",")
          .map((email: string) => email.trim())
          .filter((email: string) => email.length > 0);
      }
    }

    const invalidEmails = parsedHostEmails.filter((email: string) => !isEmail(email));
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid host email format: ${invalidEmails.join(", ")}`);
    }
  }

  // Organizer always first host
  const hostEmails = [existingEvent.createdBy.email, ...parsedHostEmails];
  const uniqueHostEmails = [...new Set(hostEmails.map((e) => e.toLowerCase()))];

  // --- Update event ---
  const updatedEvent = await prisma.$transaction(async (tx) => {
    // Fetch existing host emails in DB
    const existingHosts = await tx.eventHost.findMany({
      where: { eventId },
      select: { email: true },
    });
    const existingEmails = existingHosts.map((h) => h.email.toLowerCase());

    // Find new hosts that need to be added
    const newHosts = uniqueHostEmails.filter((email) => !existingEmails.includes(email));

    return await tx.event.update({
      where: { id: eventId },
      data: {
        title: data.title,
        description: data.description,
        totalSeats: data.totalSeats ? Number(data.totalSeats) : null,
        type: data.type,
        venue: data.type === "ONSITE" ? data.venue : null,
        joinLink: data.type === "ONLINE" ? data.joinLink : null,
        startTime: start,
        endTime: end,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        featuredImage: featuredImageUrl || existingEvent.featuredImage,
        hosts: newHosts.length
          ? {
              create: newHosts.map((email: string) => ({ email })),
            }
          : undefined,
        attachments:
          attachments.length > 0
            ? {
                create: attachments.map((file) => ({
                  fileUrl: file.fileUrl,
                  fileType: file.fileType,
                })),
              }
            : undefined,
      },
      include: { 
        hosts: true, 
        attachments: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  });

  return updatedEvent;
}


// Delete Event Attachemnt Service
export async function deleteEventAttachment(
  attachmentId: string,
  userId: string
) {
  // --- Fetch attachment with event & creator ---
  const attachment = await prisma.eventAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      event: {
        include: { 
          createdBy: true // Include the event creator
        }
      }
    }
  });

  if (!attachment) throw new Error("Attachment not found");

  const event = attachment.event;

  // --- Ownership check - Only the event creator can delete attachments ---
  if (event.createdById !== userId) {
    throw new Error("Forbidden: You can only modify your own events");
  }

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

  return { success: true, message: "Attachment deleted successfully" };
}


// Delete event service (enhanced)
export async function deleteEvent(eventId: string, userId: string) {
  try {
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
      include: { 
        createdBy: true,
        attachments: true // Include attachments for Cloudinary cleanup
      },
    });

    if (!existingEvent) {
      throw new Error("Event not found");
    }

    // --- Ownership check - Only the event creator can delete ---
    if (existingEvent.createdById !== userId) {
      throw new Error("Forbidden: You can only delete your own events");
    }

    // --- Delete event using transaction to handle foreign key constraints ---
    await prisma.$transaction(async (tx) => {
      // 1. First delete all related records
      await tx.eventHost.deleteMany({
        where: { eventId }
      });

      await tx.eventParticipant.deleteMany({
        where: { eventId }
      });

      await tx.eventAttachment.deleteMany({
        where: { eventId }
      });

      // 2. Then delete the event itself
      await tx.event.delete({
        where: { id: eventId }
      });
    });

    // --- Delete media files from Cloudinary ---
    try {
      // Delete featured image
      const featuredPublicId = existingEvent.featuredImage.split("/").pop()?.split(".")[0];
      if (featuredPublicId) {
        await cloudinary.uploader.destroy(`events/featured/${featuredPublicId}`);
      }

      // Delete all attachment files
      for (const attachment of existingEvent.attachments) {
        const attachmentPublicId = attachment.fileUrl.split("/").pop()?.split(".")[0];
        if (attachmentPublicId) {
          await cloudinary.uploader.destroy(`events/attachments/${attachmentPublicId}`);
        }
      }
    } catch (cloudinaryError) {
      console.error("Cloudinary deletion failed:", cloudinaryError);
      // Don't throw error here - the DB transaction already succeeded
    }

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete event: ${error.message}`);
    }
    throw new Error("Failed to delete event due to an unknown error");
  }
}


// Get My Events Service (only events created by user)
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

  // Total count of user's created events
  const totalCount = await prisma.event.count({
    where: {
      createdById: userId, // Only events created by this user
      ...searchFilter,
    },
  });

  const events = await prisma.event.findMany({
    where: {
      createdById: userId, // Only events created by this user
      ...searchFilter,
    },
    include: {
      hosts: true,
      attachments: { 
        select: { 
          id: true, 
          fileUrl: true, 
          fileType: true 
        } 
      },
      participants: true,
    },
    orderBy: { createdAt: "desc" },
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

  // Total count of events created by organizers
  const totalCount = await prisma.event.count({
    where: {
      createdBy: {
        role: "ORGANIZER" // Filter by organizer-created events
      },
      ...searchFilter,
    },
  });

  // Fetch paginated events created by organizers
  const events = await prisma.event.findMany({
    where: {
      createdBy: {
        role: "ORGANIZER" // Filter by organizer-created events
      },
      ...searchFilter,
    },
    include: {
      hosts: true,
      attachments: { 
        select: { 
          id: true, 
          fileUrl: true, 
          fileType: true 
        } 
      },
      participants: true,
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
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


// Get event by id service with host user details
export async function getEventById(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hosts: true,
      attachments: true,
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      },
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          avatarUrl: true
        }
      }
    },
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Get user details for hosts that are system users
  const hostEmails = event.hosts.map(host => host.email);
  const hostUsers = await prisma.user.findMany({
    where: {
      email: { in: hostEmails }
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      avatarUrl: true
    }
  });

  // Combine host data with user details
  const enhancedHosts = event.hosts.map(host => {
    const user = hostUsers.find(u => u.email === host.email);
    return {
      ...host,
      user: user || null // Add user details if available
    };
  });

  return {
    ...event,
    hosts: enhancedHosts
  };
}



// Update Event Status Service
export async function updateEventStatus(
  eventId: string,
  userId: string,
  status: "ACTIVE" | "ENDED" | "CANCELLED"
) {
  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId },
    include: { 
      createdBy: true // Include creator info for ownership check
    },
  });

  if (!existingEvent) throw new Error("Event not found");

  // Only event creator can update status
  if (existingEvent.createdById !== userId) {
    throw new Error("Forbidden: You can only update your own events");
  }

  // Update status
  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: { status },
    include: { 
      hosts: true, 
      attachments: true,
      createdBy: {
        select: {
          id: true,
          fullName: true,
          email: true,
        }
      }
    },
  });

  return updatedEvent;
}