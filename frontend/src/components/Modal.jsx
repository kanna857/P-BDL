import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md' // md, lg, xl, sm
}) => {
  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Lock body scroll
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      ></div>

      {/* Centering Wrapper */}
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Modal Container */}
        <div className={`relative w-full ${sizeClasses[size]} glass-card rounded-xl border border-slate-700/40 shadow-[0_0_30px_rgba(0,120,212,0.15)] overflow-hidden transform transition-all duration-300 ease-out animate-fade-in-up scale-100`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/40 bg-slate-950/30">
            <h3 className="font-semibold text-gray-100 text-lg">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-lg transition-all"
            >
              <FiX className="text-lg" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto text-gray-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
