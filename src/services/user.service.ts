import prisma from "../config/db.config";
import { isPhoneNumber, isStrongPassword } from "../utils/validation.util";
import { hashPassword, comparePassword } from "../utils/hash.util";
import { GetAllOptions } from "../types/event.type";


// Get single user profile by ID
export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new Error("User not found");
  return user;
}


// Update user profile
export async function updateUserProfile(
  userId: string,
  data: { fullName?: string; phone?: string; avatarUrl?: string }
) {
  if (data.phone && !isPhoneNumber(data.phone)) {
    throw new Error("Phone number must be in format +92XXXXXXXXXX or 03XXXXXXXXX");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new Error("User not found or update failed");
  return user;
}

// Get All User For SUPER_ADMIN
export async function getAllUsers(superAdminId: string, options: GetAllOptions = {}) {
  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = 9; // fixed per page
  const skip = (page - 1) * limit;

  // Build search filter
  const searchFilter = options.search
    ? {
        OR: [
          { fullName: { contains: options.search, mode: "insensitive" as const } },
          { email: { contains: options.search, mode: "insensitive" as const } },
        ],
      }
    : {};

  // Total count of users
  const totalCount = await prisma.user.count({
    where: {
      NOT: { id: superAdminId },
      ...searchFilter,
    },
  });

  // Fetch paginated users
  const users = await prisma.user.findMany({
    where: {
      NOT: { id: superAdminId },
      ...searchFilter,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
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
      currentCount: users.length,
    },
    data: users,
  };
}

// Change user role (SUPER_ADMIN only)
export async function changeUserRole(userId: string, newRole: "ORGANIZER" | "PARTICIPANT") {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      updatedAt: true,
    },
  });

  if (!user) throw new Error("User not found or role update failed");
  return user;
}


// Update User Password
export async function updateUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  if (!user.passwordHash) {
    throw new Error("This account does not have a password set");
  }
  
  const isMatch = await comparePassword(oldPassword, user.passwordHash);
  if (!isMatch) {
    throw new Error("Old password is incorrect");
  }
  if (!isStrongPassword(newPassword)) throw new Error("New Password must be at least 8 chars and contain letters and numbers");

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashedPassword },
  });

  return true;
}


// Deleet user service
// Delete user service
export async function deleteUser(userId: string) {
  // First check if user exists
  const userToDelete = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!userToDelete) {
    throw new Error("User not found");
  }

  // Use transaction to ensure all operations succeed or fail together
  await prisma.$transaction(async (tx) => {
    // 1. Delete user's participations in events
    await tx.eventParticipant.deleteMany({ where: { userId } });
    
    // 2. Delete OTP requests
    await tx.otpRequest.deleteMany({ where: { userId } });
    
    // 3. Delete refresh tokens
    await tx.refreshToken.deleteMany({ where: { userId } });
    
    // 4. Remove user from event hosts (by email since eventHost stores emails)
    await tx.eventHost.deleteMany({ where: { email: userToDelete.email } });
    
    // 5. Delete events created by this user (with all related data)
    const eventsToDelete = await tx.event.findMany({
      where: { createdById: userId },
      select: { id: true }
    });

    for (const event of eventsToDelete) {
      // Delete event-related data first
      await tx.eventHost.deleteMany({ where: { eventId: event.id } });
      await tx.eventParticipant.deleteMany({ where: { eventId: event.id } });
      await tx.eventAttachment.deleteMany({ where: { eventId: event.id } });
      
      // Then delete the event
      await tx.event.delete({ where: { id: event.id } });
    }
    
    // 6. Finally delete the user
    await tx.user.delete({ where: { id: userId } });
  });

  return {
    id: userToDelete.id,
    fullName: userToDelete.fullName,
    email: userToDelete.email,
    role: userToDelete.role,
    message: "User and all associated data deleted successfully"
  };
}
