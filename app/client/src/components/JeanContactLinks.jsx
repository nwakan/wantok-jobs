import React from 'react';
import { MessageCircle, MessageSquare } from 'lucide-react';

/**
 * JeanContactLinks - Split rectangle component for Jean AI contact options
 * 
 * Provides two ways to contact Jean AI:
 * 1. Web Chat - Opens the ChatWidget
 * 2. WhatsApp - Opens WhatsApp chat
 * 
 * Responsive design:
 * - Desktop: Horizontal split rectangle
 * - Mobile: Vertical stacked buttons
 */
export default function JeanContactLinks() {
  const handleChatClick = () => {
    // Trigger ChatWidget to open
    // The ChatWidget is controlled by its own state
    // We'll dispatch a custom event that ChatWidget can listen to
    window.dispatchEvent(new CustomEvent('open-jean-chat'));
  };

  const handleWhatsAppClick = () => {
    // Open WhatsApp chat with Jean
    // Replace with actual WhatsApp number
    const phoneNumber = '6756949494'; // PNG country code + number
    const message = encodeURIComponent('Hi Jean! I need help with job searching.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-24 right-4 z-40 sm:bottom-20">
      {/* Desktop: Horizontal split rectangle */}
      <div className="hidden sm:flex items-stretch shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-900 transition-transform hover:scale-105">
        {/* Left: Web Chat */}
        <button
          onClick={handleChatClick}
          className="group flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all flex-1"
          aria-label="Chat with Jean on website"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <MessageCircle size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">Chat with Jean</div>
            <div className="text-xs text-blue-100">Web Chat</div>
          </div>
        </button>

        {/* Divider */}
        <div className="w-0.5 bg-gradient-to-b from-blue-400 to-green-400"></div>

        {/* Right: WhatsApp */}
        <button
          onClick={handleWhatsAppClick}
          className="group flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transition-all flex-1"
          aria-label="Chat with Jean on WhatsApp"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
            <MessageSquare size={20} />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">WhatsApp Jean</div>
            <div className="text-xs text-green-100">Quick Reply</div>
          </div>
        </button>
      </div>

      {/* Mobile: Vertical stacked buttons */}
      <div className="flex sm:hidden flex-col gap-2">
        {/* Web Chat Button */}
        <button
          onClick={handleChatClick}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg transition-all active:scale-95"
          aria-label="Chat with Jean"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-semibold">Chat with Jean</span>
        </button>

        {/* WhatsApp Button */}
        <button
          onClick={handleWhatsAppClick}
          className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-lg transition-all active:scale-95"
          aria-label="WhatsApp Jean"
        >
          <MessageSquare size={20} />
          <span className="text-sm font-semibold">WhatsApp Jean</span>
        </button>
      </div>
    </div>
  );
}
