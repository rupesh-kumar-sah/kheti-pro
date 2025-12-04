
import React, { useState, useEffect, useRef } from 'react';
import { createChatSession } from '../services/geminiService';
import { ChatMessage, LoadingState } from '../types';
import { Send, User, Bot, Loader2, Trash2, X } from 'lucide-react';
import { Chat, GenerateContentResponse } from "@google/genai";

interface GuideViewProps {
  userId: string;
  onClose: () => void;
}

const GuideView: React.FC<GuideViewProps> = ({ userId, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [input, setInput] = useState('');
  const [status, setStatus] = useState<LoadingState>(LoadingState.IDLE);
  const chatSessionRef = useRef<Chat | null>(null);
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
          timestamp: new Date(m.timestamp)
        })));
      } else {
        // Default message for new user or empty history
        setMessages([{
          id: '1',
          role: 'model',
          text: 'Namaste! I am your KhetiSmart assistant. How can I help you with your farming today?',
          timestamp: new Date()
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
      const storageKey = `khetismart_chat_history_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, userId, hasLoaded]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const handleSend = async () => {
    if (!input.trim() || !chatSessionRef.current) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(LoadingState.LOADING);

    try {
      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const responseText = result.text || "I'm sorry, I didn't catch that. Could you please repeat?";
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMsg]);
      setStatus(LoadingState.SUCCESS);
    } catch (error) {
      console.error("Chat error:", error);
      setStatus(LoadingState.ERROR);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I'm having trouble connecting right now. Please try again later.",
        timestamp: new Date()
      }]);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      const defaultMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: 'Namaste! I am your KhetiSmart assistant. How can I help you with your farming today?',
        timestamp: new Date()
      };
      setMessages([defaultMsg]);
      if (userId) {
          localStorage.removeItem(`khetismart_chat_history_${userId}`);
      }
      // Reset the session to clear context
      chatSessionRef.current = createChatSession();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-4 shadow-sm z-10 flex justify-between items-center transition-colors duration-300">
        <div className="flex items-center gap-3">
             <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-full">
                 <Bot className="text-primary dark:text-emerald-400" size={24} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Farming Guide</h2>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                </div>
             </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={handleClearHistory}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition"
              title="Clear History"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
              title="Close"
            >
              <X size={24} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-white rounded-br-none' 
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-80">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                <span className="text-[10px] font-medium uppercase">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}
        {status === LoadingState.LOADING && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-none p-3 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 bg-gray-100 dark:bg-gray-700 border-0 dark:text-white rounded-full px-4 py-3 focus:ring-2 focus:ring-primary focus:outline-none text-sm transition-colors duration-300"
            disabled={status === LoadingState.LOADING}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status === LoadingState.LOADING}
            className="bg-secondary dark:bg-emerald-700 text-white p-3 rounded-full hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {status === LoadingState.LOADING ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideView;
