"use client";

import React, { ReactNode, MouseEventHandler, ReactElement } from 'react';
import clsx from 'clsx';
import { XCircle } from 'lucide-react';

type CardProps = { children: ReactNode; className?: string };
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
    <div className={clsx(
      'theme-bg-card rounded-xl shadow-lg p-4 sm:p-6',
      className
    )}>{children}</div>
);

type ButtonProps = {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  icon?: React.ElementType | null;
};
export const Button: React.FC<ButtonProps> = ({ onClick, children, className = '', disabled = false, icon: Icon = null }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center justify-center px-4 py-2 font-bold text-white rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2',
        disabled
          ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
          : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-400 focus:ring-blue-500',
        className
      )}
    >
      {Icon && <Icon className="mr-2 h-5 w-5" />} {children}
    </button>
);

type IconButtonProps = {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
};
export const IconButton: React.FC<IconButtonProps> = ({ onClick, children, className = '', disabled = false, title = '' }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'p-2 rounded-full transition-colors',
        disabled
          ? 'text-gray-400 dark:text-gray-600'
          : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
        className
      )}
    >
      {children}
    </button>
);

type ItemProps = {
  item: string;
  isSelected: boolean;
  onClick: () => void;
  isEditable?: boolean;
  onDelete?: () => void;
};
export const Item: React.FC<ItemProps> = ({ item, isSelected, onClick, isEditable = false, onDelete }) => (
    <div
      onClick={!isEditable ? onClick : undefined}
      className={clsx(
        'relative p-3 rounded-lg transition-all duration-200 text-sm text-center border-2',
        isEditable ? '' : 'cursor-pointer',
        isSelected
          ? 'bg-blue-500 text-white border-blue-500 shadow-md font-bold'
          : 'theme-bg-card theme-text-primary theme-border',
        !isEditable && 'hover:bg-blue-100 hover:border-blue-300'
      )}
    >
      {item}
      {isEditable && (
        <button onClick={onDelete} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600">
          <XCircle size={18} />
        </button>
      )}
    </div>
);

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
};
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className={clsx(
        'theme-bg-card rounded-lg shadow-xl w-full theme-border',
        maxWidth,
        'max-h-full overflow-y-auto'
      )}>
        <div className="p-4 border-b theme-border flex justify-between items-center sticky top-0 theme-bg-card z-10">
          <h2 className="text-xl font-bold theme-text-primary">{title}</h2>
          <button onClick={onClose} className="theme-text-secondary hover:theme-text-primary text-2xl font-bold">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

type NotificationProps = {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
};
export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
    if (!message) return null;
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [message, onClose]);
    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    return <div className={`fixed bottom-5 right-5 text-white px-4 py-3 rounded-lg shadow-lg z-50 ${bgColor}`}>{message}</div>
};
