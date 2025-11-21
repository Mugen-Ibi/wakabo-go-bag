import React, { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type NotificationType = {
    message: string;
    type: 'success' | 'error';
} | null;

interface NotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        if (!message) return;
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div
            className={cn(
                "fixed bottom-5 right-5 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-in slide-in-from-bottom-5 fade-in duration-300",
                type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-green-600'
            )}
        >
            {message}
        </div>
    );
};
