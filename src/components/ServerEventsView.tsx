import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 Calendar, 
 Clock, 
 MapPin, 
 Volume2, 
 Users, 
 Plus, 
 Trash2, 
 Edit, 
 X, 
 Link, 
 Check, 
 Info
} from 'lucide-react';

interface ServerEventsViewProps {
 server: any;
 serverEvents: any[];
 onRefreshEvents: () => void;
 isDarkMode: boolean;
 userName: string;
}

export default function ServerEventsView({
 server,
 serverEvents,
 onRefreshEvents,
 isDarkMode,
 userName
}: ServerEventsViewProps) {
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [editingEvent, setEditingEvent] = useState<any | null>(null);
 
 // Form states
 const [eventName, setEventName] = useState('');
 const [eventDescription, setEventDescription] = useState('');
 const [locationType, setLocationType] = useState<'voice' | 'external'>('voice');
 const [selectedChannelId, setSelectedChannelId] = useState('');
 const [externalLocation, setExternalLocation] = useState('');
 const [startTime, setStartTime] = useState('');
 const [endTime, setEndTime] = useState('');
 const [bannerUrl, setBannerUrl] = useState('');
 const [formError, setFormError] = useState<string | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

 const voiceChannels = server?.channels?.filter((c: any) => c.type === 'voice') || [];
 const isOwner = server?.ownerId === userName;
 const userRoles = server?.memberRoles?.[userName] || [];
 const roles = server?.roles?.filter((r: any) => userRoles.includes(r.id)) || [];
 const canEditSettings = roles.some((r: any) => r.permissions && r.permissions['editSettings'] === true);
 const canCreateEvents = isOwner || canEditSettings;

 const getHeaders = () => {
  const token = localStorage.getItem('vylant_token') || sessionStorage.getItem('vylant_token');
  return {
   'Content-Type': 'application/json',
   'Authorization': `Bearer ${token}`
  };
 };

 const openCreateModal = () => {
  setEventName('');
  setEventDescription('');
  setLocationType('voice');
  setSelectedChannelId(voiceChannels[0]?.id || '');
  setExternalLocation('');
  
  // Set default start time to tomorrow at 8:00 PM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);
  
  // Format to yyyy-MM-ddThh:mm for datetime-local input
  const offset = tomorrow.getTimezoneOffset();
  const localTomorrow = new Date(tomorrow.getTime() - offset * 60 * 1000);
  setStartTime(localTomorrow.toISOString().slice(0, 16));
  setEndTime('');
  setBannerUrl('');
  
  setFormError(null);
  setEditingEvent(null);
  setIsCreateModalOpen(true);
 };

 const openEditModal = (event: any) => {
  setEditingEvent(event);
  setEventName(event.name);
  setEventDescription(event.description || '');
  
  // Check if location is a voice channel of this server
  const isVoice = voiceChannels.some((vc: any) => vc.id === event.location || vc.name === event.location);
  if (isVoice) {
   setLocationType('voice');
   const channel = voiceChannels.find((vc: any) => vc.id === event.location || vc.name === event.location);
   setSelectedChannelId(channel?.id || voiceChannels[0]?.id || '');
  } else {
   setLocationType('external');
   setExternalLocation(event.location || '');
  }

  setStartTime(event.startTime || '');
  setEndTime(event.endTime || '');
  setBannerUrl(event.bannerUrl || '');
  setFormError(null);
  setIsCreateModalOpen(true);
 };

 const handleFormSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!eventName.trim()) {
   setFormError('Event name is required');
   return;
  }
  if (!startTime) {
   setFormError('Start date & time is required');
   return;
  }

  const location = locationType === 'voice' 
   ? selectedChannelId 
   : externalLocation;

  if (locationType === 'voice' && !selectedChannelId) {
   setFormError('Please select a voice channel');
   return;
  }
  if (locationType === 'external' && !externalLocation.trim()) {
   setFormError('Please enter an external location link or location description');
   return;
  }

  setIsSubmitting(true);
  setFormError(null);

  try {
   const url = editingEvent 
    ? `/api/servers/${server.id}/events/${editingEvent.id}` 
    : `/api/servers/${server.id}/events`;
   
   const method = editingEvent ? 'PATCH' : 'POST';

   const response = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify({
     name: eventName,
     description: eventDescription,
     location,
     startTime,
     endTime,
     bannerUrl
    })
   });

   if (response.ok) {
    setIsCreateModalOpen(false);
    onRefreshEvents();
   } else {
    const errData = await response.json();
    setFormError(errData.error || 'Something went wrong');
   }
  } catch (error) {
   setFormError('Network error. Failed to save event.');
  } finally {
   setIsSubmitting(false);
  }
 };

 const handleToggleInterested = async (eventId: string) => {
  try {
   const response = await fetch(`/api/servers/${server.id}/events/${eventId}/interested`, {
    method: 'POST',
    headers: getHeaders()
   });
   if (response.ok) {
    onRefreshEvents();
   }
  } catch (e) {
   console.error('Failed to toggle attendance:', e);
  }
 };

 const handleDeleteEvent = async (eventId: string) => {
  try {
   const response = await fetch(`/api/servers/${server.id}/events/${eventId}`, {
    method: 'DELETE',
    headers: getHeaders()
   });
   if (response.ok) {
    setDeletingEventId(null);
    onRefreshEvents();
   } else {
    const err = await response.json();
    setFormError(err.error || 'Failed to delete event');
   }
  } catch (e) {
   console.error('Failed to delete event:', e);
   setFormError('Network error. Failed to delete event.');
  }
 };

 const getVoiceChannelName = (channelIdOrName: string) => {
  const vc = voiceChannels.find((c: any) => c.id === channelIdOrName || c.name === channelIdOrName);
  return vc ? vc.name : channelIdOrName;
 };

 const formatEventDate = (dateStr: string) => {
  try {
   const date = new Date(dateStr);
   return date.toLocaleDateString(undefined, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
   });
  } catch (e) {
   return dateStr;
  }
 };

 const formatEventTime = (dateStr: string) => {
  try {
   const date = new Date(dateStr);
   return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
   });
  } catch (e) {
   return dateStr;
  }
 };

 // Divide events into Scheduled and Drafts/Past if necessary
 const now = new Date();
 const upcomingEvents = serverEvents.filter((ev: any) => {
  const evDate = new Date(ev.startTime);
  // Keep events starting now or in the future, or active within 2 hours
  return evDate.getTime() + 2 * 60 * 60 * 1000 > now.getTime();
 });

 const pastEvents = serverEvents.filter((ev: any) => {
  const evDate = new Date(ev.startTime);
  return evDate.getTime() + 2 * 60 * 60 * 1000 <= now.getTime();
 });

 return (
  <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDarkMode ? 'text-white' : 'text-navy-900'}`}>
   
   {/* Scrollable Event Content area */}
   <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8 select-text">
    
    {/* Dynamic List */}
    <div className="space-y-6">
     <div className="flex items-center justify-between border-b pb-3 border-current border-opacity-10">
      <h2 className="font-extrabold text-sm uppercase tracking-widest opacity-80 flex items-center gap-2">
       <Calendar size={16} />
       Upcoming Events ({upcomingEvents.length})
      </h2>
      {canCreateEvents && (
       <button
        onClick={openCreateModal}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-vylant-blue text-white rounded-lg font-bold hover:bg-opacity-90 transition-all text-[11px] uppercase tracking-wider"
       >
        <Plus size={14} />
        Schedule
       </button>
      )}
     </div>

     {upcomingEvents.length === 0 ? (
      <div className={`flex flex-col items-center justify-center p-12 rounded-3xl border-2 border-dashed ${
       isDarkMode ? 'border-white/5 bg-white/2 text-white/40' : 'border-navy-200 bg-navy-50 text-navy-400'
      }`}>
       <Calendar size={48} className="stroke-[1.5] mb-4 opacity-50" />
       <p className="font-bold text-center">No upcoming events scheduled</p>
       <p className="text-xs text-center mt-1 max-w-xs opacity-80">Be the first to schedule and ignite engagement within the server!</p>
       {canCreateEvents && (
        <button
         onClick={openCreateModal}
         className="mt-4 text-xs font-bold uppercase tracking-wider text-vylant-blue hover:underline"
        >
         Schedule one now +
        </button>
       )}
      </div>
     ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {upcomingEvents.map((ev: any) => {
        const userInterested = ev.interested?.includes(userName);
        const isVoice = voiceChannels.some((vc: any) => vc.id === ev.location || vc.name === ev.location);
        const eventDate = formatEventDate(ev.startTime);
        const eventTime = formatEventTime(ev.startTime);
        const hasEnded = ev.endTime && new Date(ev.endTime).getTime() < now.getTime();
        
        return (
         <motion.div
          key={ev.id}
          layoutId={`event-${ev.id}`}
          className={`rounded-2xl border flex flex-col justify-between transition-all relative overflow-hidden ${
           isDarkMode 
            ? 'bg-white/5 border-white/10 hover:border-white/20' 
            : 'bg-white border-navy-200 shadow-sm hover:shadow-md'
          }`}
         >
          {ev.bannerUrl && (
           <div className="w-full h-32 md:h-40 bg-black overflow-hidden relative">
            <img 
             src={ev.bannerUrl} 
             alt={ev.name} 
             className="w-full h-full object-cover opacity-80"
             onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
             }}
            />
           </div>
          )}
          <div className="p-5 flex flex-col justify-between flex-1">
           <div>
            {/* Event Banner Info */}
            <div className="flex items-start justify-between gap-4 mb-3">
             <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-vylant-blue mb-0.5">
               {eventDate} @ {eventTime}
              </span>
              <h3 className="font-black text-lg tracking-tight uppercase line-clamp-2">
               {ev.name}
              </h3>
             </div>

            {/* Event action icons (creator or owner can edit/delete) */}
            {(ev.creator === userName || canCreateEvents) && (
             <div className="flex items-center gap-1.5 shrink-0">
              {deletingEventId === ev.id ? (
               <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-red-500 mr-2 uppercase tracking-wide">Confirm?</span>
                <button
                 onClick={() => handleDeleteEvent(ev.id)}
                 className="px-2 py-1 bg-red-500 text-white rounded-md text-[10px] font-bold hover:bg-red-600 transition-colors"
                >
                 Delete
                </button>
                <button
                 onClick={() => setDeletingEventId(null)}
                 className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-navy-200 text-navy-700 hover:bg-navy-300'}`}
                >
                 Cancel
                </button>
               </div>
              ) : (
               <>
                <button
                 onClick={() => openEditModal(ev)}
                 className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-navy-100 text-navy-400 hover:text-navy-900'}`}
                 title="Edit Event"
                >
                 <Edit size={14} />
                </button>
                <button
                 onClick={() => setDeletingEventId(ev.id)}
                 className={`p-1.5 rounded-lg transition-colors hover:text-red-500 ${isDarkMode ? 'hover:bg-red-500/10 text-white/40' : 'hover:bg-red-50 text-navy-400'}`}
                 title="Delete Event"
                >
                 <Trash2 size={14} />
                </button>
               </>
              )}
             </div>
            )}
           </div>

           {/* Description */}
           <p className={`text-xs my-3 line-clamp-3 whitespace-pre-wrap leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-navy-600'}`}>
            {ev.description || 'No description provided.'}
           </p>
          </div>

          {/* Footer Row */}
          <div className="mt-4 pt-4 border-t border-current border-opacity-5 flex flex-col gap-3">
           
           {/* Location Display */}
           <div className="flex items-center gap-2 text-xs">
            {isVoice ? (
             <>
              <Volume2 size={14} className="text-vylant-blue" />
              <span className="font-semibold text-vylant-blue max-w-[200px] truncate">
               Voice Channel: {getVoiceChannelName(ev.location)}
              </span>
             </>
            ) : (
             <>
              <MapPin size={14} className="opacity-60" />
              <span className={`font-mono max-w-[200px] truncate ${isDarkMode ? 'text-white/60' : 'text-navy-500'}`}>
               {ev.location?.startsWith('http') ? (
                <a href={ev.location} target="_blank" rel="noopener noreferrer" className="text-vylant-blue hover:underline flex items-center gap-1">
                 <Link size={10} /> Link Location
                </a>
               ) : ev.location || 'Offline Gathering'}
              </span>
             </>
            )}
           </div>

           {/* Attendee indicators */}
           <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
             <Users size={14} className="opacity-40" />
             <span className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-white/40' : 'text-navy-400'}`}>
              {ev.interested?.length || 0} interested
             </span>
            </div>

            {/* Toggle Interested Button */}
            <button
             onClick={() => handleToggleInterested(ev.id)}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
              userInterested 
               ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
               : isDarkMode 
               ? 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white' 
               : 'bg-navy-100 border border-navy-200 text-navy-700 hover:bg-navy-200 hover:text-navy-900'
             }`}
            >
             {userInterested ? (
              <>
               <Check size={14} />
               Going
              </>
             ) : (
              'Interested'
             )}
            </button>
           </div>
          </div>
          </div>
         </motion.div>
        );
       })}
      </div>
     )}
    </div>

    {/* Past Events */}
    {pastEvents.length > 0 && (
     <div className="space-y-4 opacity-75">
      <div className="flex items-center justify-between border-b pb-2 border-current border-opacity-10">
       <h3 className="font-bold text-xs uppercase tracking-widest opacity-60">
        Completed & Past Events ({pastEvents.length})
       </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {pastEvents.map((ev: any) => (
        <div
         key={ev.id}
         className={`rounded-2xl border p-4 flex flex-col justify-between ${
          isDarkMode ? 'bg-black/10 border-white/5 text-white/50' : 'bg-navy-50 border-navy-200 text-navy-500'
         }`}
        >
         <div className="flex flex-col">
          <span className="text-[9px] font-mono uppercase tracking-wider line-through mb-1">
           {formatEventDate(ev.startTime)} @ {formatEventTime(ev.startTime)}
          </span>
          <h4 className="font-extrabold text-sm uppercase max-w-xs truncate line-through">
           {ev.name}
          </h4>
          <p className="text-xs mt-1.5 opacity-80 line-clamp-2">
           {ev.description || 'No description provided.'}
          </p>
         </div>
         <div className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-2">
           <Users size={12} />
           {ev.interested?.length || 0} participants
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-current bg-opacity-10 text-navy-500 rounded-lg">
           Ended
          </span>
         </div>
        </div>
       ))}
      </div>
     </div>
    )}
   </div>

   {/* CREATE / EDIT EVENT MODAL */}
   <AnimatePresence>
    {isCreateModalOpen && (
     <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      
      {/* Backdrop */}
      <motion.div
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       onClick={() => setIsCreateModalOpen(false)}
       className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Box */}
      <motion.div
       initial={{ opacity: 0, scale: 0.95, y: 15 }}
       animate={{ opacity: 1, scale: 1, y: 0 }}
       exit={{ opacity: 0, scale: 0.95, y: 15 }}
       className={`w-full max-w-lg rounded-3xl border shadow-2xl relative z-10 overflow-hidden ${
        isDarkMode ? 'bg-vylant-navy border-white/10 text-white' : 'bg-white border-navy-200 text-navy-900'
       }`}
      >
       <div className="p-6 border-b border-current border-opacity-10 flex items-center justify-between">
        <div>
         <h2 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
          <Calendar size={18} className="text-vylant-blue" />
          {editingEvent ? 'Edit Server Event' : 'Schedule Server Event'}
         </h2>
         <p className={`text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? 'text-white/40' : 'text-navy-400'}`}>
          {server?.name}
         </p>
        </div>
        <button
         onClick={() => setIsCreateModalOpen(false)}
         className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/10 text-white/60 hover:text-white' : 'hover:bg-navy-100 text-navy-500'}`}
        >
         <X size={18} />
        </button>
       </div>

       <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
        {formError && (
         <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
          <Info size={14} className="flex-shrink-0" />
          <span>{formError}</span>
         </div>
        )}

        {/* Event Name */}
        <div className="space-y-1">
         <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Event Name *</label>
         <input
          type="text"
          required
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          placeholder="E.g., Chess Tournament, Study Sync, Gaming Match"
          className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 transition-colors ${
           isDarkMode ? 'bg-black/20 border-white/10' : 'bg-navy-50 border-navy-200'
          }`}
         />
        </div>

        {/* Location Picker */}
        <div className="space-y-2">
         <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Event LocationType *</label>
         <div className="grid grid-cols-2 gap-2">
          <button
           type="button"
           onClick={() => setLocationType('voice')}
           className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${
            locationType === 'voice'
             ? 'bg-vylant-blue/10 border-vylant-blue text-vylant-blue'
             : isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-navy-200 hover:bg-navy-50'
           }`}
          >
           <Volume2 size={16} />
           Voice Channel
          </button>
          <button
           type="button"
           onClick={() => setLocationType('external')}
           className={`p-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all ${
            locationType === 'external'
             ? 'bg-vylant-blue/10 border-vylant-blue text-vylant-blue'
             : isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-navy-200 hover:bg-navy-50'
           }`}
          >
           <Link size={16} />
           External Location / Link
          </button>
         </div>
        </div>

        {/* Dropdowns based on Location Choice */}
        {locationType === 'voice' ? (
         <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Voice Channel Selection *</label>
          {voiceChannels.length === 0 ? (
           <p className="text-xs text-red-400 py-1 font-semibold">There are no Voice Channels in this server. Please create one, or select External Location.</p>
          ) : (
           <select
            value={selectedChannelId}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 bg-transparent transition-colors ${
             isDarkMode ? 'bg-vylant-navy border-white/10' : 'bg-white border-navy-200'
            }`}
           >
            {voiceChannels.map((vc: any) => (
             <option key={vc.id} value={vc.id} className={isDarkMode ? 'bg-vylant-navy text-white' : 'bg-white text-navy-900'}>
              🔊 {vc.name}
             </option>
            ))}
           </select>
          )}
         </div>
        ) : (
         <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">External Location Description or URL *</label>
          <input
           type="text"
           required
           value={externalLocation}
           onChange={(e) => setExternalLocation(e.target.value)}
           placeholder="E.g., https://zoom.us/j/..., Twitch, or IRL Main Hall"
           className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 transition-colors ${
            isDarkMode ? 'bg-black/20 border-white/10' : 'bg-navy-50 border-navy-200'
           }`}
          />
         </div>
        )}

        {/* Dates Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
           <Clock size={12} /> Start Date & Time *
          </label>
          <input
           type="datetime-local"
           required
           value={startTime}
           onChange={(e) => setStartTime(e.target.value)}
           className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 transition-colors ${
            isDarkMode ? 'bg-black/20 border-white/10 dark-color-scheme' : 'bg-navy-50 border-navy-200'
           }`}
          />
         </div>

         <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
           <Clock size={12} /> End Date & Time (Optional)
          </label>
          <input
           type="datetime-local"
           value={endTime}
           onChange={(e) => setEndTime(e.target.value)}
           className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 transition-colors ${
            isDarkMode ? 'bg-black/20 border-white/10 dark-color-scheme' : 'bg-navy-50 border-navy-200'
           }`}
          />
         </div>
        </div>

        {/* Banner URL */}
        <div className="space-y-1">
         <label className="text-[10px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
          <Link size={12} /> Banner Image URL (Optional)
         </label>
         <input
          type="url"
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 transition-colors ${
           isDarkMode ? 'bg-black/20 border-white/10' : 'bg-navy-50 border-navy-200'
          }`}
         />
        </div>

        {/* Event Description */}
        <div className="space-y-1">
         <label className="text-[10px] font-bold uppercase tracking-wider opacity-60">Event Details / Description</label>
         <textarea
          rows={3}
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          placeholder="Specify rules, links, or what people should prepare..."
          className={`w-full text-sm p-3 rounded-xl border focus:outline-none focus:border-vylant-blue/40 transition-colors resize-none ${
           isDarkMode ? 'bg-black/20 border-white/10' : 'bg-navy-50 border-navy-200'
          }`}
         />
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-current border-opacity-10">
         <button
          type="button"
          onClick={() => setIsCreateModalOpen(false)}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
           isDarkMode ? 'hover:bg-white/5 text-white/70 hover:text-white' : 'hover:bg-navy-100 text-navy-500'
          }`}
         >
          Cancel
         </button>
         <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 bg-vylant-blue text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
         >
          {isSubmitting ? 'Saving...' : editingEvent ? 'Save Changes' : 'Publish Event'}
         </button>
        </div>
       </form>
      </motion.div>
     </div>
    )}
   </AnimatePresence>
  </div>
 );
}
