import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
 ShoppingBag, 
 Plus, 
 Search, 
 Filter,
 Tag, 
 Trash2, 
 Edit3, 
 Check, 
 X, 
 ShieldCheck, 
 Sparkles, 
 Coins, 
 DollarSign, 
 Package, 
 User, 
 ExternalLink, 
 Receipt, 
 Clock, 
 Layers, 
 CheckCircle2, 
 AlertCircle,
 Settings,
 MessageSquare,
 MessageCircle,
 Heart,
 Send,
 HelpCircle,
 ArrowUpRight,
 Copy,
 Share2,
 Upload,
 Image as ImageIcon,
 Camera,
 Link as LinkIcon,
 RefreshCw,
 Archive
} from 'lucide-react';

export interface MarketplaceItem {
 id: string;
 serverId: string;
 sellerId: string;
 sellerName: string;
 sellerAvatar?: string;
 title: string;
 description: string;
 price: number;
 currency: string;
 category: string;
 imageUrl?: string;
 stock: number;
 contactInfo?: string;
 tags: string[];
 interestedUsers?: string[];
 status: 'active' | 'sold_out' | 'paused' | 'sold';
 createdAt: number;
}

export interface MarketplaceOrder {
 id: string;
 serverId: string;
 itemId: string;
 itemTitle: string;
 buyerId: string;
 buyerName: string;
 sellerName: string;
 price: number;
 currency: string;
 note?: string;
 status: string;
 createdAt: number;
}

interface ServerMarketplaceViewProps {
 server: any;
 isDarkMode: boolean;
 userName: string;
 userImage?: string;
 onOpenSettings?: () => void;
 onStartChat?: (sellerName: string, item: MarketplaceItem, inquiryMessage?: string, directSend?: boolean) => void;
 socket?: any;
}

const CATEGORIES = [
 { id: 'all', label: 'All Items', icon: Layers },
 { id: 'roles', label: 'Roles & VIP', icon: ShieldCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
 { id: 'digital', label: 'Digital Goods', icon: Sparkles, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
 { id: 'merch', label: 'Merch & Physical', icon: Package, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
 { id: 'services', label: 'Services & Bounties', icon: Coins, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
 { id: 'other', label: 'Other Perks', icon: Tag, color: 'text-navy-400 bg-navy-500/10 border-navy-400/20' },
];

const INQUIRY_TEMPLATES = [
 "Hi, is this still available?",
 "Is the price negotiable?",
 "How does delivery / fulfillment work?",
 "I'm interested in buying this! Let's arrange details.",
 "Can you tell me more about this perk?"
];

const PRESET_IMAGES = [
 { label: 'VIP Pass', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80' },
 { label: 'Digital Art', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80' },
 { label: 'Gaming Perk', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80' },
 { label: 'Custom Merch', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80' },
 { label: 'Music & Audio', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80' },
 { label: 'Coaching', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' }
];

export default function ServerMarketplaceView({
 server,
 isDarkMode,
 userName,
 userImage,
 onOpenSettings,
 onStartChat,
 socket
}: ServerMarketplaceViewProps) {
 const [items, setItems] = useState<MarketplaceItem[]>([]);
 const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [activeTab, setActiveTab] = useState<'listings' | 'sold' | 'orders'>('listings');
 const [selectedCategory, setSelectedCategory] = useState<string>('all');
 const [searchQuery, setSearchQuery] = useState('');
 const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest');

 // Modal states
 const [isItemModalOpen, setIsItemModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
 const [purchasingItem, setPurchasingItem] = useState<MarketplaceItem | null>(null);
 const [purchaseNote, setPurchaseNote] = useState('');
 const [purchaseSuccess, setPurchaseSuccess] = useState<MarketplaceOrder | null>(null);
 const [isProcessingBuy, setIsProcessingBuy] = useState(false);
 const [buyError, setBuyError] = useState<string | null>(null);
 const [itemToDelete, setItemToDelete] = useState<MarketplaceItem | null>(null);
 const [isDeleting, setIsDeleting] = useState(false);

 // Facebook Marketplace-style "Interested in purchasing" inquiry state
 const [interestedItem, setInterestedItem] = useState<MarketplaceItem | null>(null);
 const [inquiryMessage, setInquiryMessage] = useState('Hi, is this still available?');
 const [isSendingInquiry, setIsSendingInquiry] = useState(false);
 const [inquiryError, setInquiryError] = useState<string | null>(null);
 const [inquirySuccess, setInquirySuccess] = useState(false);

 // Form states
 const [title, setTitle] = useState('');
 const [description, setDescription] = useState('');
 const [price, setPrice] = useState('0');
 const [currency, setCurrency] = useState('USD');
 const [category, setCategory] = useState('digital');
 const [imageUrl, setImageUrl] = useState('');
 const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
 const [isUnlimitedStock, setIsUnlimitedStock] = useState(true);
 const [stock, setStock] = useState('1');
 const [contactInfo, setContactInfo] = useState('');
 const [tagsInput, setTagsInput] = useState('');
 const [itemStatus, setItemStatus] = useState<'active' | 'sold'>('active');
 const [formError, setFormError] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);

 const fileInputRef = React.useRef<HTMLInputElement>(null);

 const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.type.startsWith('image/')) {
  setFormError('Please select a valid image file (PNG, JPG, WEBP, GIF)');
  return;
 }
 if (file.size > 8 * 1024 * 1024) {
  setFormError('Image file size must be under 8MB');
  return;
 }

 const reader = new FileReader();
 reader.onload = (event) => {
  const result = event.target?.result as string;
  if (result) {
  setImageUrl(result);
  setFormError(null);
  }
 };
 reader.onerror = () => {
  setFormError('Failed to process image file');
 };
 reader.readAsDataURL(file);
 };

 const handleMarkAsSold = async (itemId: string) => {
 if (!server?.id) return;
 try {
  const res = await fetch(`/api/servers/${server.id}/marketplace/items/${itemId}`, {
  method: 'PATCH',
  headers: getHeaders(),
  body: JSON.stringify({
   status: 'sold',
   stock: 0
  })
  });
  if (res.ok) {
  const updated = await res.json();
  setItems(prev => prev.map(i => i.id === itemId ? updated : i));
  if ((window as any).showVylantToast) {
   (window as any).showVylantToast("Item marked as Sold & moved to Completed History!", "success");
  }
  } else {
  const err = await res.json().catch(() => ({}));
  alert(err.error || "Failed to mark item as sold");
  }
 } catch (err) {
  console.error("Failed to mark item as sold:", err);
 }
 };

 const handleRelistItem = async (itemId: string) => {
 if (!server?.id) return;
 try {
  const res = await fetch(`/api/servers/${server.id}/marketplace/items/${itemId}`, {
  method: 'PATCH',
  headers: getHeaders(),
  body: JSON.stringify({
   status: 'active',
   stock: 1
  })
  });
  if (res.ok) {
  const updated = await res.json();
  setItems(prev => prev.map(i => i.id === itemId ? updated : i));
  if ((window as any).showVylantToast) {
   (window as any).showVylantToast("Item reactivated and relisted in Marketplace!", "success");
  }
  } else {
  const err = await res.json().catch(() => ({}));
  alert(err.error || "Failed to relist item");
  }
 } catch (err) {
  console.error("Failed to relist item:", err);
 }
 };

 const isOwner = server?.ownerId === userName;
 const userRoles = server?.memberRoles?.[userName] || [];
 const roles = server?.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
 const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);
 const allowMemberPosts = server?.marketplaceSettings?.allowMemberPosts ?? false;
 const canCreateListing = isOwner || canEditSettings || allowMemberPosts;

 const getHeaders = () => {
 const token = localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token');
 return {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
 };
 };

 const fetchMarketplaceData = async () => {
 if (!server?.id) return;
 try {
  setIsLoading(true);
  const res = await fetch(`/api/servers/${server.id}/marketplace`, { headers: getHeaders() });
  if (res.ok) {
  const data = await res.json();
  setItems(data.items || []);
  setOrders(data.orders || []);
  }
 } catch (err) {
  console.error('Failed to load marketplace data:', err);
 } finally {
  setIsLoading(false);
 }
 };

 useEffect(() => {
 fetchMarketplaceData();
 }, [server?.id]);

 useEffect(() => {
 if (!socket || !server?.id) return;
 const handleCreated = ({ serverId, item }: any) => {
  if (serverId === server.id) {
  setItems(prev => [item, ...prev.filter(i => i.id !== item.id)]);
  }
 };
 const handleUpdated = ({ serverId, item }: any) => {
  if (serverId === server.id) {
  setItems(prev => prev.map(i => i.id === item.id ? item : i));
  }
 };
 const handleDeleted = ({ serverId, itemId }: any) => {
  if (serverId === server.id) {
  setItems(prev => prev.filter(i => i.id !== itemId));
  }
 };
 const handleOrderCreated = ({ serverId, order }: any) => {
  if (serverId === server.id) {
  setOrders(prev => [order, ...prev.filter(o => o.id !== order.id)]);
  }
 };

 socket.on('marketplace-item-created', handleCreated);
 socket.on('marketplace-item-updated', handleUpdated);
 socket.on('marketplace-item-deleted', handleDeleted);
 socket.on('marketplace-order-created', handleOrderCreated);

 return () => {
  socket.off('marketplace-item-created', handleCreated);
  socket.off('marketplace-item-updated', handleUpdated);
  socket.off('marketplace-item-deleted', handleDeleted);
  socket.off('marketplace-order-created', handleOrderCreated);
 };
 }, [socket, server?.id]);

 const openCreateModal = () => {
 setEditingItem(null);
 setTitle('');
 setDescription('');
 setPrice('0');
 setCurrency('USD');
 setCategory('digital');
 setImageUrl('');
 setImageInputMode('upload');
 setItemStatus('active');
 setIsUnlimitedStock(true);
 setStock('1');
 setContactInfo('');
 setTagsInput('');
 setFormError(null);
 setIsItemModalOpen(true);
 };

 const openEditModal = (item: MarketplaceItem) => {
 setEditingItem(item);
 setTitle(item.title);
 setDescription(item.description || '');
 setPrice(item.price.toString());
 setCurrency(item.currency || 'USD');
 setCategory(item.category || 'digital');
 setImageUrl(item.imageUrl || '');
 setImageInputMode(item.imageUrl?.startsWith('http') ? 'url' : 'upload');
 setItemStatus(item.status === 'sold' ? 'sold' : 'active');
 setIsUnlimitedStock(item.stock === -1);
 setStock(item.stock === -1 ? '1' : item.stock.toString());
 setContactInfo(item.contactInfo || '');
 setTagsInput(Array.isArray(item.tags) ? item.tags.join(', ') : '');
 setFormError(null);
 setIsItemModalOpen(true);
 };

 const handleSubmitItem = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!title.trim()) {
  setFormError('Item title is required.');
  return;
 }

 try {
  setIsSubmitting(true);
  setFormError(null);

  const parsedPrice = Math.max(0, parseFloat(price) || 0);
  const parsedStock = isUnlimitedStock ? -1 : Math.max(1, parseInt(stock) || 1);
  const tags = tagsInput
  .split(',')
  .map(t => t.trim())
  .filter(t => t.length > 0);

  const payload = {
  title: title.trim(),
  description: description.trim(),
  price: parsedPrice,
  currency,
  category,
  imageUrl: imageUrl.trim() || undefined,
  stock: parsedStock,
  contactInfo: contactInfo.trim(),
  tags,
  status: itemStatus
  };

  const url = editingItem 
  ? `/api/servers/${server.id}/marketplace/items/${editingItem.id}`
  : `/api/servers/${server.id}/marketplace/items`;
  const method = editingItem ? 'PATCH' : 'POST';

  const res = await fetch(url, {
  method,
  headers: getHeaders(),
  body: JSON.stringify(payload)
  });

  if (!res.ok) {
  const errorData = await res.json();
  throw new Error(errorData.error || 'Failed to save marketplace item');
  }

  setIsItemModalOpen(false);
  await fetchMarketplaceData();
 } catch (err: any) {
  setFormError(err.message || 'Something went wrong');
 } finally {
  setIsSubmitting(false);
 }
 };

 const handleDeleteItem = async (itemId: string) => {
 try {
  setIsDeleting(true);
  const res = await fetch(`/api/servers/${server.id}/marketplace/items/${itemId}`, {
  method: 'DELETE',
  headers: getHeaders()
  });
  if (res.ok) {
  setItems(prev => prev.filter(i => i.id !== itemId));
  setItemToDelete(null);
  }
 } catch (err) {
  console.error('Failed to delete item:', err);
 } finally {
  setIsDeleting(false);
 }
 };

 const handleBuyItem = async () => {
 if (!purchasingItem) return;
 try {
  setIsProcessingBuy(true);
  setBuyError(null);
  const res = await fetch(`/api/servers/${server.id}/marketplace/items/${purchasingItem.id}/buy`, {
  method: 'POST',
  headers: getHeaders(),
  body: JSON.stringify({ note: purchaseNote })
  });

  if (!res.ok) {
  const errData = await res.json();
  throw new Error(errData.error || 'Failed to complete order');
  }

  const data = await res.json();
  setPurchaseSuccess(data.order);
  await fetchMarketplaceData();
 } catch (err: any) {
  setBuyError(err.message || 'Purchase failed. Please try again.');
 } finally {
  setIsProcessingBuy(false);
 }
 };

 const handleOpenInterestModal = (item: MarketplaceItem) => {
 setInterestedItem(item);
 setInquiryMessage('Hi, is this still available?');
 setInquiryError(null);
 setInquirySuccess(false);
 };

 const handleSendInquiryAndChat = async (directSend = true) => {
 if (!interestedItem) return;
 try {
  setIsSendingInquiry(true);
  setInquiryError(null);

  const res = await fetch(`/api/servers/${server.id}/marketplace/items/${interestedItem.id}/interest`, {
  method: 'POST',
  headers: getHeaders(),
  body: JSON.stringify({
   message: directSend ? inquiryMessage : '',
   sendDirectMessage: directSend
  })
  });

  if (!res.ok) {
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error || 'Failed to submit interest');
  }

  const resData = await res.json();
  if (resData.item) {
  setItems(prev => prev.map(i => i.id === resData.item.id ? resData.item : i));
  }

  setInquirySuccess(true);

  if (onStartChat) {
  onStartChat(interestedItem.sellerName, interestedItem, inquiryMessage, directSend);
  }

  setTimeout(() => {
  setInterestedItem(null);
  setInquirySuccess(false);
  }, 700);
 } catch (err: any) {
  setInquiryError(err.message || 'Failed to send inquiry message');
 } finally {
  setIsSendingInquiry(false);
 }
 };

 // Separate active and completed/sold items
 const activeItems = items.filter(item => item.status !== 'sold');
 const completedItems = items.filter(item => item.status === 'sold' || item.status === 'sold_out');

 const displayItems = activeTab === 'sold' ? completedItems : activeItems;

 // Filter and sort items
 const filteredItems = displayItems
 .filter(item => {
  if (selectedCategory !== 'all' && item.category !== selectedCategory) {
  return false;
  }
  if (searchQuery.trim()) {
  const q = searchQuery.toLowerCase();
  const matchesTitle = item.title.toLowerCase().includes(q);
  const matchesDesc = (item.description || '').toLowerCase().includes(q);
  const matchesTag = item.tags?.some(t => t.toLowerCase().includes(q));
  const matchesSeller = item.sellerName.toLowerCase().includes(q);
  return matchesTitle || matchesDesc || matchesTag || matchesSeller;
  }
  return true;
 })
 .sort((a, b) => {
  if (sortBy === 'newest') return b.createdAt - a.createdAt;
  if (sortBy === 'price_low') return a.price - b.price;
  if (sortBy === 'price_high') return b.price - a.price;
  return 0;
 });

 const formatPrice = (p: number, curr = 'USD') => {
 if (p === 0) return 'Free Perk';
 if (curr === 'USD') return `$${p.toFixed(2)}`;
 if (curr === 'EUR') return `€${p.toFixed(2)}`;
 if (curr === 'Coins') return `${p} 🪙`;
 if (curr === 'Points') return `${p} ⭐`;
 return `${p} ${curr}`;
 };

 const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

 const handleCopyListingLink = (e: React.MouseEvent, item: MarketplaceItem) => {
 e.stopPropagation();
 const origin = window.location.origin;
 const link = `${origin}?server=${item.serverId}&marketplaceItem=${item.id}`;
 const formattedText = `🛒 Marketplace Item: ${item.title} - ${formatPrice(item.price, item.currency)}\nSeller: ${item.sellerName}\nLink: ${link}`;
 
 try {
  navigator.clipboard.writeText(formattedText);
  setCopiedItemId(item.id);
  if ((window as any).showVylantToast) {
  (window as any).showVylantToast("Copied listing link & details to clipboard!", "success");
  }
  setTimeout(() => setCopiedItemId(null), 2500);
 } catch (err) {
  console.error("Failed to copy listing link", err);
 }
 };

 return (
 <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDarkMode ? 'bg-[#0f1117] text-white' : 'bg-navy-50 text-navy-900'}`}>
  {/* Action controls bar */}
  <div className={`px-6 py-4 border-b flex items-center justify-between gap-3 ${isDarkMode ? 'border-white/5 bg-[#12151e]/80 backdrop-blur-md' : 'border-navy-200 bg-white/80 backdrop-blur-md'}`}>
  {/* Tabs switch */}
  <div className={`flex p-1 rounded-xl border ${isDarkMode ? 'bg-black/30 border-white/5' : 'bg-navy-100 border-navy-200'}`}>
   <button
   onClick={() => setActiveTab('listings')}
   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
    activeTab === 'listings'
    ? 'bg-purple-600 text-white shadow-sm'
    : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
   }`}
   >
   Active ({activeItems.length})
   </button>
   <button
   onClick={() => setActiveTab('sold')}
   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
    activeTab === 'sold'
    ? 'bg-purple-600 text-white shadow-sm'
    : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
   }`}
   >
   <CheckCircle2 size={13} className={activeTab === 'sold' ? 'text-emerald-300' : 'text-emerald-400'} />
   <span>Sold History ({completedItems.length})</span>
   </button>
   <button
   onClick={() => setActiveTab('orders')}
   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
    activeTab === 'orders'
    ? 'bg-purple-600 text-white shadow-sm'
    : isDarkMode ? 'text-white/60 hover:text-white' : 'text-navy-600 hover:text-navy-900'
   }`}
   >
   Orders ({orders.length})
   </button>
  </div>

  <div className="flex items-center gap-2">
   {canCreateListing && (
   <button
    onClick={openCreateModal}
    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 cursor-pointer"
   >
    <Plus size={16} />
    Add Listing
   </button>
   )}

   {isOwner && onOpenSettings && (
   <button
    onClick={onOpenSettings}
    title="Marketplace Settings"
    className={`p-2 rounded-xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70' : 'bg-white border-navy-200 hover:bg-navy-100 text-navy-700'}`}
   >
    <Settings size={16} />
   </button>
   )}
  </div>
  </div>

  {/* Main content */}
  <div className="flex-1 overflow-y-auto p-6 space-y-6">
  {activeTab === 'listings' && (
   <>
   {/* Search and Filter toolbar */}
   <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
    <div className={`relative flex-1 flex items-center px-3.5 py-2 rounded-xl border transition-all ${isDarkMode ? 'bg-black/20 border-white/10 focus-within:border-purple-500/50 focus-within:bg-black/40' : 'bg-white border-navy-200 focus-within:border-purple-500 focus-within:shadow-sm'}`}>
    <Search size={15} className={isDarkMode ? 'text-white/40 mr-2.5 shrink-0' : 'text-navy-400 mr-2.5 shrink-0'} />
    <input
     type="text"
     placeholder="Search items, descriptions, tags, sellers..."
     value={searchQuery}
     onChange={(e) => setSearchQuery(e.target.value)}
     className="w-full bg-transparent text-xs outline-none placeholder:text-inherit/30"
    />
    {searchQuery && (
     <button onClick={() => setSearchQuery('')} className="p-0.5 rounded text-white/40 hover:text-white shrink-0 cursor-pointer">
     <X size={13} />
     </button>
    )}
    </div>

    <div className="flex items-center gap-2.5 shrink-0">
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${isDarkMode ? 'bg-vylant-navy border-white/10' : 'bg-white border-navy-200'}`}>
     <Filter size={13} className={isDarkMode ? 'text-white/50' : 'text-navy-400'} />
     <select
     value={selectedCategory}
     onChange={(e) => setSelectedCategory(e.target.value)}
     className="bg-transparent text-xs py-0.5 outline-none font-medium cursor-pointer text-inherit"
     >
     {CATEGORIES.map(cat => (
      <option key={cat.id} value={cat.id} className={isDarkMode ? 'bg-vylant-navy text-white' : 'bg-white text-navy-800'}>
      {cat.label}
      </option>
     ))}
     </select>
    </div>

    <select
     value={sortBy}
     onChange={(e: any) => setSortBy(e.target.value)}
     className={`text-xs px-3 py-2 rounded-xl border outline-none font-medium cursor-pointer ${isDarkMode ? 'bg-vylant-navy border-white/10 text-white/80' : 'bg-white border-navy-200 text-navy-700'}`}
    >
     <option value="newest" className={isDarkMode ? 'bg-vylant-navy text-white' : 'bg-white text-navy-800'}>Newest First</option>
     <option value="price_low" className={isDarkMode ? 'bg-vylant-navy text-white' : 'bg-white text-navy-800'}>Price: Low to High</option>
     <option value="price_high" className={isDarkMode ? 'bg-vylant-navy text-white' : 'bg-white text-navy-800'}>Price: High to Low</option>
    </select>
    </div>
   </div>

   {/* Listings Grid */}
   {isLoading ? (
    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
    {[1, 2, 3, 4].map(idx => (
     <div key={idx} className={`h-72 rounded-2xl animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-navy-200'}`} />
    ))}
    </div>
   ) : filteredItems.length === 0 ? (
    <div className={`flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed my-8 ${isDarkMode ? 'border-white/10 bg-white/[0.01]' : 'border-navy-200 bg-white/50'}`}>
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
     activeTab === 'sold' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'
    }`}>
     {activeTab === 'sold' ? <CheckCircle2 size={32} /> : <ShoppingBag size={28} />}
    </div>
    <h3 className="text-base font-bold">
     {activeTab === 'sold' ? 'No completed or sold items yet' : 'No marketplace items found'}
    </h3>
    <p className={`text-xs max-w-sm mt-1 mb-5 ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
     {activeTab === 'sold'
     ? "When sellers mark listings as sold, they will automatically be archived in this completed listings history!"
     : searchQuery 
     ? "No products matched your search query. Try searching for different keywords or clear your filter."
     : "There are currently no active items listed in this server marketplace."}
    </p>
    {canCreateListing && activeTab !== 'sold' && (
     <button
     onClick={openCreateModal}
     className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all cursor-pointer"
     >
     <Plus size={16} />
     Post First Listing
     </button>
    )}
    </div>
   ) : (
    <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
    {filteredItems.map(item => {
     const isSoldOut = item.status === 'sold_out' || item.stock === 0;
     const isSold = item.status === 'sold';
     const isItemSeller = item.sellerId === userName || isOwner;
     const catObj = CATEGORIES.find(c => c.id === item.category);

     return (
     <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 hover:shadow-xl ${
      isDarkMode 
       ? 'bg-vylant-navy/70 border-white/5 hover:border-purple-500/30' 
       : 'bg-white border-navy-200 hover:border-purple-300'
      }`}
     >
      {/* Item Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-tr from-vylant-navy/30 to-vylant-navy/20">
      {item.imageUrl ? (
       <img 
       src={item.imageUrl} 
       alt={item.title} 
       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
       />
      ) : (
       <div className="w-full h-full flex items-center justify-center text-purple-400/40">
       <ShoppingBag size={42} />
       </div>
      )}

      {/* Top Badges (Category + Stock/Sold status) */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1.5 pointer-events-none z-10">
       <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg border backdrop-blur-md shrink-0 shadow-sm truncate max-w-[60%] ${catObj?.color || 'text-white bg-black/60 border-white/20'}`}>
       {catObj?.label || item.category}
       </span>

       <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg backdrop-blur-md shadow-sm shrink-0 flex items-center gap-1 ${
       isSold 
        ? 'bg-emerald-600 text-white border border-emerald-400' 
        : isSoldOut 
        ? 'bg-red-500/90 text-white' 
        : item.stock > 0 
        ? 'bg-emerald-500/90 text-white' 
        : 'bg-black/60 text-white/90 border border-white/20'
       }`}>
       {isSold ? '✓ SOLD' : isSoldOut ? 'Sold Out' : item.stock > 0 ? `${item.stock} left` : 'In Stock'}
       </span>
      </div>

      {/* Manage / Copy buttons for creator/owner/visitors */}
      <div className="absolute bottom-2 right-2 flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity z-10">
       <button
       onClick={(e) => handleCopyListingLink(e, item)}
       className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md transition-colors flex items-center gap-1"
       title="Copy Listing Link & Details"
       >
       {copiedItemId === item.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
       </button>
       {isItemSeller && (
       <>
        <button
        onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
        className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-white text-xs backdrop-blur-md transition-colors"
        title="Edit item"
        >
        <Edit3 size={13} />
        </button>
        <button
        onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}
        className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white text-xs backdrop-blur-md transition-colors"
        title="Delete item"
        >
        <Trash2 size={13} />
        </button>
       </>
       )}
      </div>
      </div>

      {/* Content details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
      <div>
       <div className="flex items-center justify-between gap-2 mb-1">
       <h3 className="font-bold text-sm tracking-tight line-clamp-1 group-hover:text-purple-400 transition-colors">
        {item.title}
       </h3>
       <span className="font-extrabold text-sm text-purple-400 shrink-0">
        {formatPrice(item.price, item.currency)}
       </span>
       </div>

       <div className="flex items-center gap-2 mb-1.5">
       {item.interestedUsers && item.interestedUsers.length > 0 && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
        <Heart size={10} className="fill-pink-500/30 text-pink-400" />
        {item.interestedUsers.length} interested
        </span>
       )}
       </div>

       <p className={`text-xs line-clamp-2 leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-navy-600'}`}>
       {item.description || 'No description provided.'}
       </p>
      </div>

      {/* Tags preview */}
      {item.tags && item.tags.length > 0 && (
       <div className="flex flex-wrap gap-1">
       {item.tags.slice(0, 3).map((tag, tIdx) => (
        <span key={tIdx} className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${isDarkMode ? 'bg-white/5 text-white/40' : 'bg-navy-100 text-navy-500'}`}>
        #{tag}
        </span>
       ))}
       {item.tags.length > 3 && (
        <span className={`text-[9px] px-1 py-0.5 rounded ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
        +{item.tags.length - 3}
        </span>
       )}
       </div>
      )}

      {/* Footer: Seller & Actions */}
      <div className="pt-2 border-t flex flex-col gap-2 mt-auto border-white/5">
       <div className="flex items-center gap-1.5 min-w-0">
       <div className="w-5 h-5 rounded-full overflow-hidden bg-purple-500/20 shrink-0 flex items-center justify-center text-[10px] font-bold">
        {item.sellerAvatar ? (
        <img src={item.sellerAvatar} alt={item.sellerName} className="w-full h-full object-cover" />
        ) : (
        item.sellerName.substring(0, 1).toUpperCase()
        )}
       </div>
       <span className={`text-[11px] truncate font-medium ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
        {item.sellerName === userName ? 'You (Seller)' : item.sellerName}
       </span>
       </div>

       {item.status === 'sold' || activeTab === 'sold' ? (
       <div className="flex items-center gap-2 w-full">
        {isItemSeller && (
        <button
         onClick={() => handleRelistItem(item.id)}
         className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 active:scale-95"
         title="Re-activate and relist this item in Marketplace"
        >
         <RefreshCw size={13} />
         <span>Relist Item</span>
        </button>
        )}
        <button
        onClick={() => openEditModal(item)}
        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
         isDarkMode ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white' : 'bg-navy-100 border-navy-200 hover:bg-navy-200 text-navy-800'
        } ${!isItemSeller ? 'w-full' : ''}`}
        >
        <Edit3 size={13} />
        <span>{isItemSeller ? 'Edit' : 'View Details'}</span>
        </button>
       </div>
       ) : isItemSeller ? (
       <div className="flex flex-col gap-1.5 w-full">
        <div className="grid grid-cols-2 gap-2 w-full">
        <button
         onClick={() => openEditModal(item)}
         className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
         <Edit3 size={13} />
         <span>Edit</span>
        </button>
        <button
         onClick={(e) => handleCopyListingLink(e, item)}
         className="py-2 px-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
         title="Copy Link & Details"
        >
         {copiedItemId === item.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
         <span>{copiedItemId === item.id ? 'Copied' : 'Copy Link'}</span>
        </button>
        </div>

        <button
        onClick={() => handleMarkAsSold(item.id)}
        className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        title="Mark this item as sold and move to Completed History"
        >
        <CheckCircle2 size={14} className="text-emerald-400" />
        <span>Mark as Sold</span>
        </button>
       </div>
       ) : (
       <div className="grid grid-cols-2 gap-2 w-full">
        <button
        onClick={() => handleOpenInterestModal(item)}
        className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
         item.interestedUsers?.includes(userName)
         ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30'
         : isDarkMode ? 'bg-white/10 hover:bg-white/15 text-white' : 'bg-navy-200 hover:bg-navy-300 text-navy-800'
        }`}
        title="Message seller & express interest in this item"
        >
        <MessageSquare size={13} className={item.interestedUsers?.includes(userName) ? 'text-pink-400' : 'text-purple-400'} />
        <span className="truncate">{item.interestedUsers?.includes(userName) ? 'Interested' : "I'm Interested"}</span>
        </button>

        <button
        onClick={() => {
         setPurchasingItem(item);
         setPurchaseNote('');
         setPurchaseSuccess(null);
         setBuyError(null);
        }}
        disabled={isSoldOut}
        className={`w-full py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
         isSoldOut 
         ? (isDarkMode ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-navy-100 text-navy-400 cursor-not-allowed')
         : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm hover:scale-[1.02] active:scale-95'
        }`}
        >
        <ShoppingBag size={13} />
        <span>{isSoldOut ? 'Sold Out' : item.price === 0 ? 'Claim' : 'Buy'}</span>
        </button>
       </div>
       )}
      </div>
      </div>
     </motion.div>
     );
    })}
    </div>
   )}
   </>
  )}

  {/* Orders View */}
  {activeTab === 'orders' && (
   <div className="space-y-4 max-w-4xl">
   <div className="flex items-center justify-between pb-2">
    <h2 className="text-sm font-bold uppercase tracking-wider text-purple-400">
    Marketplace Transaction History ({orders.length})
    </h2>
   </div>

   {orders.length === 0 ? (
    <div className={`p-12 text-center rounded-3xl border border-dashed ${isDarkMode ? 'border-white/10' : 'border-navy-200'}`}>
    <Receipt className={`mx-auto mb-3 ${isDarkMode ? 'text-white/20' : 'text-navy-300'}`} size={36} />
    <p className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>No orders have been recorded in this server yet.</p>
    </div>
   ) : (
    <div className="space-y-2">
    {orders.map(order => (
     <div
     key={order.id}
     className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
      isDarkMode ? 'bg-vylant-navy/70 border-white/5' : 'bg-white border-navy-200'
     }`}
     >
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
      <CheckCircle2 size={18} />
      </div>
      <div>
      <div className="flex items-center gap-2">
       <span className="font-bold text-sm">{order.itemTitle}</span>
       <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
       {order.status}
       </span>
      </div>
      <div className={`text-xs flex items-center gap-2 mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>
       <span>Buyer: <strong>{order.buyerName}</strong></span>
       <span>•</span>
       <span>Seller: <strong>{order.sellerName}</strong></span>
       <span>•</span>
       <span>{new Date(order.createdAt).toLocaleDateString()}</span>
      </div>
      {order.note && (
       <p className={`text-xs italic mt-1 ${isDarkMode ? 'text-white/60' : 'text-navy-600'}`}>
       "{order.note}"
       </p>
      )}
      </div>
     </div>

     <div className="text-right sm:self-center">
      <span className="font-mono font-extrabold text-base text-purple-400">
      {formatPrice(order.price, order.currency)}
      </span>
      <p className={`text-[10px] font-mono ${isDarkMode ? 'text-white/30' : 'text-navy-400'}`}>
      ID: {order.id.substring(0, 12)}
      </p>
     </div>
     </div>
    ))}
    </div>
   )}
   </div>
  )}
  </div>

  {/* CREATE / EDIT ITEM MODAL */}
  <AnimatePresence>
  {isItemModalOpen && (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
   <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
    isDarkMode ? 'bg-vylant-navy border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
    }`}
   >
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
    <div className="flex items-center gap-2">
     <ShoppingBag size={18} className="text-purple-400" />
     <h3 className="font-bold text-base">{editingItem ? 'Edit Listing' : 'Create Marketplace Listing'}</h3>
    </div>
    <button onClick={() => setIsItemModalOpen(false)} className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
     <X size={18} />
    </button>
    </div>

    <form onSubmit={handleSubmitItem} className="p-6 space-y-4 overflow-y-auto flex-1">
    {formError && (
     <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
     <AlertCircle size={15} />
     <span>{formError}</span>
     </div>
    )}

    <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Title *</label>
     <input
     type="text"
     required
     value={title}
     onChange={(e) => setTitle(e.target.value)}
     placeholder="e.g. VIP Supporter Role, Custom Emote Pack, Coaching Session"
     className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
     }`}
     />
    </div>

    <div className="grid grid-cols-2 gap-3">
     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Category</label>
     <select
      value={category}
      onChange={(e) => setCategory(e.target.value)}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none cursor-pointer ${
      isDarkMode ? 'bg-[#1a1f30] border-white/10 text-white' : 'bg-navy-50 border-navy-200 text-navy-800'
      }`}
     >
      <option value="roles">Roles & VIP</option>
      <option value="digital">Digital Goods</option>
      <option value="merch">Merch & Physical</option>
      <option value="services">Services</option>
      <option value="other">Other</option>
     </select>
     </div>

     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Currency</label>
     <select
      value={currency}
      onChange={(e) => setCurrency(e.target.value)}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none cursor-pointer ${
      isDarkMode ? 'bg-[#1a1f30] border-white/10 text-white' : 'bg-navy-50 border-navy-200 text-navy-800'
      }`}
     >
      <option value="USD">USD ($)</option>
      <option value="EUR">EUR (€)</option>
      <option value="Coins">Vylant Coins (🪙)</option>
      <option value="Points">Reward Points (⭐)</option>
     </select>
     </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Price</label>
     <input
      type="number"
      step="any"
      min="0"
      value={price}
      onChange={(e) => setPrice(e.target.value)}
      placeholder="0 for free perk"
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
      }`}
     />
     </div>

     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Stock</label>
     <div className="flex items-center gap-2">
      <input
      type="number"
      min="1"
      disabled={isUnlimitedStock}
      value={stock}
      onChange={(e) => setStock(e.target.value)}
      className={`w-24 px-3.5 py-2.5 rounded-xl border text-sm outline-none disabled:opacity-40 ${
       isDarkMode ? 'bg-black/30 border-white/10 text-white' : 'bg-navy-50 border-navy-200'
      }`}
      />
      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
      <input
       type="checkbox"
       checked={isUnlimitedStock}
       onChange={(e) => setIsUnlimitedStock(e.target.checked)}
       className="rounded text-purple-600 focus:ring-purple-500"
      />
      <span>Unlimited</span>
      </label>
     </div>
     </div>
    </div>

    <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Description</label>
     <textarea
     rows={3}
     value={description}
     onChange={(e) => setDescription(e.target.value)}
     placeholder="Describe what the buyer receives, rules, instructions..."
     className={`w-full px-3.5 py-2 rounded-xl border text-sm outline-none resize-none ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
     }`}
     />
    </div>

    <div>
     <div className="flex items-center justify-between mb-1.5">
     <label className="text-xs font-bold uppercase tracking-wider opacity-60">Listing Photo</label>
     <div className="flex items-center gap-1 text-[10px] font-bold">
      <button
      type="button"
      onClick={() => setImageInputMode('upload')}
      className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
       imageInputMode === 'upload'
       ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
       : isDarkMode ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-navy-100 border-navy-200 text-navy-700'
      }`}
      >
      <Upload size={11} />
      <span>Upload File</span>
      </button>
      <button
      type="button"
      onClick={() => setImageInputMode('url')}
      className={`px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
       imageInputMode === 'url'
       ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
       : isDarkMode ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-navy-100 border-navy-200 text-navy-700'
      }`}
      >
      <LinkIcon size={11} />
      <span>URL / Presets</span>
      </button>
     </div>
     </div>

     <input
     ref={fileInputRef}
     type="file"
     accept="image/*"
     onChange={handleFileUpload}
     className="hidden"
     />

     {imageUrl ? (
     <div className="relative group rounded-2xl overflow-hidden border border-purple-500/30 bg-black/40 flex items-center justify-center">
      <img src={imageUrl} alt="Listing Preview" className="w-full h-44 object-cover" />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
      <button
       type="button"
       onClick={() => fileInputRef.current?.click()}
       className="px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500 shadow-lg cursor-pointer"
      >
       <Upload size={13} />
       <span>Change Image</span>
      </button>
      <button
       type="button"
       onClick={() => setImageUrl('')}
       className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-500 shadow-lg cursor-pointer"
      >
       <Trash2 size={13} />
       <span>Remove</span>
      </button>
      </div>
     </div>
     ) : imageInputMode === 'upload' ? (
     <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
       if (file.size > 8 * 1024 * 1024) {
       setFormError('Image file size must be under 8MB');
       return;
       }
       const reader = new FileReader();
       reader.onload = (ev) => {
       if (ev.target?.result) {
        setImageUrl(ev.target.result as string);
        setFormError(null);
       }
       };
       reader.readAsDataURL(file);
      }
      }}
      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
      isDarkMode 
       ? 'border-white/15 bg-white/[0.02] hover:border-purple-500/60 hover:bg-purple-500/5' 
       : 'border-navy-300 bg-navy-50 hover:border-purple-400 hover:bg-purple-50/50'
      }`}
     >
      <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
      <Upload size={20} />
      </div>
      <div>
      <p className="text-xs font-bold">Click to upload listing image</p>
      <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-white/40' : 'text-navy-400'}`}>
       Supports PNG, JPG, WEBP, GIF up to 8MB. Or drag & drop here.
      </p>
      </div>
     </div>
     ) : (
     <div>
      <input
      type="url"
      value={imageUrl}
      onChange={(e) => setImageUrl(e.target.value)}
      placeholder="https://... image link"
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
       isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
      }`}
      />
      {/* Preset quick picks */}
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
      <span className="text-[10px] opacity-40 shrink-0">Presets:</span>
      {PRESET_IMAGES.map((preset, pIdx) => (
       <button
       type="button"
       key={pIdx}
       onClick={() => setImageUrl(preset.url)}
       className={`text-[10px] px-2 py-0.5 rounded-lg border shrink-0 transition-colors ${
        imageUrl === preset.url
        ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
        : isDarkMode ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-navy-100 border-navy-200 text-navy-700'
       }`}
       >
       {preset.label}
       </button>
      ))}
      </div>
     </div>
     )}
    </div>

    <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">
     Delivery Instructions / Contact
     </label>
     <input
     type="text"
     value={contactInfo}
     onChange={(e) => setContactInfo(e.target.value)}
     placeholder="e.g. DM seller, join voice channel, or download link"
     className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
     }`}
     />
    </div>

    <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Listing Status</label>
     <div className="grid grid-cols-2 gap-2">
     <button
      type="button"
      onClick={() => setItemStatus('active')}
      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
      itemStatus === 'active'
       ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
       : isDarkMode ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-navy-100 border-navy-200 text-navy-700'
      }`}
     >
      <ShoppingBag size={13} />
      <span>Active Listing</span>
     </button>
     <button
      type="button"
      onClick={() => setItemStatus('sold')}
      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
      itemStatus === 'sold'
       ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
       : isDarkMode ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' : 'bg-navy-100 border-navy-200 text-navy-700'
      }`}
     >
      <CheckCircle2 size={13} />
      <span>Mark as Sold</span>
     </button>
     </div>
    </div>

    <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1.5 opacity-60">Tags (comma separated)</label>
     <input
     type="text"
     value={tagsInput}
     onChange={(e) => setTagsInput(e.target.value)}
     placeholder="vip, role, cosmetic, exclusive"
     className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
     }`}
     />
    </div>

    <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2">
     <button
     type="button"
     onClick={() => setIsItemModalOpen(false)}
     className="px-4 py-2 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
     >
     Cancel
     </button>
     <button
     type="submit"
     disabled={isSubmitting}
     className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
     >
     {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Listing'}
     </button>
    </div>
    </form>
   </motion.div>
   </div>
  )}
  </AnimatePresence>

  {/* BUY / CLAIM MODAL */}
  <AnimatePresence>
  {purchasingItem && (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
   <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 ${
    isDarkMode ? 'bg-vylant-navy border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
    }`}
   >
    {purchaseSuccess ? (
    <div className="text-center py-4 space-y-4">
     <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
     <CheckCircle2 size={36} />
     </div>
     <div>
     <h3 className="text-lg font-black">Order Confirmed!</h3>
     <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/60' : 'text-navy-600'}`}>
      You have successfully ordered <strong>{purchasingItem.title}</strong>.
     </p>
     </div>

     {purchasingItem.contactInfo && (
     <div className={`p-3 rounded-xl border text-left text-xs ${isDarkMode ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-800'}`}>
      <span className="font-bold block mb-0.5">Fulfillment Instruction:</span>
      <span>{purchasingItem.contactInfo}</span>
     </div>
     )}

     <div className={`text-[11px] font-mono p-2 rounded-lg ${isDarkMode ? 'bg-black/30 text-white/40' : 'bg-navy-100 text-navy-500'}`}>
     Order ID: {purchaseSuccess.id}
     </div>

     <button
     onClick={() => {
      setPurchasingItem(null);
      setPurchaseSuccess(null);
     }}
     className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
     >
     Done
     </button>
    </div>
    ) : (
    <div className="space-y-4">
     <div className="flex items-center justify-between pb-2 border-b border-white/5">
     <div className="flex items-center gap-2">
      <ShoppingBag size={18} className="text-purple-400" />
      <h3 className="font-bold text-base">Complete Purchase</h3>
     </div>
     <button onClick={() => setPurchasingItem(null)} className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white">
      <X size={18} />
     </button>
     </div>

     {buyError && (
     <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
      <AlertCircle size={16} className="shrink-0" />
      <span>{buyError}</span>
     </div>
     )}

     <div className={`p-4 rounded-2xl border flex gap-3.5 items-center ${isDarkMode ? 'bg-black/30 border-white/5' : 'bg-navy-50 border-navy-200'}`}>
     {purchasingItem.imageUrl ? (
      <img src={purchasingItem.imageUrl} alt={purchasingItem.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
     ) : (
      <div className="w-16 h-16 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
      <ShoppingBag size={24} />
      </div>
     )}
     <div className="min-w-0 flex-1">
      <h4 className="font-bold text-sm truncate">{purchasingItem.title}</h4>
      <p className={`text-xs truncate ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>Seller: {purchasingItem.sellerName}</p>
      <span className="font-extrabold text-sm text-purple-400 font-mono mt-1 block">
      {formatPrice(purchasingItem.price, purchasingItem.currency)}
      </span>
     </div>
     </div>

     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-60">Note to seller (optional)</label>
     <input
      type="text"
      value={purchaseNote}
      onChange={(e) => setPurchaseNote(e.target.value)}
      placeholder="e.g. My username for role assignment"
      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
      }`}
     />
     </div>

     <div className="pt-2 flex items-center gap-2">
     <button
      type="button"
      onClick={() => setPurchasingItem(null)}
      className="flex-1 py-2.5 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
     >
      Cancel
     </button>
     <button
      type="button"
      disabled={isProcessingBuy}
      onClick={handleBuyItem}
      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
     >
      {isProcessingBuy ? 'Processing...' : purchasingItem.price === 0 ? 'Confirm Claim' : `Pay ${formatPrice(purchasingItem.price, purchasingItem.currency)}`}
     </button>
     </div>
    </div>
    )}
   </motion.div>
   </div>
  )}
  </AnimatePresence>

  {/* FACEBOOK MARKETPLACE STYLE INQUIRY & CHAT MODAL */}
  <AnimatePresence>
  {interestedItem && (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
   <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 10 }}
    className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 ${
    isDarkMode ? 'bg-vylant-navy border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
    }`}
   >
    {inquirySuccess ? (
    <div className="text-center py-6 space-y-4">
     <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-400 mx-auto flex items-center justify-center animate-bounce">
     <CheckCircle2 size={36} />
     </div>
     <div>
     <h3 className="text-lg font-black">Message Sent!</h3>
     <p className={`text-xs mt-1 ${isDarkMode ? 'text-white/60' : 'text-navy-600'}`}>
      Launching direct chat with <strong>{interestedItem.sellerName}</strong>...
     </p>
     </div>
    </div>
    ) : (
    <div className="space-y-4">
     {/* Modal Header */}
     <div className="flex items-center justify-between pb-2 border-b border-white/5">
     <div className="flex items-center gap-2">
      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
      <MessageCircle size={18} />
      </div>
      <div>
      <h3 className="font-bold text-base">Message Seller</h3>
      <p className={`text-[11px] ${isDarkMode ? 'text-white/50' : 'text-navy-500'}`}>
       Chat directly with the seller about this item
      </p>
      </div>
     </div>
     <button 
      onClick={() => setInterestedItem(null)} 
      className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white"
     >
      <X size={18} />
     </button>
     </div>

     {inquiryError && (
     <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
      <AlertCircle size={16} className="shrink-0" />
      <span>{inquiryError}</span>
     </div>
     )}

     {/* Item Summary Card */}
     <div className={`p-3.5 rounded-2xl border flex gap-3.5 items-center ${
     isDarkMode ? 'bg-black/30 border-white/5' : 'bg-navy-50 border-navy-200'
     }`}>
     {interestedItem.imageUrl ? (
      <img src={interestedItem.imageUrl} alt={interestedItem.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
     ) : (
      <div className="w-14 h-14 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
      <ShoppingBag size={22} />
      </div>
     )}
     <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
      <h4 className="font-bold text-sm truncate">{interestedItem.title}</h4>
      <span className="font-extrabold text-sm text-purple-400 font-mono shrink-0">
       {formatPrice(interestedItem.price, interestedItem.currency)}
      </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
      <div className="flex items-center gap-1">
       <span className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>Seller:</span>
       <span className="text-xs font-semibold">{interestedItem.sellerName}</span>
      </div>
      {interestedItem.interestedUsers && interestedItem.interestedUsers.length > 0 && (
       <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center gap-1">
       <Heart size={9} className="fill-pink-500/30" />
       {interestedItem.interestedUsers.length} interested
       </span>
      )}
      </div>
     </div>
     </div>

     {/* Quick Inquiry Prompts (Facebook Marketplace Style) */}
     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-2 opacity-60">
      Quick Questions
     </label>
     <div className="flex flex-wrap gap-1.5">
      {INQUIRY_TEMPLATES.map((tmpl, idx) => (
      <button
       key={idx}
       type="button"
       onClick={() => setInquiryMessage(tmpl)}
       className={`text-xs px-3 py-1.5 rounded-full border transition-all text-left cursor-pointer ${
       inquiryMessage === tmpl
        ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
        : isDarkMode 
        ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' 
        : 'bg-navy-100 hover:bg-navy-200 text-navy-700 border-navy-200'
       }`}
      >
       {tmpl}
      </button>
      ))}
     </div>
     </div>

     {/* Custom Message Textarea */}
     <div>
     <label className="text-xs font-bold uppercase tracking-wider block mb-1 opacity-60">
      Your Message
     </label>
     <textarea
      rows={3}
      value={inquiryMessage}
      onChange={(e) => setInquiryMessage(e.target.value)}
      placeholder="Write a message to the seller..."
      className={`w-full p-3 rounded-2xl border text-sm outline-none resize-none ${
      isDarkMode ? 'bg-black/30 border-white/10 text-white focus:border-purple-500' : 'bg-navy-50 border-navy-200 focus:border-purple-500'
      }`}
     />
     </div>

     {/* Action Buttons */}
     <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
     <button
      type="button"
      disabled={isSendingInquiry || !inquiryMessage.trim()}
      onClick={() => handleSendInquiryAndChat(true)}
      className="w-full sm:flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
     >
      <Send size={14} />
      <span>{isSendingInquiry ? 'Sending...' : 'Send Message & Open Chat'}</span>
     </button>

     {interestedItem && (
      <button
      type="button"
      onClick={(e) => handleCopyListingLink(e, interestedItem)}
      className={`w-full sm:w-auto py-2.5 px-3.5 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
       isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' : 'bg-navy-100 hover:bg-navy-200 text-navy-700 border-navy-200'
      }`}
      title="Copy item details & marketplace chat link"
      >
      {copiedItemId === interestedItem.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
      <span>{copiedItemId === interestedItem.id ? 'Copied Link' : 'Copy Link'}</span>
      </button>
     )}

     <button
      type="button"
      disabled={isSendingInquiry}
      onClick={() => handleSendInquiryAndChat(false)}
      className={`w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
      isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10' : 'bg-navy-100 hover:bg-navy-200 text-navy-700 border-navy-200'
      }`}
      title="Open DM conversation with pre-filled draft"
     >
      <ArrowUpRight size={14} />
      <span>Open Chat Draft</span>
     </button>
     </div>
    </div>
    )}
   </motion.div>
   </div>
  )}
  </AnimatePresence>

  {/* DELETE CONFIRMATION MODAL */}
  <AnimatePresence>
  {itemToDelete && (
   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
   <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className={`w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden p-6 ${
    isDarkMode ? 'bg-vylant-navy border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
    }`}
   >
    <div className="flex items-center gap-3 mb-4">
    <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-500">
     <Trash2 size={22} />
    </div>
    <div>
     <h3 className="font-bold text-base">Remove Listing</h3>
     <p className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-navy-500'}`}>This action cannot be undone.</p>
    </div>
    </div>

    <p className={`text-xs mb-6 leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-navy-600'}`}>
    Are you sure you want to permanently remove <strong>{itemToDelete.title}</strong> from this server's marketplace?
    </p>

    <div className="flex items-center gap-2">
    <button
     type="button"
     onClick={() => setItemToDelete(null)}
     className="flex-1 py-2.5 rounded-xl text-xs font-bold opacity-60 hover:opacity-100 transition-opacity"
    >
     Cancel
    </button>
    <button
     type="button"
     disabled={isDeleting}
     onClick={() => handleDeleteItem(itemToDelete.id)}
     className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
    >
     {isDeleting ? 'Removing...' : 'Delete Listing'}
    </button>
    </div>
   </motion.div>
   </div>
  )}
  </AnimatePresence>
 </div>
 );
}
