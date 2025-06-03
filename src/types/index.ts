import type { Timestamp } from "firebase/firestore";

export interface LockboxEntry {
  id: string; // Firestore document ID
  userId: string;
  propertyName: string;
  unitNumber: string;
  lockboxLocation: string;
  lockboxCode: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// For form data, dates might be JS Date objects before conversion
export interface LockboxFormData {
  propertyName: string;
  unitNumber: string;
  lockboxLocation: string;
  lockboxCode: string;
  notes?: string;
}
