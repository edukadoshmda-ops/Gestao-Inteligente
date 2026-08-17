import { motion, AnimatePresence } from 'motion/react';
import { DownloadCloud, X, Smartphone, Shield, Zap, WifiOff, Star } from 'lucide-react';

interface PWAInstallerProps {
  onInstall: () => void;
  onDismiss: () => void;
  visible: boolean;
}

const features = [
  { icon: Zap, text: 'Acesso instantâneo, sem abrir navegador' },
  { icon: WifiOff, text: 'Funciona offline com dados salvos' },
  { icon: Shield, text: 'Seguro e sempre atualizado' },
  { icon: Star, text: 'Experiência nativa como app real' },
];

export default function PWAInstaller({ onInstall, onDismiss, visible }: PWAInstallerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] flex justify-center"
          >
            <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-hidden">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              {/* Close */}
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="px-6 pb-8 pt-2">
                {/* Logo + Header */}
                <div className="flex flex-col items-center text-center mb-6">
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 250 }}
                    className="w-16 h-16 rounded-2xl overflow-hidden shadow-md border-2 border-white ring-1 ring-blue-100 mb-4 bg-[#F8FAFF] flex items-center justify-center"
                  >
                    <img
                      src="/logo app.png"
                      alt="Sistema Gestão Inteligente"
                      className="w-full h-full object-contain p-1"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Instalar aplicativo</p>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">
                      Sistema Gestão<br />
                      <span className="text-blue-800">Inteligente</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1.5">
                      Adicione à sua tela inicial para acesso rápido
                    </p>
                  </motion.div>
                </div>

                {/* Features */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  className="bg-blue-50 rounded-2xl p-4 mb-5 space-y-2.5"
                >
                  {features.map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-800 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{text}</span>
                    </div>
                  ))}
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex flex-col gap-3"
                >
                  <button
                    onClick={onInstall}
                    className="w-full flex items-center justify-center gap-3 bg-blue-800 hover:bg-blue-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all text-base tracking-wide uppercase"
                  >
                    <DownloadCloud className="w-5 h-5" />
                    Instalar Agora
                  </button>
                  <button
                    onClick={onDismiss}
                    className="w-full text-gray-500 font-semibold py-3 text-sm hover:text-gray-700 transition-colors"
                  >
                    Agora não
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
