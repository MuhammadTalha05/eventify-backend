// types/event.types.ts
import { eventType } from "@prisma/client";

export interface CreateEvent {
  title: string;
  description: string;
  totalSeats?: number;
  type: eventType; // "ONSITE" | "ONLINE"
  venue?: string;
  joinLink?: string;
  startTime: string | Date;
  endTime: string | Date;
  contactEmail: string;
  contactPhone: string;
  featuredImage: string;
  hostEmails?: string[]; // New field for additional host emails
  attachments?: { fileUrl: string; fileType: "image" | "video" }[];
}

export interface GetAllOptions {
  page?: number;    
  limit?: number;  
  search?: string; 
}

