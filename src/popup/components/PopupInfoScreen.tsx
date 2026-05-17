import { PopupCard, PopupMutedPanel, PopupScreenHeader, PopupTextBody } from './PopupPrimitives';

interface PopupInfoScreenProps {
  onBack: () => void;
}

const INFO_STEPS = [
  {
    title: 'Choose a mode',
    description: 'Analyze the page from one of two roles.'
  },
  {
    title: 'Capture the page',
    description: 'Decide when to analyze the current view.'
  },
  {
    title: 'Detect interface elements',
    description: 'The tool identifies key UI components and patterns.'
  },
  {
    title: 'Get insights',
    description: 'See how these patterns may influence decisions, with clear explanations.'
  }
] as const;

export function PopupInfoScreen({ onBack }: PopupInfoScreenProps) {
  return (
    <PopupCard>
      <PopupScreenHeader title="How this works?" onBack={onBack} />
      <PopupTextBody>
        <PopupMutedPanel className="space-y-4">
          <ol className="space-y-4">
            {INFO_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{step.title}</p>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-sm leading-6 text-slate-600">
            Analysis starts only after your confirmation. Your data is not stored or saved.
          </p>
        </PopupMutedPanel>
      </PopupTextBody>
    </PopupCard>
  );
}
