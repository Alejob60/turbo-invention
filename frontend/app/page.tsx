'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
 const [email, setEmail] = useState('');

const resources = [
    {
     name: 'AI Inference GPU',
      description: 'VM con NVIDIA T4 para inferencia de modelos',
      price: '$0.30/hora',
      specs: { cpu: '4 vCPU', ram: '28 GB', gpu: '1x T4' },
     popular: true
    },
    {
     name: 'Agent Starter',
      description: 'Package completo para agentes nuevos',
      price: '$10/mes',
      specs: { vm: '1x VM', storage: '10 GB', api: '10K calls' },
     popular: false
    },
    {
     name: 'Twin Wearable',
      description: 'Optimizado para wearables Twin AI',
      price: '$5/mes',
      specs: { iot: 'IoT Hub', storage: '5 GB', analytics: 'Stream' },
     popular: false
    }
  ];

 return (
   <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      {/* Header */}
     <header className="p-6 flex justify-between items-center max-w-7xl mx-auto">
       <div className="text-white text-2xl font-bold">Twin AI Infra</div>
       <nav className="space-x-4">
         <a href="#features" className="text-white hover:text-blue-300 transition">Características</a>
         <a href="#pricing" className="text-white hover:text-blue-300 transition">Precios</a>
        <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">
          Login
        </button>
      </nav>
    </header>

      {/* Hero Section */}
     <section className="py-20 px-4 text-center">
       <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
       transition={{ duration: 0.8 }}
        className="text-5xl md:text-6xl font-bold text-white mb-6"
      >
        Infraestructura para Agentes de IA
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
       transition={{ delay: 0.3, duration: 0.8 }}
        className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto"
      >
        Compra y paga automáticamente con USDC. Sin intervención humana.
       60% más barato que cloud tradicional.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
       transition={{ delay: 0.5 }}
        className="flex gap-4 justify-center"
      >
        <button className="bg-white text-blue-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-100 transition shadow-lg">
          Comenzar Gratis
        </button>
        <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-blue-900 transition">
          Ver Precios
        </button>
      </motion.div>
    </section>

      {/* Resources Section */}
     <section id="pricing" className="py-20 px-4">
       <h2 className="text-3xl font-bold text-white text-center mb-12">Recursos Disponibles</h2>
       
       <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
         {resources.map((resource, index) => (
           <motion.div
           key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
           transition={{ delay: index * 0.1 + 0.5 }}
            className={`bg-white/10 backdrop-blur rounded-xl p-6 ${
             resource.popular ? 'ring-2 ring-blue-400' : ''
            }`}
          >
            {resource.popular && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Más Popular
              </span>
            )}
            
            <h3 className="text-xl font-bold text-white mt-2">{resource.name}</h3>
            <p className="text-blue-200 mt-2">{resource.description}</p>
            <div className="text-3xl font-bold text-white mt-4">{resource.price}</div>
            
            <ul className="text-blue-200 mt-4 space-y-2">
              {Object.entries(resource.specs).map(([key, value]) => (
                <li key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span className="font-semibold">{value}</span>
                </li>
              ))}
            </ul>
            
            <button className="w-full bg-blue-500 text-white py-3 rounded-lg mt-6 hover:bg-blue-600 transition">
              Comprar Ahora
            </button>
          </motion.div>
        ))}
      </div>
    </section>

      {/* Features Section */}
     <section id="features" className="py-20 px-4 bg-white/5">
       <h2 className="text-3xl font-bold text-white text-center mb-12">
         ¿Por qué Twin AI Infra?
      </h2>
      
      <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
        {[
          { icon: '💰', title: '60% Más Barato', desc: 'Spot instances + automatización' },
          { icon: '🤖', title: 'Agent-Native', desc: 'x402 + USDC + ERC-8004' },
          { icon: '🔒', title: 'Privacy-First', desc: 'Cifrado E2E por defecto' },
          { icon: '⚡', title: 'Auto-Provision', desc: 'Recursos en segundos' }
        ].map((feature, index) => (
          <motion.div
           key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
           transition={{ delay: index * 0.1 + 0.3 }}
            className="text-center"
          >
            <div className="text-4xl mb-4">{feature.icon}</div>
            <h3 className="text-xl font-bold text-white">{feature.title}</h3>
            <p className="text-blue-200 mt-2">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>

      {/* Footer */}
     <footer className="py-8 text-center text-blue-300 border-t border-white/10">
       <p>Powered by Colombia TI × Twin AI × Misybot</p>
       <p className="text-sm mt-2">
         Infraestructura para la economía de agentes autónomos
      </p>
    </footer>
  </div>
 );
}
