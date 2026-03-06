import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center relative overflow-hidden bg-teal-gradient">
        {/* Diagonal dot matrix background */}
        <DotMatrixCanvas />

        {/* Bracketed label */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="label-bracketed mb-8 relative z-10"
        >
          AI-native workforce intelligence for India
        </motion.p>

        {/* Sparkle icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring' }}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center mb-6 relative z-10"
        >
          <span className="text-mirage-teal">&#10022;</span>
        </motion.div>

        {/* Hero heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="heading-hero text-center max-w-4xl px-8 relative z-10"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
        >
          Reimagining Workforce Intelligence from first principles
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-white/40 text-center mt-6 max-w-2xl px-8 relative z-10"
        >
          Connecting live job market signals to personalized reskilling paths for India's 50 crore workers.
          22+ cities. Real-time data. AI-powered.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="flex gap-4 mt-10 relative z-10"
        >
          <Link
            to="/dashboard"
            className="bg-mirage-teal text-black px-8 py-3 font-body font-medium hover:bg-mirage-cyan transition-colors"
          >
            EXPLORE DASHBOARD
          </Link>
          <Link
            to="/seeker"
            className="border border-white/30 px-8 py-3 font-body font-medium text-white hover:border-mirage-teal hover:text-mirage-teal transition-all"
          >
            GET STARTED
          </Link>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-12 flex flex-col items-center gap-2 z-10"
        >
          <span className="text-xs text-white/30 nav-link">SCROLL</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </motion.div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-32 px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="label-bracketed text-mirage-teal mb-4">THE PROBLEM</p>
          <h2 className="heading-section text-4xl mb-8">
            Two Sides of a Crisis.
            <br />
            Zero Connection.
          </h2>
          <p className="text-white/50 max-w-2xl text-lg leading-relaxed">
            India posts 1 crore job listings a month. 45%+ employers still can't find the right skills.
            Workers get generic advice. Nobody connects market signals to individual action.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mt-16">
          {[
            { value: '1Cr+', label: 'Jobs posted monthly' },
            { value: '45%', label: 'Employers can\'t find skills' },
            { value: '50Cr', label: 'Workers to reskill' },
            { value: '0', label: 'Systems connecting L1 to L2' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-mirage-border rounded-lg p-6"
            >
              <p className="text-3xl font-mono text-mirage-teal mb-2">{stat.value}</p>
              <p className="text-sm text-white/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-32 px-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="label-bracketed text-mirage-teal mb-4">ARCHITECTURE</p>
          <h2 className="heading-section text-4xl mb-16">
            Two Layers. One Live System.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <Link to="/dashboard" className="group">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border border-mirage-border rounded-lg p-8 transition-all duration-300 group-hover:border-mirage-teal/30 group-hover:bg-mirage-card h-full"
            >
              <span className="text-mirage-teal text-sm font-mono">[01]</span>
              <h3 className="heading-section text-2xl mt-2 mb-4">Job Market Dashboard</h3>
              <p className="text-white/50 mb-4">
                Live scraping. Hiring trends by city. Skills intelligence. AI Vulnerability Index.
              </p>
              <div className="flex flex-wrap gap-2">
                {['22+ Cities', 'Live Data', 'Hiring Trends', 'AI Risk Scores'].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 border border-mirage-border rounded text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </Link>

          <Link to="/seeker" className="group">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="border border-mirage-border rounded-lg p-8 transition-all duration-300 group-hover:border-mirage-teal/30 group-hover:bg-mirage-card h-full"
            >
              <span className="text-mirage-teal text-sm font-mono">[02]</span>
              <h3 className="heading-section text-2xl mt-2 mb-4">Job Seeker Portal</h3>
              <p className="text-white/50 mb-4">
                Personalized job matches. AI reskilling plans. Career chatbot in English & Hindi.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Job Matching', 'NLP Analysis', 'Risk Scoring', 'Reskilling Plans'].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 border border-mirage-border rounded text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </Link>

          <Link to="/graph" className="group md:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="border border-mirage-border rounded-lg p-8 transition-all duration-300 group-hover:border-mirage-teal/30 group-hover:bg-mirage-card"
            >
              <span className="text-mirage-teal text-sm font-mono">[03]</span>
              <h3 className="heading-section text-2xl mt-2 mb-4">Knowledge Graph</h3>
              <p className="text-white/50 mb-4">
                Upload your resume + GitHub URL. See your entire professional graph in 3D.
                Skills, projects, repos, certifications — all connected.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Three.js 3D', 'Force-Directed', 'Resume + GitHub', 'Interactive'].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 border border-mirage-border rounded text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          </Link>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-32 px-8 max-w-6xl mx-auto border-t border-mirage-border">
        <p className="label-bracketed text-mirage-teal mb-4">BUILT WITH</p>
        <div className="flex flex-wrap gap-3 mt-6">
          {[
            'React', 'TypeScript', 'Vite', 'Three.js', 'TailwindCSS', 'Framer Motion',
            'Express.js', 'MongoDB', 'Redis', 'Socket.IO',
            'OpenAI', 'Recharts', 'D3.js', 'BullMQ',
          ].map((tech) => (
            <span
              key={tech}
              className="text-sm px-4 py-2 border border-mirage-border rounded text-white/50 hover:border-mirage-teal/30 hover:text-mirage-teal transition-colors"
            >
              {tech}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function DotMatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const spacing = 24;
      const dotSize = 1.2;

      for (let x = 0; x < canvas!.width; x += spacing) {
        for (let y = 0; y < canvas!.height; y += spacing) {
          // Diagonal wave
          const wave = Math.sin((x + y) * 0.005 + time * 0.02) * 0.5 + 0.5;
          const alpha = wave * 0.15;

          ctx!.beginPath();
          ctx!.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(0, 212, 170, ${alpha})`;
          ctx!.fill();
        }
      }
      time++;
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
      style={{ transform: 'rotate(45deg) scale(1.5)' }}
    />
  );
}
