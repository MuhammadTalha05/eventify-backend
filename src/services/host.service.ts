import prisma from "../config/db.config";

// Delete Host Service
export async function deleteHost(
  eventId: string,
  hostId: string,
  organizerId: string
) {
  // First get the event with creator information
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      createdBy: true,
      hosts: true
    }
  });

  if (!event) {
    throw new Error("Event not found");
  }

  // Check if the user is the event creator
  if (event.createdById !== organizerId) {
    throw new Error("Forbidden: Only the event organizer can delete hosts");
  }

  // Find the host to be deleted
  const hostToDelete = event.hosts.find(host => host.id === hostId);
  if (!hostToDelete) {
    throw new Error("Host not found in this event");
  }

  // Prevent deleting the event creator (organizer) from hosts
  // Since the organizer's email is always in hosts, we need to check if this is the organizer
  const organizerUser = await prisma.user.findUnique({
    where: { id: organizerId },
    select: { email: true }
  });

  if (!organizerUser) {
    throw new Error("Organizer not found");
  }

  if (hostToDelete.email === organizerUser.email) {
    throw new Error("Cannot remove the event organizer from hosts");
  }

  // Delete the host
  await prisma.eventHost.delete({
    where: { id: hostId }
  });

  return { 
    success: true, 
    message: "Host deleted successfully",
    deletedHost: hostToDelete
  };
}