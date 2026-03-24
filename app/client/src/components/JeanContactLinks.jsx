import React from 'react';

const JeanContactLinks = () => {
  const handleChatClick = () => {
    // Dispatch custom event to open ChatWidget
    window.dispatchEvent(new CustomEvent('open-jean-chat'));
  };

  const handleWhatsAppClick = () => {
    const phoneNumber = '67583460582';
    const message = encodeURIComponent('Hi Jean! I need help with job searching.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2">
      {/* Desktop: Horizontal Split Rectangle */}
      <div className="hidden sm:flex rounded-lg shadow-xl overflow-hidden border border-gray-200">
        {/* Chat Button */}
        <button
          onClick={handleChatClick}
          className="group flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all flex-1"
          aria-label="Chat with Jean on website"
        >
          <span className="text-base">💬</span>
          <span className="text-sm font-semibold">Chat</span>
        </button>

        {/* WhatsApp Button */}
        <button
          onClick={handleWhatsAppClick}
          className="group flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all flex-1"
          aria-label="Chat with Jean on WhatsApp"
        >
          <span className="text-base">📱</span>
          <span className="text-sm font-semibold">WhatsApp</span>
        </button>
      </div>

      {/* Mobile: Vertical Stacked Buttons */}
      <div className="flex sm:hidden flex-col gap-2">
        {/* Chat Button */}
        <button
          onClick={handleChatClick}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg transition-all active:scale-95"
          aria-label="Chat with Jean"
        >
          <span className="text-base">💬</span>
          <span className="text-sm font-semibold">Chat</span>
        </button>

        {/* WhatsApp Button */}
        <button
          onClick={handleWhatsAppClick}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-lg transition-all active:scale-95"
          aria-label="WhatsApp Jean"
        >
          <span className="text-base">📱</span>
          <span className="text-sm font-semibold">WhatsApp</span>
        </button>
      </div>
    </div>
  );
};

export default JeanContactLinks;
