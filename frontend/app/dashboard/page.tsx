'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
 const router= useRouter();
 const [language, setLanguage] = useState<'es' | 'en'>('es');
 const [user, setUser] = useState<any>(null);
 const [metrics, setMetrics] = useState<any>(null);
 const [subscriptions, setSubscriptions] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);

 const content = {
    es: {
      title: 'Dashboard',
      welcome: 'Bienvenido',
     metrics: {
        vms: 'VMs Activas',
        spending: 'Gasto Mensual',
        hours: 'Horas Usadas',
        subs: 'Suscripciones'
      },
      subscriptions: {
        title: 'Suscripciones Activas',
        plan: 'Plan',
       price: 'Precio',
        status: 'Estado',
       cancel: 'Cancelar',
        none: 'No tienes suscripciones activas'
      },
     vms: {
        title: 'Mis VMs',
        none: 'No hay VMs activas',
       provision: 'Provisionar Nueva VM'
      }
    },
   en: {
      title: 'Dashboard',
      welcome: 'Welcome',
     metrics: {
        vms: 'Active VMs',
        spending: 'Monthly Spending',
        hours: 'Hours Used',
        subs: 'Subscriptions'
      },
      subscriptions: {
        title: 'Active Subscriptions',
        plan: 'Plan',
       price: 'Price',
        status: 'Status',
       cancel: 'Cancel',
        none: 'No active subscriptions'
      },
      vms: {
        title: 'My VMs',
        none: 'No active VMs',
       provision: 'Provision New VM'
      }
    }
  };

 const t = content[language];

  useEffect(() => {
    // Check auth
   const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user data
    loadUserData(token);
  }, []);

 const loadUserData = async (token: string) => {
   try {
     const headers = { Authorization: `Bearer ${token}` };
      
      // Get user info
     const userRes = await fetch('/api/auth/me', { headers });
     const userData = await userRes.json();
      setUser(userData.user);

      // Get metrics
     const metricsRes = await fetch(`/api/infra/usage/${userData.user.id}`, { headers });
     const metricsData = await metricsRes.json();
      setMetrics(metricsData.metrics);

      // Get subscriptions
     const subsRes = await fetch(`/api/payments/subscriptions/${userData.user.id}`, { headers });
     const subsData = await subsRes.json();
      setSubscriptions(subsData.subscriptions || []);

      setLoading(false);
    } catch (error) {
     console.error('Failed to load user data:', error);
      setLoading(false);
    }
  };

 const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-white">
              Twin AI<span className="text-purple-400">.infra</span>
            </div>
            
            <div className="flex items-center space-x-6">
              <button
                onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
                className="px-3 py-1 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 transition"
              >
                {language.toUpperCase()}
              </button>
              
              <span className="text-gray-300">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            {t.welcome}, {user?.email}
          </h1>
          <p className="text-gray-400">{t.title}</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-gray-400 mb-2">{t.metrics.vms}</h3>
            <p className="text-4xl font-bold text-white">{metrics?.activeVMs || 0}</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-gray-400 mb-2">{t.metrics.spending}</h3>
            <p className="text-4xl font-bold text-white">${metrics?.estimatedCost || 0}</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-gray-400 mb-2">{t.metrics.hours}</h3>
            <p className="text-4xl font-bold text-white">{metrics?.totalHours || 0}</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-gray-400 mb-2">{t.metrics.subs}</h3>
            <p className="text-4xl font-bold text-white">{subscriptions?.length || 0}</p>
          </div>
        </div>

        {/* Subscriptions Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">{t.subscriptions.title}</h2>
          {subscriptions.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-gray-400">{t.subscriptions.none}</p>
              <button
                onClick={() => router.push('/pricing')}
                className="mt-4 px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                View Plans
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub: any) => (
                <div key={sub._id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {sub.resource} - {sub.subscriptionType}
                      </h3>
                      <p className="text-gray-400">
                        {t.subscriptions.price}: ${sub.amount} USDC
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="px-4 py-2 rounded-full bg-green-600/20 text-green-400 text-sm">
                        {t.subscriptions.status}: Active
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure?')) {
                           const token = localStorage.getItem('token');
                           await fetch(`/api/payments/subscriptions/${sub._id}/cancel`, {
                             method: 'POST',
                             headers: { Authorization: `Bearer ${token}` }
                            });
                            setSubscriptions(subscriptions.filter(s => s._id !== sub._id));
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
                      >
                        {t.subscriptions.cancel}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* VMs Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">{t.vms.title}</h2>
          <button
            onClick={() => router.push('/provision')}
            className="mb-6 px-6 py-3 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
          >
            {t.vms.provision}
          </button>
          
          {/* VM List would go here */}
          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-gray-400">{t.vms.none}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
