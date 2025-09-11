import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@shared/utils/cn';
import { Label } from '@shared/components/ui/label';
import { Input } from '@shared/components/ui/input';
import type { FormField, FormState, ValidationError } from '@shared/utils/validation';

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  children: React.ReactNode;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, onSubmit, children, ...props }, ref) => {
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (onSubmit) {
        await onSubmit(e);
      }
    };

    return (
      <form
        ref={ref}
        className={cn('space-y-6', className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    );
  }
);
Form.displayName = 'Form';

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export const FormField = ({ children, className }: FormFieldProps) => {
  return <div className={cn('space-y-2', className)}>{children}</div>;
};

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <Label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {children}
        {required && <span className="text-danger-500 ml-1">*</span>}
      </Label>
    );
  }
);
FormLabel.displayName = 'FormLabel';

interface FormControlProps {
  children: React.ReactNode;
  className?: string;
}

export const FormControl = ({ children, className }: FormControlProps) => {
  return <div className={cn('relative', className)}>{children}</div>;
};

const formInputVariants = cva(
  'flex h-10 w-full rounded-md border px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-carbon-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      validation: {
        default: 'border-carbon-200 bg-white focus-visible:ring-primary-400',
        error: 'border-danger-300 bg-danger-50 focus-visible:ring-danger-400',
        success: 'border-success-300 bg-success-50 focus-visible:ring-success-400',
        validating: 'border-warning-300 bg-warning-50 focus-visible:ring-warning-400',
      },
    },
    defaultVariants: {
      validation: 'default',
    },
  }
);

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof formInputVariants> {
  error?: string;
  isValidating?: boolean;
  showValidation?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, validation, error, isValidating, showValidation = true, ...props }, ref) => {
    const getValidationState = () => {
      if (isValidating) return 'validating';
      if (error && showValidation) return 'error';
      if (!error && props.value && showValidation) return 'success';
      return 'default';
    };

    return (
      <div className="relative">
        <Input
          ref={ref}
          className={cn(formInputVariants({ validation: getValidationState() }), className)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${props.id}-error` : undefined}
          {...props}
        />
        {showValidation && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {isValidating && (
              <Loader2 className="h-4 w-4 text-warning-500 animate-spin" />
            )}
            {!isValidating && error && (
              <AlertCircle className="h-4 w-4 text-danger-500" />
            )}
            {!isValidating && !error && props.value && (
              <CheckCircle className="h-4 w-4 text-success-500" />
            )}
          </div>
        )}
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

interface FormErrorProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export const FormError = ({ children, className, id }: FormErrorProps) => {
  if (!children) return null;

  return (
    <p
      id={id}
      className={cn('text-sm font-medium text-danger-600', className)}
      role="alert"
      aria-live="polite"
    >
      {children}
    </p>
  );
};

interface FormDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const FormDescription = ({ children, className }: FormDescriptionProps) => {
  return <p className={cn('text-sm text-carbon-600', className)}>{children}</p>;
};

interface FormValidationSummaryProps {
  errors: ValidationError[];
  className?: string;
  title?: string;
}

export const FormValidationSummary = ({
  errors,
  className,
  title = 'Please correct the following errors:',
}: FormValidationSummaryProps) => {
  if (errors.length === 0) return null;

  return (
    <div
      className={cn(
        'rounded-md border border-danger-200 bg-danger-50 p-4',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-danger-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-danger-800">{title}</h3>
          <div className="mt-2 text-sm text-danger-700">
            <ul role="list" className="list-disc space-y-1 pl-5">
              {errors.map((error, index) => (
                <li key={index}>
                  <strong>{error.field}:</strong> {error.message}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export function useFormField<T>(
  initialValue: T,
  validator?: (value: T) => { isValid: boolean; error?: string }
) {
  const [field, setField] = React.useState<FormField<T>>({
    value: initialValue,
    error: undefined,
    touched: false,
    isValidating: false,
  });

  const setValue = React.useCallback((value: T) => {
    setField(prev => ({ ...prev, value, touched: true }));
  }, []);

  const setError = React.useCallback((error: string | undefined) => {
    setField(prev => ({ ...prev, error, isValidating: false }));
  }, []);

  const setValidating = React.useCallback((isValidating: boolean) => {
    setField(prev => ({ ...prev, isValidating }));
  }, []);

  const validate = React.useCallback(() => {
    if (!validator) return;
    
    setValidating(true);
    const result = validator(field.value);
    setError(result.isValid ? undefined : result.error);
  }, [field.value, validator, setValidating, setError]);

  const reset = React.useCallback(() => {
    setField({
      value: initialValue,
      error: undefined,
      touched: false,
      isValidating: false,
    });
  }, [initialValue]);

  return {
    ...field,
    setValue,
    setError,
    setValidating,
    validate,
    reset,
  };
}

interface ControlledFormInputProps extends Omit<FormInputProps, 'value' | 'onChange'> {
  label: string;
  field: FormField<string>;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  description?: string;
}

export const ControlledFormInput = React.forwardRef<HTMLInputElement, ControlledFormInputProps>(
  ({ label, field, onValueChange, onBlur, required, description, ...props }, ref) => {
    return (
      <FormField>
        <FormLabel htmlFor={props.id} required={required}>
          {label}
        </FormLabel>
        <FormControl>
          <FormInput
            ref={ref}
            value={field.value}
            onChange={(e) => onValueChange(e.target.value)}
            onBlur={onBlur}
            error={field.touched ? field.error : undefined}
            isValidating={field.isValidating}
            {...props}
          />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormError id={`${props.id}-error`}>{field.touched ? field.error : undefined}</FormError>
      </FormField>
    );
  }
);
ControlledFormInput.displayName = 'ControlledFormInput';