type BrandMarkProps = {
    className?: string;
    compact?: boolean;
};

export default function BrandMark({ className = '', compact }: BrandMarkProps) {
    const wordmarkVisibility = compact ? 'hidden sm:block' : 'block';
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-500/30 bg-brand-600 shadow-sm">
                <span className="text-[10px] font-semibold tracking-[0.1em] text-white">
                    RCM
                </span>
            </div>

            <div className="leading-tight">
                <div
                    className={`${wordmarkVisibility} whitespace-nowrap text-[11px] font-semibold tracking-[0.08em] text-slate-900 sm:text-xs`}
                >
                    Stripe - Twilio - RCM
                </div>
                <div
                    className={`text-xs text-slate-500/90 ${
                        compact ? 'hidden' : 'hidden sm:block'
                    }`}
                >
                    Revenue Cycle Management
                </div>
            </div>
        </div>
    );
}
