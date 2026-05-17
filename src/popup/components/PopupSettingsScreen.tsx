import { cn } from '@/lib/utils';
import { AudienceMode } from '../types';
import { PopupCard, PopupCardBody, PopupMutedPanel, PopupScreenHeader } from './PopupPrimitives';

interface PopupSettingsScreenProps {
  audienceMode: AudienceMode;
  onAudienceModeChange: (mode: AudienceMode) => void;
  onBack: () => void;
}

export function PopupSettingsScreen({
  audienceMode,
  onAudienceModeChange,
  onBack
}: PopupSettingsScreenProps) {
  return (
    <PopupCard>
      <PopupScreenHeader title="Settings" description="Choose how results should be presented." onBack={onBack} />

      <PopupCardBody>
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
      </PopupCardBody>
    </PopupCard>
  );
}
