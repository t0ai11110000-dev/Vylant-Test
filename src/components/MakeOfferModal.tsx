import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, DollarSign, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { MarketplaceItem } from './ServerMarketplaceView';

interface MakeOfferModalProps {
 isOpen: boolean;
 onClose: () => void;
 item: MarketplaceItem | null;
 isDarkMode: boolean;
 onSubmitOffer: (price: number, note: string) => void;
}

export const MakeOfferModal: React.FC<MakeOfferModalProps> = ({
 isOpen,
 onClose,
 item,
 isDarkMode,
 onSubmitOffer
}) => {
 if (!isOpen || !item) return null;

 const [offerPrice, setOfferPrice] = useState<string>(String(item.price || ''));
 const [offerNote, setOfferNote] = useState<string>('');
 const [error, setError] = useState<string | null>(null);

 const handleApplyPercentage = (pct: number) => {
  const discounted = Math.max(0, item.price * (1 - pct));
  setOfferPrice(discounted.toFixed(2));
 };

 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const numPrice = parseFloat(offerPrice);
  if (isNaN(numPrice) || numPrice < 0) {
   setError('Please enter a valid offer price');
   return;
  }
  onSubmitOffer(numPrice, offerNote.trim());
  onClose();
 };

 return (
  <AnimatePresence>
   <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     exit={{ opacity: 0 }}
     onClick={onClose}
     className="absolute inset-0 bg-black/70 backdrop-blur-sm"
    />

    <motion.div
     initial={{ scale: 0.95, opacity: 0, y: 10 }}
     animate={{ scale: 1, opacity: 1, y: 0 }}
     exit={{ scale: 0.95, opacity: 0, y: 10 }}
     className={`relative w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 border ${
      isDarkMode ? 'bg-[#121520] border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
     }`}
    >
     {/* Header */}
     <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
      <div className="flex items-center gap-2.5">
       <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
        <Tag size={20} />
       </div>
       <div>
        <h3 className="font-bold text-base">Make an Offer</h3>
        <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>Send a custom price offer to the seller</p>
       </div>
      </div>
      <button
       onClick={onClose}
       className={`p-2 rounded-full transition-colors ${
        isDarkMode ? 'hover:bg-white/10 text-white/60' : 'hover:bg-navy-100 text-navy-500'
       }`}
      >
       <X size={18} />
      </button>
     </div>

     {/* Item Preview */}
     <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 mb-5 ${
      isDarkMode ? 'bg-white/5 border-white/5' : 'bg-navy-50 border-navy-200'
     }`}>
      <img
       src={item.imageUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=80'}
       alt={item.title}
       className="w-12 h-12 rounded-xl object-cover border border-purple-500/30 shrink-0"
      />
      <div className="min-w-0 flex-1">
       <h4 className="text-xs font-bold truncate">{item.title}</h4>
       <p className="text-xs text-purple-400 font-semibold mt-0.5">
        Asking Price: {item.price === 0 ? 'Free Perk' : `$${item.price.toFixed(2)}`}
       </p>
       <p className={`text-[10px] ${isDarkMode ? 'text-white/40' : 'text-navy-400'}`}>Seller: {item.sellerName}</p>
      </div>
     </div>

     <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
       <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
        <AlertCircle size={14} className="shrink-0" />
        <span>{error}</span>
       </div>
      )}

      <div>
       <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-white/80' : 'text-navy-700'}`}>
        Your Offer Price ($)
       </label>
       <div className={`flex items-center px-3.5 py-2.5 rounded-xl border ${
        isDarkMode ? 'bg-black/30 border-white/10 focus-within:border-purple-500' : 'bg-white border-navy-200 focus-within:border-purple-500'
       }`}>
        <DollarSign size={16} className={isDarkMode ? 'text-white/40 mr-2' : 'text-navy-400 mr-2'} />
        <input
         type="number"
         step="0.01"
         min="0"
         value={offerPrice}
         onChange={(e) => {
          setOfferPrice(e.target.value);
          setError(null);
         }}
         placeholder="0.00"
         className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-inherit/30"
         required
        />
       </div>

       {/* Quick offer buttons */}
       {item.price > 0 && (
        <div className="flex items-center gap-2 mt-2.5">
         <span className={`text-[10px] font-bold ${isDarkMode ? 'text-white/40' : 'text-navy-400'}`}>Quick:</span>
         <button
          type="button"
          onClick={() => handleApplyPercentage(0.10)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
           isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-purple-300' : 'bg-navy-100 border-navy-200 hover:bg-navy-200 text-purple-600'
          }`}
         >
          10% Off (${(item.price * 0.9).toFixed(2)})
         </button>
         <button
          type="button"
          onClick={() => handleApplyPercentage(0.20)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
           isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-purple-300' : 'bg-navy-100 border-navy-200 hover:bg-navy-200 text-purple-600'
          }`}
         >
          20% Off (${(item.price * 0.8).toFixed(2)})
         </button>
         <button
          type="button"
          onClick={() => setOfferPrice(String(item.price))}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
           isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70' : 'bg-navy-100 border-navy-200 hover:bg-navy-200 text-navy-700'
          }`}
         >
          Asking
         </button>
        </div>
       )}
      </div>

      <div>
       <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-white/80' : 'text-navy-700'}`}>
        Message / Terms (Optional)
       </label>
       <textarea
        value={offerNote}
        onChange={(e) => setOfferNote(e.target.value)}
        placeholder="e.g. Can buy today if offer is accepted!"
        rows={2}
        className={`w-full p-3 rounded-xl border text-xs outline-none resize-none placeholder:text-inherit/30 ${
         isDarkMode ? 'bg-black/30 border-white/10 focus:border-purple-500' : 'bg-white border-navy-200 focus:border-purple-500'
        }`}
       />
      </div>

      <div className="flex items-center gap-3 pt-2">
       <button
        type="button"
        onClick={onClose}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
         isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70' : 'bg-navy-100 border-navy-200 hover:bg-navy-200 text-navy-700'
        }`}
       >
        Cancel
       </button>
       <button
        type="submit"
        className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
       >
        <Send size={14} />
        Send Offer
       </button>
      </div>
     </form>
    </motion.div>
   </div>
  </AnimatePresence>
 );
};
