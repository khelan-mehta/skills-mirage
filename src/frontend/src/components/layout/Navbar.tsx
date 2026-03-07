import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';

const publicLinks = [
  { label: 'DASHBOARD', path: '/dashboard' },
  { label: 'HIRE', path: '/hiring' },
];

const authLinks = [
  { label: 'MY JOBS', path: '/seeker' },
  { label: 'KNOWLEDGE GRAPH', path: '/graph' },
  { label: 'CHATBOT', path: '/chat' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = isAuthenticated
    ? [...publicLinks, ...authLinks]
    : publicLinks;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-mirage-bg/80 backdrop-blur-md border-b border-mirage-border'
          : 'bg-transparent'
        }`}
    >
      <div className="max-w-[1400px] mx-auto px-8 py-5 flex items-center justify-between">
        <Link to="/" className="font-body font-bold text-white text-lg tracking-tight">
          skills mirage
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link relative transition-colors duration-300 ${location.pathname === link.path
                  ? 'text-white'
                  : 'text-white/50 hover:text-white'
                }`}
            >
              {link.label}
              {location.pathname === link.path && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-0 right-0 h-px bg-mirage-teal"
                />
              )}
            </Link>
          ))}
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <Link
              to="/settings"
              className="text-white/50 hover:text-white text-sm transition-colors"
            >
              {user?.name?.split(' ')[0]}
            </Link>
            <button
              onClick={logout}
              className="nav-link border border-white/30 px-5 py-2 hover:border-red-400/50 hover:text-red-400 transition-all text-sm"
            >
              LOGOUT
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="nav-link border border-white/30 px-6 py-2.5 hover:border-mirage-teal hover:text-mirage-teal transition-all duration-300"
          >
            SIGN IN
          </Link>
        )}
      </div>
    </motion.nav>
  );
}
