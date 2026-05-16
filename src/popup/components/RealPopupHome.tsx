import { CircleHelp, LoaderCircle, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AudienceMode, PopupStatusTone } from '../types';
import { PopupBrand } from './PopupBrand';

interface RealPopupHomeProps {
  audienceMode: AudienceMode;
  isScanning: boolean;
  statusMessage: string;
  statusTone: PopupStatusTone;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onRunAnalysis: () => void;
}

function statusClasses(tone: PopupStatusTone): string {
  if (tone === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (tone === 'error') {
    return 'border-rose-200 bg-rose-50 text-rose-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export function RealPopupHome({
  audienceMode,
  isScanning,
  statusMessage,
  statusTone,
  onOpenSettings,
  onOpenInfo,
  onRunAnalysis
}: RealPopupHomeProps) {
  const isUserAudience = audienceMode === 'user';

  return (
    <Card className="overflow-hidden border-white/60 bg-white/88 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.65)] backdrop-blur">
      <div className="bg-[linear-gradient(135deg,rgba(14,116,144,0.12),rgba(250,204,21,0.08))]">
        <CardHeader className="gap-4 pb-5">
          <div className="flex items-start justify-between gap-4">
            <PopupBrand
              subtitle={
                isUserAudience
                  ? 'Scan the current page for dark-pattern signals before you act on it.'
                  : 'Review the active page with a cleaner analyst-facing dark-pattern scan.'
              }
            />
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className="justify-center text-center border-0 bg-white/80 text-sky-900">
                {isUserAudience ? 'USER mode' : 'DESIGNER mode'}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" aria-label="Popup settings" onClick={onOpenSettings}>
                  <Settings2 className="size-4" />
                </Button>
                <Button variant="outline" size="icon" aria-label="How DarkScope works" onClick={onOpenInfo}>
                  <CircleHelp className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </div>

      <CardContent className="space-y-4">
        <Button className="h-12 w-full rounded-xl text-sm font-semibold" onClick={onRunAnalysis} disabled={isScanning}>
          {isScanning ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Running analysis
            </>
          ) : (
            'Run analysis'
          )}
        </Button>

        <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${statusClasses(statusTone)}`}>{statusMessage}</div>
      </CardContent>
    </Card>
  );
}
