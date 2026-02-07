type BrandMarkProps = {
    className?: string;
    compact?: boolean;
};

export default function BrandMark({ className = '', compact }: BrandMarkProps) {
    const wordmarkVisibility = compact ? 'hidden sm:block' : 'block';
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 shadow-sm ring-1 ring-brand-500/40">
                <span className="text-[9px] font-semibold tracking-[0.28em] text-white">
                    RCM
                </span>
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-stripe-500 shadow-sm" />
                <span className="absolute -right-1 -bottom-1 h-2.5 w-2.5 rounded-full bg-twilio-500 shadow-sm" />
            </div>

            <div className="leading-tight">
                <div
                    className={`${wordmarkVisibility} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-900 sm:text-[11px]`}
                >
                    STRIPE <span className="text-brand-600">+</span> TWILIO{' '}
                    <span className="text-brand-600">+</span> RCM
                </div>
                <div
                    className={`text-xs text-slate-500 ${
                        compact ? 'hidden' : 'hidden sm:block'
                    }`}
                >
                    Revenue Cycle Management
                </div>
            </div>
        </div>
    );
}
