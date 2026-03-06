import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const { login, register, loading, error, clearError, isAuthenticated, loadUser } = useAuthStore();
  const navigate = useNavigate();

  // Handle GitHub OAuth callback — backend redirects here with ?token=xxx
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const ghError = params.get('error');

    if (token) {
      localStorage.setItem('sm_token', token);
      window.history.replaceState({}, '', '/login');
      loadUser().then(() => navigate('/seeker', { replace: true }));
    } else if (ghError) {
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  if (isAuthenticated) {
    navigate('/seeker');
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isSignUp) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/seeker');
    } catch {}
  }

  function handleGitHub() {
    window.location.href = '/api/v1/auth/github';
  }

  return (
    <div className="pt-24 px-8 min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <p className="label-bracketed text-mirage-teal mb-4 text-center">
          {isSignUp ? 'CREATE ACCOUNT' : 'WELCOME BACK'}
        </p>
        <h1 className="heading-section text-3xl mb-8 text-center">
          {isSignUp ? 'Join Skills Mirage' : 'Sign In'}
        </h1>

        {/* Tabs */}
        <div className="flex border border-mirage-border rounded-lg mb-8 overflow-hidden">
          <button
            onClick={() => { setIsSignUp(false); clearError(); }}
            className={`flex-1 py-3 text-sm font-body transition-colors ${
              !isSignUp ? 'bg-mirage-teal text-black' : 'text-white/50 hover:text-white'
            }`}
          >
            SIGN IN
          </button>
          <button
            onClick={() => { setIsSignUp(true); clearError(); }}
            className={`flex-1 py-3 text-sm font-body transition-colors ${
              isSignUp ? 'bg-mirage-teal text-black' : 'text-white/50 hover:text-white'
            }`}
          >
            SIGN UP
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isSignUp && (
            <div>
              <label className="text-mirage-teal text-xs font-mono block mb-2">FULL NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="text-mirage-teal text-xs font-mono block mb-2">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="text-mirage-teal text-xs font-mono block mb-2">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-transparent border-b border-mirage-border py-2 text-white placeholder:text-white/20 focus:border-mirage-teal outline-none"
              placeholder="Min 6 characters"
            />
          </div>

          {error && (
            <div className="border border-red-400/30 rounded p-3 bg-red-400/5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mirage-teal text-black py-3 font-body font-medium hover:bg-mirage-cyan transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                {isSignUp ? 'CREATING...' : 'SIGNING IN...'}
              </>
            ) : (
              isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'
            )}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-mirage-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-mirage-bg px-4 text-white/30">or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGitHub}
          className="w-full border border-mirage-border py-3 font-body text-sm text-white/70 hover:border-mirage-teal hover:text-white transition-all flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          CONTINUE WITH GITHUB
        </button>
      </motion.div>
    </div>
  );
}
