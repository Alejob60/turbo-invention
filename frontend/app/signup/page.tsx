'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Signup() {
 const router= useRouter();
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [walletAddress, setWalletAddress] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit= async (e: React.FormEvent) => {
    e.preventDefault();
   setError('');
   setLoading(true);

  try {
   const response = await fetch('/api/auth/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email, password, walletAddress })
     });

   const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store token
      localStorage.setItem('token', data.token);

      // Redirect to dashboard
     router.push('/dashboard');
    } catch (err: any) {
     setError(err.message);
      setLoading(false);
    }
  };

 return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Twin AI<span className="text-purple-400">.infra</span>
          </h1>
          <p className="text-gray-400">Create your account</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit}>
           {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-600/20 border border-red-500/50 text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="wallet" className="block text-sm font-medium text-gray-300 mb-2">
                  Wallet Address(Optional)
                </label>
                <input
                  type="text"
                  id="wallet"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="0x..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-400 hover:text-purple-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
