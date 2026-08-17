import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, isVisible, onClose }: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, scale: 0.95, x: '-50%' }}
          className="fixed bottom-10 left-1/2 z-[200] min-w-[320px] bg-white border-2 border-gov-blue shadow-2xl p-4 flex items-center gap-4 rounded-2xl"
        >
          <div className="bg-gov-yellow p-2">
            <CheckCircle className="w-5 h-5 text-gov-blue" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Operação Realizada</p>
            <p className="text-sm font-black text-gov-blue uppercase tracking-tight">{message}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 transition-colors rounded-2xl">
            <X className="w-4 h-4 text-gray-400" />
          </button>
          <div className="absolute top-0 left-0 h-1 bg-gov-yellow animate-progress-bar" style={{ width: '100%' }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
