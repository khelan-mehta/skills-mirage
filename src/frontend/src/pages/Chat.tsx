import { useEffect, useState } from 'react';
import ChatInterface from '../components/chatbot/ChatInterface';
import { useAuthStore } from '../stores/authStore';

export default function Chat() {
  const user = useAuthStore((s) => s.user);
  const profileId = user?.profileId;

  return (
    <div className="pt-24 px-8 max-w-4xl mx-auto min-h-screen">
      <p className="label-bracketed text-mirage-teal mb-4">AI CHATBOT</p>
      <h1 className="heading-section text-4xl mb-2">Context-Aware Career Advisor</h1>
      <p className="text-white/40 mb-8">English + Hindi. Uses your profile + live market data.</p>

      {profileId ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-white/30">
              Connected as {user?.name}
            </span>
          </div>
          <ChatInterface workerId={profileId} />
        </div>
      ) : (
        <div className="text-center py-20 border border-mirage-border rounded-lg">
          <p className="text-white/40 mb-2">Complete onboarding to use the chatbot</p>
          <p className="text-white/20 text-sm">Your profile data provides context for personalized advice.</p>
        </div>
      )}
    </div>
  );
}
