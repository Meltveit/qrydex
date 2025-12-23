interface TrustScoreBadgeProps {
    score: number;
    color: 'green' | 'yellow' | 'red';
    label: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function TrustScoreBadge({
    score,
    color,
    label,
    size = 'md'
}: TrustScoreBadgeProps) {
    const colorClasses = {
        green: 'from-emerald-500 to-green-600 shadow-green-500/30',
        yellow: 'from-amber-400 to-orange-500 shadow-orange-500/30',
        red: 'from-red-500 to-rose-600 shadow-red-500/30',
    };

    const bgClasses = {
        green: 'bg-emerald-50',
        yellow: 'bg-amber-50',
        red: 'bg-red-50',
    };

    const textClasses = {
        green: 'text-emerald-700',
        yellow: 'text-amber-700',
        red: 'text-red-700',
    };

    const sizeClasses = {
        sm: { badge: 'w-12 h-12', text: 'text-lg', label: 'text-xs' },
        md: { badge: 'w-16 h-16', text: 'text-xl', label: 'text-xs' },
        lg: { badge: 'w-24 h-24', text: 'text-3xl', label: 'text-sm' },
    };

    const s = sizeClasses[size];

    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className={`${s.badge} rounded-full bg-gradient-to-br ${colorClasses[color]} 
          flex items-center justify-center shadow-lg`}
            >
                <span className={`${s.text} font-bold text-white`}>
                    {score}
                </span>
            </div>
            <span className={`${s.label} font-medium px-2 py-0.5 rounded-full ${bgClasses[color]} ${textClasses[color]}`}>
                {label}
            </span>
        </div>
    );
}
