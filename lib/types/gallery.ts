// Shared gallery types
export interface GalleryImage {
  id: number;
  imageUrl: string;
  title: string;
  categoryId: number;
  categoryName?: string;
  subcategoryId?: number;
  subcategoryName?: string;
  uploadedAt: string;
}

export interface BlockedTime {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  remainingCapacity: number;
}

export interface BackendTimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  remainingCapacity: number;
}
