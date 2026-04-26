import React, { useState, useEffect, useRef } from 'react';
import { createChatSession, ChatSession } from '../services/geminiService';
import { ChatMessage, LoadingState } from '../types';
import { Send, User, Bot, Loader2, Trash2, X, Sparkles } from 'lucide-react';
import RichText from './RichText';

interface GuideViewProps {
  userId: string;
  onClose: () => void;
}

const WELCOME_MESSAGE = 'नमस्ते! 🙏 म तपाईंको **KhetiSmart सहयोगी** हुँ। तपाईंको खेतीसम्बन्धी कुनै प्रश्न सोध्नुहोस् — म चरणबद्ध समाधान दिनेछु।';

const QUICK_PROMPTS = [
  'गोलभेँडामा पात पहेँलो भयो, के गर्ने?',
  'धान रोप्नका लागि उत्तम समय कहिले?',
  'आलुमा झुसिल्कीरो लाग्यो, उपचार सुझाउनुहोस्।',
  'मनसुनमा के बाली लगाउँदा राम्रो?',
];

const GuideView: React.FC<GuideViewProps> = ({ userId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  // Load history when userId changes
  useEffect(() => {
    if (!userId) return;
    try {
      const storageKey = `khetismart_chat_history_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        })));
      } else {
        setMessages([{
          id: '1',
          role: 'model',
          text: WELCOME_MESSAGE,
          timestamp: new Date(),
        }]);
      }
      setHasLoaded(true);
    } catch (e) {
      console.error("Failed to load chat history:", e);
      setMessages([]);
    }
  }, [userId]);

  // Save history on change
  useEffect(() => {
    if (hasLoaded && userId && messages.length > 0) {
      try {
        const storageKey = `khetismart_chat_history_${userId}`;
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch (e) {
        console.error("Failed to save chat history", e);
      }
    }
  }, [messages, userId, hasLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(LoadingState.LOADING);

    try {
      const result = await chatSessionRef.current.sendMessage({ message: text });
      const responseText = result.text || 'माफ गर्नुहोस्, मैले बुझिनँ। कृपया फेरि सोध्नुहोस्।';

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMsg]);
      setStatus(LoadingState.SUCCESS);
    } catch (error) {
      console.error("Chat error:", error);
      setStatus(LoadingState.ERROR);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: 'अहिले जडान गर्न समस्या भयो। केहीबेर पछि फेरि प्रयास गर्नुहोस्।',
        timestamp: new Date(),
      }]);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleClearHistory = () => {
    if (window.confirm("के तपाईं साँच्चिकै कुराकानी मेटाउन चाहनुहुन्छ?")) {
      const defaultMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: WELCOME_MESSAGE,
        timestamp: new Date(),
      };
      setMessages([defaultMsg]);
      if (userId) {
        localStorage.removeItem(`khetismart_chat_history_${userId}`);
      }
      chatSessionRef.current = createChatSession();
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const showQuickPrompts = messages.length <= 1 && status !== LoadingState.LOADING;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-50/40 via-gray-50 to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 p-4 shadow-md z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full ring-2 ring-white/30">
            <Bot className="text-white" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">KhetiSmart सहयोगी</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
              <p className="text-xs text-emerald-50">अनलाइन • नेपालीमा जवाफ</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleClearHistory}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition"
            title="कुराकानी मेटाउनुहोस्"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition"
            title="बन्द"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2 items-end ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              {!isUser && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              <div className={`max-w-[82%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                  isUser
                    ? 'bg-gradient-to-br from-primary to-emerald-700 text-white rounded-br-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm'
                }`}>
                  {isUser ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  ) : (
                    <RichText text={msg.text} />
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-2">
                  {formatTime(new Date(msg.timestamp))}
                </span>
              </div>
              {isUser && (
                <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          );
        })}

        {status === LoadingState.LOADING && (
          <div className="flex gap-2 items-end justify-start">
            <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
            </div>
          </div>
        )}

        {showQuickPrompts && (
          <div className="pt-2 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400 px-1">
              <Sparkles size={12} className="text-emerald-500" />
              <span className="font-semibold uppercase tracking-wide">सोध्न सकिने प्रश्नहरू</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-xs bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="नेपालीमा प्रश्न लेख्नुहोस्..."
            className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 dark:text-white rounded-full px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-sm transition-colors duration-300"
            disabled={status === LoadingState.LOADING}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status === LoadingState.LOADING}
            className="bg-gradient-to-br from-primary to-emerald-700 text-white p-3 rounded-full shadow-md shadow-emerald-200 dark:shadow-none hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-transform"
            aria-label="पठाउनुहोस्"
          >
            {status === LoadingState.LOADING ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideView;
