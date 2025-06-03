import { z } from 'zod';

export const lockboxFormSchema = z.object({
  propertyName: z.string().min(1, "Property name is required."),
  unitNumber: z.string().min(1, "Unit number is required."),
  lockboxLocation: z.string().min(1, "Lockbox location is required."),
  lockboxCode: z.string().min(1, "Lockbox code is required."),
  notes: z.string().optional(),
});

export type LockboxFormValues = z.infer<typeof lockboxFormSchema>;
