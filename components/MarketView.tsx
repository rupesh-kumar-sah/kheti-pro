
import React, { useState, useEffect } from 'react';
import { getMarketPrediction, getRealMarketPrices, getHistoricalPrices } from '../services/geminiService';
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2, RefreshCw, ExternalLink, History, X, ArrowRightLeft, Search, AlertTriangle } from 'lucide-react';
import { MarketItem, HistoricalPrice } from '../types';

// --- Skeleton Components ---

const MarketItemSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="space-y-2 w-2/3">
        <div className="flex items-center gap-2">
           <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        </div>
        <div className="h-7 w-32 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
      <div className="space-y-2 w-1/4 flex flex-col items-end">
        <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
    </div>
    <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
      <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  </div>
);

const PredictionSkeleton = () => (
  <div className="mt-3 p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50 animate-pulse">
    <div className="flex items-center gap-2 mb-3">
       <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
       <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
    <div className="space-y-2">
       <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
       <div className="h-3 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  </div>
);

const HistorySkeleton = () => (
    <div className="mt-3 border-t border-gray-50 dark:border-gray-700 pt-3 animate-pulse">
        <div className="flex justify-between mb-4">
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="h-24 w-full bg-gray-100 dark:bg-gray-700/50 rounded-lg"></div>
    </div>
);

// --- Chart Component ---

const SparklineChart: React.FC<{ data: HistoricalPrice[]; currencySymbol: string }> = ({ data, currencySymbol }) => {
  if (data.length < 2) return <div className="text-xs text-gray-400 text-center py-4">Not enough data for chart</div>;

  const prices = data.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  
  // Create a viewbox of 100x40
  const width = 100;
  const height = 40;
  
  // Calculate range with padding
  const range = maxPrice - minPrice || 1;
  const paddingY = range * 0.2; // 20% padding top/bottom
  const effectiveMin = Math.max(0, minPrice - paddingY);
  const effectiveMax = maxPrice + paddingY;
  const effectiveRange = effectiveMax - effectiveMin;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    // Invert Y because SVG origin is top-left
    const y = height - ((d.price - effectiveMin) / effectiveRange) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `
    0,${height} 
    ${points} 
    ${width},${height}
  `;

  return (
    <div className="w-full mt-4">
       <div className="flex justify-between items-end mb-2 px-1">
          <div className="flex flex-col">
             <span className="text-[10px] text-gray-400 font-medium">{data[0].date}</span>
             <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{currencySymbol} {data[0].price}</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-gray-400 font-medium">{data[data.length - 1].date}</span>
             <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{currencySymbol} {data[data.length - 1].price}</span>
          </div>
       </div>
       
       <div className="h-16 w-full relative">
         {/* Min/Max Guidelines */}
         <div className="absolute top-0 left-0 w-full h-full border-t border-b border-dashed border-gray-100 dark:border-gray-700 pointer-events-none"></div>
         
         <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
            <defs>
               <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
               </linearGradient>
            </defs>
            <path d={`M${areaPoints}Z`} fill="url(#gradient)" />
            <polyline 
                points={points} 
                fill="none" 
                stroke="#10B981" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                vectorEffect="non-scaling-stroke" 
            />
            
            {/* Markers for start and end */}
            {data.length > 0 && (
                <>
                    <circle cx="0" cy={height - ((data[0].price - effectiveMin) / effectiveRange) * height} r="3" fill="#10B981" />
                    <circle cx={width} cy={height - ((data[data.length-1].price - effectiveMin) / effectiveRange) * height} r="3" fill="#10B981" />
                </>
            )}
         </svg>
       </div>
    </div>
  );
};

const MarketView: React.FC = () => {
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MarketItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sources, setSources] = useState<{title: string, uri: string}[]>([]);
  const [predictions, setPredictions] = useState<Record<string, string>>({});
  const [loadingPrediction, setLoadingPrediction] = useState<Record<string, boolean>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Currency State
  const [currency, setCurrency] = useState<'NPR' | 'USD'>('NPR');
  const [exchangeRate, setExchangeRate] = useState<number>(0.0075); // Fallback default
  
  // History State
  const [historyData, setHistoryData] = useState<Record<string, HistoricalPrice[]>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const fetchPrices = async (forceRefresh: boolean = false, isBackground: boolean = false) => {
    if (!isBackground) setLoadingData(true);
    setError(null);
    try {
        const { items, sources } = await getRealMarketPrices(forceRefresh);
        if (items.length > 0) {
            setMarketItems(items);
            // setFilteredItems(items); // Don't reset filters on background update
            setSources(sources);
        } else {
            // If explicit refresh and no items, show error only if not background
            if (!isBackground) setError("Could not retrieve market prices. Please check connection.");
        }
    } catch (e) {
        console.error("Error in component fetch:", e);
        if (!isBackground) setError("An unexpected error occurred.");
    } finally {
        if (!isBackground) setLoadingData(false);
    }
  };

  useEffect(() => {
    // Initial fetch uses cache if available (fast load)
    fetchPrices(false);
    
    // Fetch Exchange Rate
    const fetchExchangeRate = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/NPR');
        const data = await response.json();
        if (data.rates && data.rates.USD) {
          setExchangeRate(data.rates.USD);
        }
      } catch (error) {
        console.error("Failed to fetch exchange rate", error);
      }
    };
    
    fetchExchangeRate();

    // Auto-refresh every 15 minutes
    const intervalId = setInterval(() => {
      fetchPrices(true, true); // forceRefresh=true, isBackground=true
    }, 15 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Filter items based on search query and category
    let result = marketItems;

    // Category Filter
    if (selectedCategory !== 'All') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Search Filter
    if (searchQuery.trim() !== '') {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowerQuery) || 
        item.category.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredItems(result);
  }, [searchQuery, selectedCategory, marketItems]);

  const handlePredict = async (item: MarketItem) => {
    if (predictions[item.id]) return; // Already fetched
    
    setLoadingPrediction(prev => ({ ...prev, [item.id]: true }));
    const prediction = await getMarketPrediction(item.name);
    setPredictions(prev => ({ ...prev, [item.id]: prediction }));
    setLoadingPrediction(prev => ({ ...prev, [item.id]: false }));
  };

  const handleToggleHistory = async (item: MarketItem) => {
    if (expandedHistory === item.id) {
      setExpandedHistory(null);
      return;
    }

    setExpandedHistory(item.id);

    // Data check handled by service caching now, but we can check state too
    if (historyData[item.id]) return;

    setLoadingHistory(prev => ({ ...prev, [item.id]: true }));
    const history = await getHistoricalPrices(item.name);
    setHistoryData(prev => ({ ...prev, [item.id]: history }));
    setLoadingHistory(prev => ({ ...prev, [item.id]: false }));
  };

  const getPredictionSentiment = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes('rise') || lower.includes('increase') || lower.includes('up') || lower.includes('expensive') || lower.includes('climb') || lower.includes('hike')) return 'up';
    if (lower.includes('fall') || lower.includes('decrease') || lower.includes('down') || lower.includes('cheap') || lower.includes('drop') || lower.includes('slump')) return 'down';
    return 'neutral';
  };
  
  const toggleCurrency = () => {
    setCurrency(prev => prev === 'NPR' ? 'USD' : 'NPR');
  };
  
  const getDisplayPrice = (priceNpr: number) => {
    if (currency === 'USD') {
      return (priceNpr * exchangeRate).toFixed(2);
    }
    return priceNpr;
  };

  const categories = ['All', 'Vegetable', 'Fruit', 'Grain', 'Spice'];

  const currencySymbol = currency === 'NPR' ? 'Rs.' : '$';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-6 px-4 transition-colors duration-300">
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
            <h2 className="text-2xl font-bold text-secondary dark:text-emerald-400">Market Prices</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Live from Kalimati</p>
              {!loadingData && marketItems.length > 0 && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  {marketItems.length} items
                </span>
              )}
            </div>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={toggleCurrency}
              className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:border-primary transition text-xs font-semibold"
            >
              <ArrowRightLeft size={14} />
              {currency}
            </button>
            <button 
              onClick={() => fetchPrices(true, false)} 
              disabled={loadingData}
              className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition disabled:opacity-50"
            >
              <RefreshCw size={20} className={loadingData ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-3 px-2 relative">
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search food, veg, fruit (e.g., Rice, Apple)..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-gray-100 transition-colors"
        />
        <Search className="absolute left-5 top-3.5 text-gray-400" size={18} />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-5 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 px-2 overflow-x-auto no-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-primary text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      
      {loadingData ? (
        <div className="space-y-4 px-2">
           {[...Array(5)].map((_, i) => <MarketItemSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="mx-2 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6 text-center animate-in fade-in slide-in-from-bottom-2">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                <AlertTriangle size={24} />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Failed to load prices</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button 
                onClick={() => fetchPrices(true, false)}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-600 transition shadow-sm"
            >
                Try Again
            </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
           <p>No items found for "{searchQuery}" in {selectedCategory}</p>
           <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="text-primary text-sm mt-2 font-medium"
           >
             Clear filters
           </button>
        </div>
      ) : (
        <div className="space-y-4">
             {filteredItems.map((item) => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-sm font-semibold uppercase tracking-wide ${
                          item.category === 'Vegetable' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                          item.category === 'Fruit' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                          item.category === 'Grain' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                          item.category === 'Spice' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{item.name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Wholesale Rate</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-xl">
                        {currencySymbol} {getDisplayPrice(item.price)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">per {item.unit}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-700 pt-3">
                    <span className={`flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                        item.trend === 'up' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' :
                        item.trend === 'down' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}>
                        {item.trend === 'up' && <TrendingUp size={12} className="mr-1" />}
                        {item.trend === 'down' && <TrendingDown size={12} className="mr-1" />}
                        {item.trend === 'stable' && <Minus size={12} className="mr-1" />}
                        {item.trend === 'up' ? 'Rising' : item.trend === 'down' ? 'Falling' : 'Stable'}
                    </span>
                    
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleToggleHistory(item)}
                            className={`flex items-center text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                                expandedHistory === item.id 
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <History size={14} className="mr-1" />
                            {expandedHistory === item.id ? 'Close' : 'History'}
                        </button>
                        
                        <button 
                            onClick={() => handlePredict(item)}
                            disabled={loadingPrediction[item.id]}
                            className={`flex items-center text-xs font-medium px-3 py-1.5 rounded-lg transition ${
                                predictions[item.id] 
                                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                            }`}
                        >
                            {loadingPrediction[item.id] ? (
                                <Loader2 size={14} className="animate-spin mr-1" />
                            ) : (
                                <Sparkles size={14} className="mr-1" />
                            )}
                            Forecast
                        </button>
                    </div>
                  </div>

                  {/* History Section */}
                  {expandedHistory === item.id && (
                    <div className="mt-3 border-t border-gray-50 dark:border-gray-700 pt-3 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price Trend (7 Days)</h4>
                            <button onClick={() => setExpandedHistory(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X size={14} />
                            </button>
                        </div>
                        {loadingHistory[item.id] ? (
                            <HistorySkeleton />
                        ) : historyData[item.id] && historyData[item.id].length > 0 ? (
                            <SparklineChart 
                                data={historyData[item.id].map(h => ({
                                    ...h,
                                    price: currency === 'USD' ? Number((h.price * exchangeRate).toFixed(2)) : h.price
                                }))} 
                                currencySymbol={currencySymbol}
                            />
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                                <p className="text-xs text-gray-400 italic">Historical data unavailable for this item.</p>
                            </div>
                        )}
                    </div>
                  )}

                  {/* Prediction Section */}
                  {loadingPrediction[item.id] ? (
                      <PredictionSkeleton />
                  ) : predictions[item.id] && (
                    <div className="mt-3 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 border border-purple-100 dark:border-purple-800 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-100 dark:bg-purple-900 p-1 rounded text-purple-600 dark:text-purple-300">
                                <Sparkles size={14} />
                            </div>
                            <p className="font-semibold text-xs text-purple-800 dark:text-purple-300 uppercase tracking-wider">AI Forecast</p>
                        </div>
                        
                        {/* Sentiment Indicator (Pill) */}
                        {getPredictionSentiment(predictions[item.id]) === 'up' && (
                            <span className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                                <TrendingUp size={14} className="mr-1" /> Rising
                            </span>
                        )}
                        {getPredictionSentiment(predictions[item.id]) === 'down' && (
                            <span className="flex items-center text-xs font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-full border border-red-200 dark:border-red-800">
                                <TrendingDown size={14} className="mr-1" /> Falling
                            </span>
                        )}
                      </div>
                      
                      <div className="relative z-10 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                        {predictions[item.id]}
                      </div>
                      
                      {/* Decorative bg element */}
                      <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 dark:bg-purple-800/30 rounded-full blur-2xl -mr-8 -mt-8 opacity-50"></div>
                    </div>
                  )}
                </div>
              ))}
        </div>
      )}

      {/* Sources Section */}
      {sources.length > 0 && (
        <div className="mt-8 px-2 border-t border-gray-100 dark:border-gray-700 pt-6">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Live Data Sources</h4>
            <div className="flex flex-wrap gap-2">
                {sources.map((source, index) => (
                    <a 
                        key={index}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full text-[10px] text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:border-primary transition shadow-sm"
                    >
                        <ExternalLink size={10} />
                        <span className="truncate max-w-[200px]">{source.title}</span>
                    </a>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default MarketView;
