'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
    text: string;
    className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${copied
                ? 'bg-neon-green text-noir-bg'
                : 'bg-neon-blue/20 text-neon-blue hover:bg-neon-blue/30 border border-neon-blue/50'
                } ${className}`}
        >
            {copied ? (
                <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                </>
            )}
        </button>
    );
}
