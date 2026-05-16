import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RealPopupInfoScreenProps {
  onBack: () => void;
}

export function RealPopupInfoScreen({ onBack }: RealPopupInfoScreenProps) {
  return (
    <Card className="overflow-hidden border-white/60 bg-white/90 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.65)] backdrop-blur">
      <CardHeader className="gap-4 pb-4">
        <div className="space-y-4">
          <Button variant="ghost" className="w-fit px-0 text-sm text-slate-600 hover:bg-transparent hover:text-slate-950" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Go back
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-xl text-slate-950">Information</CardTitle>
            <CardDescription className="text-sm text-slate-600">How the tool works and what to expect.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          DarkScope scans the active page, checks for dark-pattern signals, and can highlight flagged areas with an overlay.
        </p>
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          Some checks may depend on a saved Gemini API key, and unsupported or not-yet-ready pages may fail to analyze.
        </p>
      </CardContent>
    </Card>
  );
}
