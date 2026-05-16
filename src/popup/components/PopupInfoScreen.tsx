import { PopupCard, PopupMutedPanel, PopupScreenHeader, PopupTextBody } from './PopupPrimitives';

interface PopupInfoScreenProps {
  onBack: () => void;
}

export function PopupInfoScreen({ onBack }: PopupInfoScreenProps) {
  return (
    <PopupCard>
      <PopupScreenHeader title="Information" description="How the tool works and what to expect." onBack={onBack} />
      <PopupTextBody>
        <PopupMutedPanel>Sample text text text text</PopupMutedPanel>
      </PopupTextBody>
    </PopupCard>
  );
}
