import React, { HTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "rounded-xl border border-border/50 bg-card text-card-foreground shadow-sm",
                "p-8", // Increased padding
                className
            )}
            {...props}
        />
    )
);
Card.displayName = "Card";

const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "glass-panel rounded-xl",
                "p-8", // Increased padding
                className
            )}
            {...props}
        />
    )
);
GlassCard.displayName = "GlassCard";

export { Card, GlassCard };
