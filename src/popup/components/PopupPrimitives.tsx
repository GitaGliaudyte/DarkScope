import * as React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PopupStatusTone } from '../types';

type PopupCardProps = React.ComponentPropsWithoutRef<typeof Card>;
type PopupCardHeaderProps = React.ComponentPropsWithoutRef<typeof CardHeader>;
type PopupCardBodyProps = React.ComponentPropsWithoutRef<typeof CardContent>;

interface PopupPanelProps extends React.HTMLAttributes<HTMLDivElement> {}

interface PopupBackButtonProps extends ButtonProps {
  tone?: 'inline' | 'raised';
}

interface PopupScreenHeaderProps {
  title: string;
  description?: string;
  onBack: () => void;
  backTone?: PopupBackButtonProps['tone'];
  action?: React.ReactNode;
}

interface PopupStatusMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: PopupStatusTone;
}

interface PopupDismissibleAlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: PopupStatusTone;
  title?: string;
  onDismiss: () => void;
}

function statusToneClassName(tone: PopupStatusTone): string {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function PopupCard({ className, ...props }: PopupCardProps) {
  return (
    <Card
      className={cn('overflow-hidden rounded-none border-slate-200 bg-white shadow-sm', className)}
      {...props}
    />
  );
}

export function PopupHomeCard({ className, ...props }: PopupCardProps) {
  return <Card className={cn('overflow-hidden rounded-none border-slate-200 bg-white shadow-sm', className)} {...props} />;
}

export function PopupResultsCard({ className, ...props }: PopupCardProps) {
  return <Card className={cn('overflow-visible rounded-none border-slate-200 bg-white shadow-sm', className)} {...props} />;
}

export function PopupModeSwitchCard({ className, ...props }: PopupCardProps) {
  return <Card className={cn('rounded-none border-slate-200 bg-white shadow-sm', className)} {...props} />;
}

export function PopupCardHeaderSection({ className, ...props }: PopupCardHeaderProps) {
  return <CardHeader className={cn('gap-4 pb-4', className)} {...props} />;
}

export function PopupHomeCardHeader({ className, ...props }: PopupCardHeaderProps) {
  return <CardHeader className={cn('gap-4 pb-5', className)} {...props} />;
}

export function PopupCardBody({ className, ...props }: PopupCardBodyProps) {
  return <CardContent className={cn('space-y-3', className)} {...props} />;
}

export function PopupTextBody({ className, ...props }: PopupCardBodyProps) {
  return <CardContent className={cn('space-y-3 text-sm leading-6 text-slate-600', className)} {...props} />;
}

export function PopupHomeCardBody({ className, ...props }: PopupCardBodyProps) {
  return <CardContent className={cn('space-y-4', className)} {...props} />;
}

export function PopupResultsCardBody({ className, ...props }: PopupCardBodyProps) {
  return <CardContent className={cn('space-y-5 overflow-visible p-5', className)} {...props} />;
}

export function PopupModeSwitchBody({ className, ...props }: PopupCardBodyProps) {
  return <CardContent className={cn('flex items-center justify-between gap-4 p-4', className)} {...props} />;
}

export function PopupScreenHeader({ title, description, onBack, backTone = 'inline', action }: PopupScreenHeaderProps) {
  return (
    <PopupCardHeaderSection>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-4">
          <PopupBackButton tone={backTone} onClick={onBack}>
            <ArrowLeft className="size-4" />
            Go back
          </PopupBackButton>
          <div className="space-y-1">
            <CardTitle className="text-xl text-slate-950">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-sm text-slate-600">{description}</CardDescription>
            ) : null}
          </div>
        </div>
        {action ? <div className="pt-0.5">{action}</div> : null}
      </div>
    </PopupCardHeaderSection>
  );
}

export function PopupSummaryPanel({ className, ...props }: PopupPanelProps) {
  return (
    <div
      className={cn('overflow-visible rounded-xl border border-slate-200 bg-slate-50', className)}
      {...props}
    />
  );
}

export function PopupCompactSummaryPanel({ className, ...props }: PopupPanelProps) {
  return <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-slate-50', className)} {...props} />;
}

export function PopupMutedPanel({ className, ...props }: PopupPanelProps) {
  return <div className={cn('rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600', className)} {...props} />;
}

export function PopupDetailPanel({ className, ...props }: PopupPanelProps) {
  return <div className={cn('rounded-lg border border-slate-200 bg-white p-4', className)} {...props} />;
}

export function PopupStatusMessage({ tone, className, ...props }: PopupStatusMessageProps) {
  return <div className={cn('rounded-lg border px-4 py-3 text-sm leading-6', statusToneClassName(tone), className)} {...props} />;
}

export function PopupDismissibleAlert({
  tone = 'error',
  title,
  className,
  children,
  onDismiss,
  ...props
}: PopupDismissibleAlertProps) {
  return (
    <div className={cn('rounded-lg border px-4 py-3', statusToneClassName(tone), className)} {...props}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1 text-sm leading-6">
          {title ? <p className="font-medium">{title}</p> : null}
          {children}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 self-start rounded-md text-inherit opacity-80 hover:bg-black/5 hover:text-inherit hover:opacity-100"
          aria-label="Dismiss alert"
          title="Dismiss alert"
          onClick={onDismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function PopupActionButton({ className, variant, ...props }: ButtonProps) {
  return (
    <Button
      variant={variant ?? 'secondary'}
      className={cn(
        'h-auto min-h-11 min-w-0 whitespace-normal rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-medium leading-tight text-slate-900 hover:bg-slate-50',
        className
      )}
      {...props}
    />
  );
}

export function PopupBackButton({ tone = 'inline', className, variant, ...props }: PopupBackButtonProps) {
  return (
    <Button
      variant={variant ?? 'ghost'}
      className={cn(
        tone === 'raised'
          ? 'w-fit rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950'
          : 'w-fit px-0 text-sm text-slate-600 hover:bg-transparent hover:text-slate-950',
        className
      )}
      {...props}
    />
  );
}
