interface PopupBrandProps {
  subtitle?: string;
}

export function PopupBrand({ subtitle }: PopupBrandProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <img
          src={chrome.runtime.getURL('icons/crosshair.png')}
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          className="block shrink-0"
        />
        <h1 className="text-xl font-semibold text-slate-950">DarkScope</h1>
      </div>
      {subtitle ? <p className="text-sm leading-6 text-slate-600">{subtitle}</p> : null}
    </div>
  );
}
