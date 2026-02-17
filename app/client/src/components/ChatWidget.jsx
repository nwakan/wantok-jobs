import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle, X, Send, Mic, MicOff, Paperclip, Volume2, VolumeX,
  ChevronDown, Bot, User, Loader2, Minimize2
} from 'lucide-react';

const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('jean_session') || '');
  const [settings, setSettings] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasGreeted, setHasGreeted] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const location = useLocation();

  // Load settings on mount
  useEffect(() => {
    fetch(`${API_URL}/chat/settings`)
      .then(r => r.json())
      .then(s => setSettings(s))
      .catch(() => {});
  }, []);

  // Load history when opened
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      loadHistory();
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Setup speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Auto-send voice input
        handleSend(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const loadHistory = async () => {
    try {
      const params = sessionToken ? `?sessionToken=${sessionToken}` : '';
      const res = await fetch(`${API_URL}/chat/history${params}`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      if (data.messages?.length) {
        setMessages(data.messages.map(m => ({
          role: m.role,
          content: m.content,
          quickReplies: m.metadata ? JSON.parse(m.metadata || '{}').quickReplies : null,
          time: m.created_at,
        })));
        setHasGreeted(true);
      } else {
        // Show greeting
        if (settings?.greeting) {
          setMessages([{ role: 'jean', content: settings.greeting, time: new Date().toISOString() }]);
        }
        setHasGreeted(true);
      }
      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        localStorage.setItem('jean_session', data.sessionToken);
      }
    } catch (e) {
      if (settings?.greeting) {
        setMessages([{ role: 'jean', content: settings.greeting, time: new Date().toISOString() }]);
      }
      setHasGreeted(true);
    }
  };

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    setInput('');
    const userMsg = { role: 'user', content: text, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const pageContext = {
        path: location.pathname,
        jobId: location.pathname.match(/\/jobs\/(\d+)/)?.[1] || null,
      };

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ message: text, sessionToken, pageContext }),
      });

      const data = await res.json();

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        localStorage.setItem('jean_session', data.sessionToken);
      }

      const jeanMsg = {
        role: 'jean',
        content: data.message || 'Sorry, something went wrong.',
        quickReplies: data.quickReplies,
        time: new Date().toISOString(),
      };
      setMessages(prev => [...prev, jeanMsg]);

      // Speak response if voice enabled
      if (voiceEnabled && 'speechSynthesis' in window) {
        speak(data.message);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'jean',
        content: 'Sorry, I couldn\'t connect. Please try again.',
        time: new Date().toISOString(),
      }]);
    }
    setLoading(false);
  }, [input, loading, sessionToken, location.pathname, voiceEnabled]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const userMsg = { role: 'user', content: `📎 Uploaded: ${file.name}`, time: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionToken', sessionToken);
      formData.append('pageContext', JSON.stringify({ path: location.pathname }));

      const res = await fetch(`${API_URL}/chat/upload`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      });

      const data = await res.json();

      if (data.sessionToken) {
        setSessionToken(data.sessionToken);
        localStorage.setItem('jean_session', data.sessionToken);
      }

      setMessages(prev => [...prev, {
        role: 'jean',
        content: data.message || 'Processed your document.',
        quickReplies: data.quickReplies,
        time: new Date().toISOString(),
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'jean',
        content: 'Failed to process the file. Please try again.',
        time: new Date().toISOString(),
      }]);
    }
    setLoading(false);
    e.target.value = '';
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#\[\]()]/g, '').replace(/https?:\/\/\S+/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleQuickReply = (text) => {
    setInput(text);
    handleSend(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render if Jean is disabled
  if (settings && !settings.enabled) return null;

  return (
    <>
      {/* Chat bubble */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-xl transition-all hover:scale-110 active:scale-95"
          aria-label="Chat with Jean"
        >
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white dark:bg-gray-900 shadow-2xl rounded-2xl flex flex-col transition-all duration-200 ${
            isMinimized
              ? 'bottom-4 right-4 w-72 h-14'
              : 'bottom-4 right-4 w-[380px] h-[560px] max-h-[80vh] sm:w-[380px] max-w-[calc(100vw-2rem)]'
          }`}
          style={isMinimized ? {} : { maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white rounded-t-2xl cursor-pointer"
               onClick={() => isMinimized && setIsMinimized(false)}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm">Jean</div>
                <div className="text-xs text-blue-100">WantokJobs Assistant</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {settings?.voiceEnabled && (
                <button
                  onClick={(e) => { e.stopPropagation(); setVoiceEnabled(!voiceEnabled); }}
                  className="p-1.5 hover:bg-blue-500 rounded-full transition-colors"
                  title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                className="p-1.5 hover:bg-blue-500 rounded-full transition-colors"
              >
                {isMinimized ? <ChevronDown size={16} /> : <Minimize2 size={16} />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="p-1.5 hover:bg-blue-500 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md'
                    } px-4 py-2.5 text-sm`}>
                      <MessageContent content={msg.content} />
                      <div className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick replies */}
                {messages.length > 0 && messages[messages.length - 1].quickReplies && !loading && (
                  <div className="flex flex-wrap gap-2">
                    {messages[messages.length - 1].quickReplies.map((qr, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickReply(qr)}
                        className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t dark:border-gray-700">
                <div className="flex items-end gap-2">
                  {/* File upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Upload document (PDF/Word)"
                  >
                    <Paperclip size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 resize-none border-0 bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-24 dark:text-white"
                    rows={1}
                    disabled={loading}
                  />

                  {/* Voice toggle */}
                  {settings?.voiceEnabled && recognitionRef.current && (
                    <button
                      onClick={toggleVoice}
                      className={`p-2 rounded-full transition-colors ${
                        isListening
                          ? 'bg-red-100 text-red-600 animate-pulse'
                          : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                      }`}
                      title={isListening ? 'Stop listening' : 'Voice input'}
                    >
                      {isListening ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                  )}

                  {/* Send */}
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>

                <div className="text-center mt-1">
                  <span className="text-[10px] text-gray-400">
                    Powered by WantokJobs AI
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Render message content with basic markdown support
 */
function MessageContent({ content }) {
  if (!content) return null;

  // Simple markdown rendering
  const html = content
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="underline text-blue-400 hover:text-blue-300" target="_blank" rel="noopener">$1</a>')
    // Bullet lists
    .replace(/^[•\-]\s+(.+)$/gm, '<li class="ml-3">$1</li>')
    // Numbered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-3 list-decimal">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
