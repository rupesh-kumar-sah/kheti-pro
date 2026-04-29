import React, { useState, useRef, useEffect } from 'react';
import { analyzeCropHealth } from '../services/aiService';
import { DiagnosisRecord } from '../types';
import { Upload, Camera, X, Loader2, AlertCircle, CheckCircle2, History, Calendar, ChevronRight, Trash2, ArrowLeft, Edit3, Save, Download, Stethoscope, Sparkles, Share2, MessageSquare } from 'lucide-react';
import RichText from './RichText';

interface DoctorViewProps {
  userId: string;
}

const DoctorView: React.FC<DoctorViewProps> = ({ userId }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<DiagnosisRecord[]>([]);
  
  // Editing & Saving State
  const [currentDiagnosisId, setCurrentDiagnosisId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount or when userId changes
  useEffect(() => {
    if (!userId) return;
    try {
      const storageKey = `khetismart_doctor_history_${userId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
      setHistory([]);
    }
  }, [userId]);

  const saveToLocalStorage = (newHistory: DiagnosisRecord[]) => {
    if (!userId) return;
    try {
       const storageKey = `khetismart_doctor_history_${userId}`;
       localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (e) {
       console.error("Failed to save history - quota may be exceeded", e);
       alert("Storage full. Please delete some old diagnoses.");
    }
  };

  const saveDiagnosis = (imageUrl: string, analysisText: string, customId?: string) => {
    try {
      const id = customId || Date.now().toString();
      const newRecord: DiagnosisRecord = {
        id,
        imageUrl,
        analysis: analysisText,
        timestamp: Date.now()
      };

      // Keep only last 5 items per user
      const updatedHistory = [newRecord, ...history].slice(0, 5);
      setHistory(updatedHistory);
      saveToLocalStorage(updatedHistory);
      return id;
    } catch (e) {
      console.error("Failed to save diagnosis", e);
      return null;
    }
  };

  const updateDiagnosis = (id: string, newText: string) => {
    try {
      const updatedHistory = history.map(item => 
        item.id === id ? { ...item, analysis: newText } : item
      );
      setHistory(updatedHistory);
      saveToLocalStorage(updatedHistory);
    } catch (e) {
      console.error("Failed to update history", e);
    }
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    saveToLocalStorage(updatedHistory);
    
    // If deleting the currently viewed item, clear view
    if (currentDiagnosisId === id) {
      clearImage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setSelectedImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setAnalysis(null);
      setCurrentDiagnosisId(null);
      setIsEditing(false);
      setIsSaved(false);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !selectedImage) return;
    setLoading(true);
    const result = await analyzeCropHealth(imageFile);
    setAnalysis(result);
    
    // Do not auto-save. Wait for user action.
    setCurrentDiagnosisId(null);
    setIsSaved(false);
    
    setLoading(false);
  };

  const handleManualSave = () => {
    if (!selectedImage || !analysis) return;
    const newId = saveDiagnosis(selectedImage, analysis);
    if (newId) {
      setCurrentDiagnosisId(newId);
      setIsSaved(true);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setAnalysis(null);
    setCurrentDiagnosisId(null);
    setIsEditing(false);
    setIsSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadHistoryItem = (item: DiagnosisRecord) => {
    setSelectedImage(item.imageUrl);
    setAnalysis(item.analysis);
    setCurrentDiagnosisId(item.id);
    setImageFile(null); // No file object available for historical items
    setIsEditing(false);
    setIsSaved(true);
    // Scroll to top to see the loaded image
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEdit = () => {
    setEditedAnalysis(analysis || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editedAnalysis.trim()) {
      setAnalysis(editedAnalysis);
      
      // If it was already saved, update the record
      if (currentDiagnosisId && isSaved) {
        updateDiagnosis(currentDiagnosisId, editedAnalysis);
      }
      // If it wasn't saved yet, we just updated the current view state
      // The user still needs to click "Save Analysis" to persist it as a new record
      
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAnalysis('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-6 px-4 transition-colors duration-300">
      <div className="flex items-center gap-3 mb-2 px-2">
        <div className="bg-emerald-100 dark:bg-emerald-900 p-2.5 rounded-full">
          <Stethoscope size={22} className="text-primary dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-secondary dark:text-emerald-400">Crop Doctor</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">नेपाली भाषामा चरणबद्ध रोग पहिचान</p>
        </div>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 px-2">तपाईंको बालीको तस्बिर खिच्नुहोस् वा अपलोड गर्नुहोस्।</p>

      {!selectedImage ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-blue-200 dark:border-gray-700 rounded-[2.5rem] p-12 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition h-80 shadow-2xl shadow-blue-500/5 group"
        >
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-[2rem] mb-6 shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
            <Camera className="text-white" size={40} />
          </div>
          <h3 className="font-black text-xl text-gray-900 dark:text-white mb-2">Capture Crop Health</h3>
          <p className="text-sm text-gray-400 font-medium">Tap to snap a photo or upload from gallery</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl group ring-4 ring-white dark:ring-gray-800">
            <img src={selectedImage} alt="Crop" className="w-full h-80 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {loading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                 <div className="relative w-48 h-1 bg-white/20 rounded-full overflow-hidden mb-4">
                    <div className="absolute inset-0 bg-blue-500 w-full animate-scan-line" />
                 </div>
                 <p className="text-white font-black text-sm uppercase tracking-widest animate-pulse">Analyzing Tissue...</p>
              </div>
            )}

            <button 
              onClick={clearImage}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2.5 rounded-2xl backdrop-blur-md border border-white/30 transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center group disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin" size={24} />
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                  <span>Start AI Diagnosis</span>
                </div>
              )}
            </button>
          )}

          {analysis && (
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700/50 animate-in slide-in-from-bottom-10 duration-500 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Stethoscope size={22} />
                  </div>
                  <div>
                    <h3 className="font-black text-xl">Diagnosis Report</h3>
                    <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">AI Verified Insights</p>
                  </div>
                </div>
                {!isEditing && (
                    <div className="flex gap-2">
                        {!isSaved && (
                            <button
                                onClick={handleManualSave}
                                className="bg-white text-blue-600 p-2.5 rounded-xl hover:bg-blue-50 transition shadow-lg active:scale-95"
                                title="Save to History"
                            >
                                <Save size={18} />
                            </button>
                        )}
                        <button
                            onClick={handleStartEdit}
                            className="bg-white/20 p-2.5 rounded-xl text-white hover:bg-white/30 transition backdrop-blur-md active:scale-95"
                            title="Edit Analysis"
                        >
                            <Edit3 size={18} />
                        </button>
                    </div>
                )}
              </div>

              <div className="p-8">
                {isEditing ? (
                    <div className="space-y-4">
                        <textarea
                            value={editedAnalysis}
                            onChange={(e) => setEditedAnalysis(e.target.value)}
                            className="w-full h-80 p-5 text-[15px] rounded-3xl border-2 border-blue-50 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:border-blue-500 outline-none resize-none font-medium leading-relaxed transition-all"
                            placeholder="Add your notes or correct the report..."
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={handleCancelEdit}
                                className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                            >
                                Discard
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-8 py-3 text-sm font-black bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2"
                            >
                                <CheckCircle2 size={18} /> Finish Editing
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none">
                        <RichText text={analysis} className="text-gray-700 dark:text-gray-200 leading-relaxed text-[15px]" />
                        
                        <div className="mt-10 pt-8 border-t border-gray-50 dark:border-gray-700/50 flex flex-col items-center">
                            <div className="flex gap-4 mb-6">
                                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest hover:bg-blue-100 transition">
                                    <Share2 size={16} /> Share Report
                                </button>
                                <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition">
                                    <MessageSquare size={16} /> Expert Help
                                </button>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline History Section */}
      <div className="mt-12 px-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-xl">
                <History size={18} className="text-gray-400" />
             </div>
             <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Recent Diagnoses</h3>
          </div>
          {history.length > 0 && (
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{history.length} Saved</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {history.length === 0 ? (
            <div className="text-center py-10 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <p className="text-gray-400 text-sm font-medium">No saved diagnoses yet.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className={`group bg-white dark:bg-gray-800 p-4 rounded-[2rem] shadow-sm border-2 transition-all duration-300 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:-translate-y-1 ${
                    currentDiagnosisId === item.id 
                    ? 'border-blue-500 shadow-blue-500/10' 
                    : 'border-transparent hover:border-blue-100 dark:hover:border-blue-900/30'
                }`}
              >
                <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden shadow-md ring-2 ring-white dark:ring-gray-700">
                  <img src={item.imageUrl} alt="Crop" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="text-gray-300 hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-100 font-bold line-clamp-1 group-hover:text-blue-600 transition-colors">
                    {item.analysis.split('\n')[0] || "Analysis Report"}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium line-clamp-1 mt-0.5">
                    {item.analysis.replace(/[#*]/g, '').substring(0, 100)}...
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl text-gray-300 group-hover:text-blue-500 group-hover:bg-blue-50 transition-all">
                    <ChevronRight size={18} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorView;