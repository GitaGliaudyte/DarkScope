import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AudienceMode } from '../types';

interface RealPopupSettingsScreenProps {
  audienceMode: AudienceMode;
  onAudienceModeChange: (mode: AudienceMode) => void;
  onBack: () => void;
}

export function RealPopupSettingsScreen({
  audienceMode,
  onAudienceModeChange,
  onBack
}: RealPopupSettingsScreenProps) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/90 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.65)] backdrop-blur">
      <CardHeader className="gap-4 pb-4">
        <div className="space-y-4">
          <Button variant="ghost" className="w-fit px-0 text-sm text-slate-600 hover:bg-transparent hover:text-slate-950" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Go back
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-xl text-slate-950">Settings</CardTitle>
            <CardDescription className="text-sm text-slate-600">Choose how results should be presented.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm font-medium text-slate-900">
          Display mode
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(['user', 'designer'] as const).map((mode) => {
            const isActive = audienceMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onAudienceModeChange(mode)}
                className={cn(
                  'rounded-2xl border px-4 py-4 text-center transition-colors',
                  isActive
                    ? 'border-sky-300 bg-sky-50 text-sky-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                <span className="block text-sm font-semibold uppercase tracking-[0.14em]">{mode}</span>
                <span className="mt-2 block text-xs leading-5 text-inherit/80">
                  {mode === 'user' ? 'Simpler result view.' : 'More rule-level detail.'}
                </span>
              </button>
            );
          })}
        </div>
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {audienceMode === 'user'
            ? 'USER mode keeps the output simpler.'
            : 'DESIGNER mode shows more rule-level detail.'}
        </p>
      </CardContent>
    </Card>
  );
}
