
import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
  footer?: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-full h-full rounded-none',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto transition-opacity duration-300 ease-in-out">
      <div 
        className={`bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} transform transition-all duration-300 ease-in-out scale-100 flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-grow">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t sticky bottom-0 bg-white z-10 flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;