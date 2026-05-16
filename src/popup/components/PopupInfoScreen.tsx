import { PopupCard, PopupMutedPanel, PopupScreenHeader, PopupTextBody } from './PopupPrimitives';

interface PopupInfoScreenProps {
  onBack: () => void;
}

export function PopupInfoScreen({ onBack }: PopupInfoScreenProps) {
  return (
    <PopupCard>
      <PopupScreenHeader title="Information" description="How the tool works and what to expect." onBack={onBack} />

      <PopupTextBody>
        <PopupMutedPanel>
          DarkScope scans the active page, checks for dark-pattern signals, and can highlight flagged areas with an overlay.
        </PopupMutedPanel>
        <PopupMutedPanel>
          Some checks may depend on a saved Gemini API key, and unsupported or not-yet-ready pages may fail to analyze.
        </PopupMutedPanel>
      </PopupTextBody>
    </PopupCard>
  );
}
