import { CircleHelp, Cog, LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AudienceMode, PopupStatusTone } from '../types';
import { PopupBrand } from './PopupBrand';
import { PopupHomeCard, PopupHomeCardBody, PopupHomeCardHeader, PopupStatusMessage } from './PopupPrimitives';

interface PopupHomeProps {
  audienceMode: AudienceMode;
  isScanning: boolean;
  statusMessage: string;
  statusTone: PopupStatusTone;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
  onRunAnalysis: () => void;
}

export function PopupHome({
  audienceMode,
  isScanning,
  statusMessage,
  statusTone,
  onOpenSettings,
  onOpenInfo,
  onRunAnalysis
}: PopupHomeProps) {
  const isUserAudience = audienceMode === 'user';

  return (
    <PopupHomeCard>
      <PopupHomeCardHeader>
        <div className="flex items-start justify-between gap-4">
          <PopupBrand
            subtitle={
              isUserAudience
                ? 'Scan the current page for deceptive-pattern signals before you act on it.'
                : 'Review the active page with a cleaner analyst-facing deceptive-pattern scan.'
            }
          />
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onOpenSettings}>
                <Cog className="size-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenInfo}>
                <CircleHelp className="size-4 mr-2" />
                Info
              </Button>
            </div>
            <Badge variant="secondary" className="inline-flex justify-center border border-slate-200 bg-slate-50 text-center text-slate-700">
              {isUserAudience ? 'USER mode' : 'DESIGNER mode'}
            </Badge>
          </div>
        </div>
      </PopupHomeCardHeader>

      <PopupHomeCardBody>
        <Button className="h-11 w-full rounded-lg text-sm font-semibold" onClick={onRunAnalysis} disabled={isScanning}>
          {isScanning ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Running analysis
            </>
          ) : (
            'Run analysis'
          )}
        </Button>

        {statusTone === 'error' ? (
          <PopupStatusMessage tone={statusTone}>{statusMessage}</PopupStatusMessage>
        ) : null}
      </PopupHomeCardBody>
    </PopupHomeCard>
  );
}
