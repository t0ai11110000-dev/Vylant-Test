import React from 'react';

interface TermsPageProps {
  onBackToHome: () => void;
}

const TermsPage: React.FC<TermsPageProps> = ({ onBackToHome }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        <p className="mb-4">By using our services, you agree to these terms.</p>
        <div className="bg-slate-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">Usage Terms</h2>
          <p>Please use our platform responsibly. We reserve the right to suspend accounts that violate our terms.</p>
        </div>
        <button className="bg-slate-700 text-white px-6 py-2 rounded-lg hover:bg-slate-600 transition-colors" onClick={onBackToHome}>Back to Home</button>
      </div>
    </div>
  );
};

export default TermsPage;
