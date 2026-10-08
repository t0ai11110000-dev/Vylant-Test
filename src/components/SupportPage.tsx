import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SupportPageProps {
  onBackToHome: () => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ onBackToHome }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      
      if (response.ok) {
        setSubmitted(true);
      } else {
        console.error('Submission failed');
      }
    } catch (err) {
      console.error('Error submitting support:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-6">Support</h1>
        <p className="mb-8">Need help? We're here to assist you.</p>
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
          <ul className="space-y-4">
            <li><strong>How do I change my theme?</strong> Go to settings.</li>
            <li><strong>How do I send a message?</strong> Click on a contact or channel and type in the input.</li>
          </ul>
        </div>
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Contact Us</h2>
          {submitted ? (
            <p className="text-green-400">Message sent! We'll be in touch soon.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input 
                type="text" 
                placeholder="Name" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full bg-slate-700 p-2 rounded text-white" 
                required 
              />
              <input 
                type="email" 
                placeholder="Email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-slate-700 p-2 rounded text-white" 
                required 
              />
              <textarea 
                placeholder="Message" 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                className="w-full bg-slate-700 p-2 rounded text-white h-32" 
                required 
              />
              <button type="submit" disabled={isLoading} className="bg-vylant-blue text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2">
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Send Message
              </button>
            </form>
          )}
          <p className="mt-4 text-sm text-gray-400">Alternatively, join our support server for community help.</p>
        </div>
        <button className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors" onClick={onBackToHome}>Back to Home</button>
      </div>
    </div>
  );
};

export default SupportPage;
