// types/event.types.ts
import { eventType } from "@prisma/client";

export interface CreateEvent {
  title: string;
  description: string;
  totalSeats?: number;
  type: eventType;
  venue?: string;
  joinLink?: string;
  startTime: Date;
  endTime: Date;
  featuredImage: string;
  contactEmail: string;
  contactPhone: string;
}


export interface GetAllOptions {
  page?: number;    
  limit?: number;  
  search?: string; 
}

