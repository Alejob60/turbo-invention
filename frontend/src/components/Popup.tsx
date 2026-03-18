'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PopupProps {
  onClose: () => void;
}

export default function Popup({ onClose }: PopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show popup after 2 seconds with smooth fade-in
    const timer = setTimeout(() => setIsVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={handleClose}
          />

          {/* Popup Container */}
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 300,
                duration: 0.4
              }}
              className="pointer-events-auto max-w-md w-full mx-4"
            >
              {/* Glassmorphism Card */}
              <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl" />
                
                {/* Content Container with Glass Effect */}
                <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl m-[2px] p-8">
                  {/* Close Button */}
                  <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Icon with Animation */}
                  <div className="flex justify-center mb-6">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg"
                    >
                      <span className="text-3xl">🎉</span>
                    </motion.div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                    ¡Bienvenido a Twin AI Infra!
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-center leading-relaxed mb-6">
                    Infraestructura automatizada para agentes de IA con pagos en USDC. 
                    <span className="font-semibold text-blue-600"> 60% más barata</span> que el cloud tradicional.
                  </p>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { icon: '⚡', text: 'Deploy en segundos' },
                      { icon: '💰', text: 'Pagos con USDC' },
                      { icon: '🔒', text: '100% Seguro' },
                      { icon: '🤖', text: 'AI-Native' }
                    ].map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (idx * 0.1) }}
                        className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-lg">{feature.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3">
                    <motion.a
                      href="/signup"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="block w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center font-semibold py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-300"
                    >
                      Comenzar Gratis
                    </motion.a>
                    
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="block w-full bg-gray-100 text-gray-700 text-center font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-all duration-300"
                    >
                      Explorar Primero
                    </motion.button>
                  </div>

                  {/* Trust Indicators */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-center text-gray-500 mb-3">
                      Confían en nosotros
                    </p>
                    <div className="flex justify-center items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        SSL Secure
                      </span>
                      <span>•</span>
                      <span>No CC Required</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
