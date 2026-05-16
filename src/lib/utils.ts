import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// This function is used to conditionally join classNames together,
// and also merge Tailwind CSS classes to avoid conflicts.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
