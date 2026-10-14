import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface WrapperProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
  className?: string;
}

function FieldWrapper({ label, error, hint, required, children, className }: WrapperProps) {
  const id = useId();
  const descId = error || hint ? `${id}-desc` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-brand-500" aria-hidden>*</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': descId })}
      {error ? (
        <p id={descId} className="mt-1.5 text-xs text-red-500" role="alert">{error}</p>
      ) : hint ? (
        <p id={descId} className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: string; wrapperClassName?: string };

export function TextField({ label, error, hint, required, wrapperClassName, className, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {(a) => <input {...a} {...props} required={required} className={cn('field', error && 'field-error', className)} />}
    </FieldWrapper>
  );
}

export function TextAreaField({ label, error, hint, required, wrapperClassName, className, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {(a) => <textarea {...a} {...props} required={required} className={cn('field min-h-[96px] resize-y', error && 'field-error', className)} />}
    </FieldWrapper>
  );
}

export function SelectField({ label, error, hint, required, wrapperClassName, className, children, ...props }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      {(a) => (
        <select {...a} {...props} required={required} className={cn('field appearance-none bg-no-repeat pr-9', error && 'field-error', className)} style={selectArrow}>
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}

export const selectArrow = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239494aa' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1rem',
} as const;
