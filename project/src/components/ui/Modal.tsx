import React, { Fragment, useRef } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  preventClickOutsideClose?: boolean;
  preventEscapeClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  preventClickOutsideClose = false,
  preventEscapeClose = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!preventClickOutsideClose && modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // ESC key to close
  React.useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !preventEscapeClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose, preventEscapeClose]);

  // Prevent scrolling of the body when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    'full': 'max-w-[95vw]',
  };

  if (!isOpen) return null;

  return (
    <Fragment>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-75" onClick={handleBackdropClick}>
        <div
          ref={modalRef}
          className={`relative bg-white dark:bg-dark-surface rounded-lg shadow-xl dark:shadow-gray-900/50 w-full ${sizeClasses[size]} transform transition-all ease-in-out duration-300`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text">{title}</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X size={18} />
            </Button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-dark-border gap-2">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default Modal;