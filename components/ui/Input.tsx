import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand',
          className
        )}
        {...props}
      />
    </div>
  );
}
