import React from 'react';

interface PrivacyPageProps {
 onBackToHome: () => void;
}

const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBackToHome }) => {
 return (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 text-white">
   <div className="max-w-2xl w-full">
    <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
    <p className="mb-4">Your privacy is important to us. This policy outlines how we handle your data.</p>
    <div className="bg-navy-800 p-6 rounded-lg mb-6">
     <h2 className="text-xl font-bold mb-4">Information We Collect</h2>
     <p>We collect information you provide when using our services, such as your name, email, and messages sent through our support form.</p>
    </div>
    <button className="bg-navy-700 text-white px-6 py-2 rounded-lg hover:bg-navy-600 transition-colors" onClick={onBackToHome}>Back to Home</button>
   </div>
  </div>
 );
};

export default PrivacyPage;
