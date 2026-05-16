import { FlaskConical, MonitorSmartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { PopupSurfaceMode } from '../types';
import { PopupModeSwitchBody, PopupModeSwitchCard } from './PopupPrimitives';

interface PopupModeSwitchProps {
  mode: PopupSurfaceMode;
  onModeChange: (mode: PopupSurfaceMode) => void;
}

export function PopupModeSwitch({ mode, onModeChange }: PopupModeSwitchProps) {
  const isUserMode = mode === 'user';

  return (
    <PopupModeSwitchCard>
      <PopupModeSwitchBody>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Popup surface</p>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            {isUserMode ? <MonitorSmartphone className="size-4 text-sky-700" /> : <FlaskConical className="size-4 text-amber-700" />}
            <span>{isUserMode ? 'User-facing UI' : 'Testing UI'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${isUserMode ? 'text-slate-400' : 'text-slate-700'}`}>Testing</span>
          <Switch checked={isUserMode} onCheckedChange={(checked) => onModeChange(checked ? 'user' : 'testing')} />
          <span className={`text-xs font-medium ${isUserMode ? 'text-sky-700' : 'text-slate-400'}`}>User</span>
        </div>
      </PopupModeSwitchBody>
    </PopupModeSwitchCard>
  );
}
