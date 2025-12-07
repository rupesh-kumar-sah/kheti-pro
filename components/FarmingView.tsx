
import React, { useState } from 'react';
import { Search, Loader2, Sprout, CloudSun, Droplets, Calendar, BookOpen, ChevronRight } from 'lucide-react';
import { getFarmingGuide } from '../services/geminiService';

const FarmingView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<string | null>(null);
  const [searchedCrop, setSearchedCrop] = useState('');

  const handleSearch = async (term?: string) => {
    const searchTerm = term || query;
    if (!searchTerm.trim()) return;
    
    // Update input if searched via suggestion
    if (term) setQuery(term);

    setLoading(true);
    setGuide(null);
    setSearchedCrop(searchTerm);
    
    const result = await getFarmingGuide(searchTerm);
    setGuide(result);
    setLoading(false);
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
      <div className="mb-6 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter crop name (e.g. Tomato, Rice)..."
          className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-base focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white shadow-sm transition-all"
        />
        <Search className="absolute left-4 top-4.5 text-gray-400" size={20} />
        <button 
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-2 bg-primary text-white p-2 rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
        </button>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-primary/10 dark:bg-emerald-900/30 p-4 border-b border-primary/10 dark:border-emerald-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Sprout size={20} className="text-primary dark:text-emerald-400" />
                    <h3 className="font-bold text-lg text-primary dark:text-emerald-400 capitalize">{searchedCrop} Farming</h3>
                </div>
                <div className="flex gap-2">
                     <span className="bg-white dark:bg-gray-800 p-1.5 rounded-full text-blue-500" title="Weather Info"><CloudSun size={16} /></span>
                     <span className="bg-white dark:bg-gray-800 p-1.5 rounded-full text-blue-400" title="Irrigation"><Droplets size={16} /></span>
                     <span className="bg-white dark:bg-gray-800 p-1.5 rounded-full text-orange-500" title="Season"><Calendar size={16} /></span>
                </div>
            </div>
            
            <div className="p-6">
                <div className="prose prose-emerald dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap leading-loose text-gray-700 dark:text-gray-200 font-medium">
                        {guide}
                    </div>
                </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-400">Generated by KhetiSmart AI • Consult local experts for commercial farming</p>
            </div>
        </div>
      )}
    </div>
  );
};

export default FarmingView;
