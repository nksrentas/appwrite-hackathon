import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be less than 50 characters')
  .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number');

export const positiveNumberSchema = z
  .number()
  .positive('Value must be positive')
  .finite('Value must be a valid number');

export const carbonAmountSchema = z
  .number()
  .min(0, 'Carbon amount cannot be negative')
  .max(1000000, 'Carbon amount seems too large')
  .finite('Carbon amount must be a valid number');

export const energyUsageSchema = z
  .number()
  .min(0, 'Energy usage cannot be negative')
  .max(100000, 'Energy usage seems too large')
  .finite('Energy usage must be a valid number');

export const distanceSchema = z
  .number()
  .min(0, 'Distance cannot be negative')
  .max(50000, 'Distance seems too large')
  .finite('Distance must be a valid number');

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: ValidationError[];
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validatedData = schema.parse(data);
    return {
      success: true,
      data: validatedData,
      errors: [],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        errors,
      };
    }
    return {
      success: false,
      errors: [{ field: 'general', message: 'Validation failed' }],
    };
  }
}

export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown
): { isValid: boolean; error?: string } {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.errors[0]?.message || 'Invalid value',
      };
    }
    return {
      isValid: false,
      error: 'Validation failed',
    };
  }
}

export function createDebouncedValidator<T>(
  schema: z.ZodSchema<T>,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (value: unknown, callback: (result: { isValid: boolean; error?: string }) => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const result = validateField(schema, value);
      callback(result);
    }, delay);
  };
}

export interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  isValidating: boolean;
}

export interface FormState<T extends Record<string, any>> {
  fields: { [K in keyof T]: FormField<T[K]> };
  isSubmitting: boolean;
  isValid: boolean;
  submitError?: string;
}

export function createInitialFormState<T extends Record<string, any>>(
  initialValues: T
): FormState<T> {
  const fields = {} as { [K in keyof T]: FormField<T[K]> };
  
  for (const key in initialValues) {
    fields[key] = {
      value: initialValues[key],
      error: undefined,
      touched: false,
      isValidating: false,
    };
  }

  return {
    fields,
    isSubmitting: false,
    isValid: false,
    submitError: undefined,
  };
}

export function updateFormField<T extends Record<string, any>, K extends keyof T>(
  state: FormState<T>,
  fieldName: K,
  updates: Partial<FormField<T[K]>>
): FormState<T> {
  return {
    ...state,
    fields: {
      ...state.fields,
      [fieldName]: {
        ...state.fields[fieldName],
        ...updates,
      },
    },
  };
}

export function getFormValues<T extends Record<string, any>>(
  state: FormState<T>
): T {
  const values = {} as T;
  for (const key in state.fields) {
    values[key] = state.fields[key].value;
  }
  return values;
}

export function getFormErrors<T extends Record<string, any>>(
  state: FormState<T>
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key in state.fields) {
    if (state.fields[key].error) {
      errors[key] = state.fields[key].error;
    }
  }
  return errors;
}

export function hasFormErrors<T extends Record<string, any>>(
  state: FormState<T>
): boolean {
  return Object.values(state.fields).some(field => field.error);
}

export const customValidators = {
  isValidCarbonSource: (value: string) => {
    const validSources = ['electricity', 'gas', 'transportation', 'waste', 'other'];
    return validSources.includes(value.toLowerCase());
  },
  
  isValidTransportationType: (value: string) => {
    const validTypes = ['car', 'bus', 'train', 'plane', 'bike', 'walk', 'other'];
    return validTypes.includes(value.toLowerCase());
  },
  
  isValidEnergyUnit: (value: string) => {
    const validUnits = ['kwh', 'mwh', 'gwh', 'btu', 'joule', 'calorie'];
    return validUnits.includes(value.toLowerCase());
  },
  
  isValidEmissionScope: (value: string) => {
    const validScopes = ['scope1', 'scope2', 'scope3'];
    return validScopes.includes(value.toLowerCase());
  }
};

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const carbonCalculationSchema = z.object({
  activityType: z.string().min(1, 'Activity type is required'),
  amount: carbonAmountSchema,
  unit: z.string().min(1, 'Unit is required'),
  date: z.date(),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
});

export const userPreferencesSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
  units: z.object({
    distance: z.enum(['km', 'miles']),
    energy: z.enum(['kwh', 'btu']),
    temperature: z.enum(['celsius', 'fahrenheit']),
  }),
  privacy: z.object({
    shareData: z.boolean(),
    publicProfile: z.boolean(),
    dataRetention: z.enum(['1year', '2years', '5years', 'indefinite']),
  }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CarbonCalculationFormData = z.infer<typeof carbonCalculationSchema>;
export type UserPreferencesFormData = z.infer<typeof userPreferencesSchema>;