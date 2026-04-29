import React, { useState } from 'react';
import { Search, Loader2, Sprout, CloudSun, Droplets, Calendar, BookOpen, ChevronRight, Mic, X, Download, Share2, Sparkles, MessageSquare } from 'lucide-react';
import { getFarmingGuide } from '../services/aiService';
import RichText from './RichText';

const FarmingView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const [searchedCrop, setSearchedCrop] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSearch = async (term?: string) => {
    const searchTerm = term || query;
    if (!searchTerm.trim()) return;
    
    if (term) setQuery(term);

    setLoading(true);
    setGuide(null);
    setSearchedCrop(searchTerm);
    
    try {
      const result = await getFarmingGuide(searchTerm);
      setGuide(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ne-NP'; // Nepali
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuery(text);
      handleSearch(text);
    };

    recognition.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const commonCrops = ['Rice (धान)', 'Maize (मकै)', 'Wheat (गहुँ)', 'Potato (आलु)', 'Tomato (गोलभेडा)'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-6 px-4 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="bg-emerald-100 dark:bg-emerald-900 p-2.5 rounded-full">
            <BookOpen size={24} className="text-primary dark:text-emerald-400" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-secondary dark:text-emerald-400">Farming Guide</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Step-by-step instructions in Nepali</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-8 relative px-2">
        <div className="relative group">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter crop name (Tomato, Rice)..."
              className="w-full pl-12 pr-24 py-5 rounded-[2rem] bg-white dark:bg-gray-800 border-2 border-transparent shadow-xl shadow-blue-500/5 focus:border-blue-500 transition-all outline-none text-[15px] font-medium dark:text-white"
            />
            <Search className="absolute left-4 top-5 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={22} />
            
            <div className="absolute right-3 top-2.5 flex items-center gap-1">
                <button 
                  onClick={startVoiceSearch}
                  className={`p-2.5 rounded-full transition ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-blue-500'}`}
                  title="Voice Search (Nepali)"
                >
                  <Mic size={20} />
                </button>
                <button 
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    className="bg-blue-600 text-white p-2.5 rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/20"
                >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                </button>
            </div>
        </div>
      </div>

      {/* Quick Suggestions */}
      {!guide && !loading && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">Popular Crops</h3>
            <div className="flex flex-wrap gap-2">
                {commonCrops.map((crop) => (
                    <button
                        key={crop}
                        onClick={() => handleSearch(crop.split(' ')[0])}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:border-primary hover:text-primary dark:hover:border-emerald-500 dark:hover:text-emerald-400 transition"
                    >
                        {crop}
                    </button>
                ))}
            </div>
            
            <div className="mt-8 bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 text-center">
                <div className="bg-white dark:bg-emerald-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Sprout size={32} className="text-emerald-600 dark:text-emerald-300" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">Start Farming Today</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-xs mx-auto">
                    Search for any crop to get a detailed guide about seasons, soil preparation, and harvesting techniques suitable for Nepal's climate.
                </p>
            </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <Loader2 size={48} className="text-primary animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Generating guide in Nepali...</p>
            <p className="text-xs text-gray-400 mt-2">Connecting to agricultural database</p>
        </div>
      )}

      {/* Result Card */}
      {guide && (
        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl shadow-blue-500/5 border border-gray-100 dark:border-gray-700/50 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Sprout size={24} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-black text-xl text-white capitalize leading-tight">{searchedCrop}</h3>
                        <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Full Farming Guide</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <button className="bg-white/20 p-2 rounded-xl text-white hover:bg-white/30 transition"><Share2 size={18} /></button>
                     <button className="bg-white text-blue-600 p-2 rounded-xl hover:bg-blue-50 transition shadow-lg"><Download size={18} /></button>
                </div>
            </div>
            
            <div className="p-8">
                <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl shrink-0">
                        <Droplets size={16} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Water Aware</span>
                    </div>
                    <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-2xl shrink-0">
                        <Calendar size={16} className="text-orange-500" />
                        <span className="text-xs font-bold text-orange-700 dark:text-orange-300">Seasonal</span>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-2xl shrink-0">
                        <Sparkles size={16} className="text-purple-500" />
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300">AI Verified</span>
                    </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                    <RichText text={guide} className="text-gray-700 dark:text-gray-200 leading-relaxed text-[15px]" />
                </div>
                
                <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-700/50 flex flex-col items-center">
                    <div className="flex items-center gap-2 text-gray-400 mb-4">
                        <MessageSquare size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Ask for more details</span>
                    </div>
                    <button className="text-blue-500 font-black text-xs uppercase tracking-widest hover:text-blue-600 transition">
                        Open Expert Chat
                    </button>
                </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">© KhetiSmart 2026 • Premium Agricultural Data</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default FarmingView;
