import React, { useState, useRef, useEffect } from 'react';
import { analyzeCropHealth } from '../services/geminiService';
import { DiagnosisRecord } from '../types';
import { Upload, Camera, X, Loader2, AlertCircle, CheckCircle2, History, Calendar, ChevronRight, Trash2, ArrowLeft, Edit3, Save } from 'lucide-react';

interface DoctorViewProps {
  userId: string;
}

const DoctorView: React.FC<DoctorViewProps> = ({ userId }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DiagnosisRecord[]>([]);
  
  // Editing State
  const [currentDiagnosisId, setCurrentDiagnosisId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState('');
  
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
    }
  }, [userId]);

  const saveToLocalStorage = (newHistory: DiagnosisRecord[]) => {
    if (!userId) return;
    try {
       const storageKey = `khetismart_doctor_history_${userId}`;
       localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (e) {
       console.error("Failed to save history - quota may be exceeded", e);
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
    } catch (e) {
      console.error("Failed to save diagnosis", e);
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
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !selectedImage) return;
    setLoading(true);
    const result = await analyzeCropHealth(imageFile);
    setAnalysis(result);
    
    // Save immediately and set as current for editing
    const newId = Date.now().toString();
    saveDiagnosis(selectedImage, result, newId);
    setCurrentDiagnosisId(newId);
    
    setLoading(false);
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setAnalysis(null);
    setCurrentDiagnosisId(null);
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadHistoryItem = (item: DiagnosisRecord) => {
    setSelectedImage(item.imageUrl);
    setAnalysis(item.analysis);
    setCurrentDiagnosisId(item.id);
    setImageFile(null); // No file object available for historical items
    setShowHistory(false);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setEditedAnalysis(analysis || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (currentDiagnosisId && editedAnalysis.trim()) {
      setAnalysis(editedAnalysis);
      updateDiagnosis(currentDiagnosisId, editedAnalysis);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAnalysis('');
  };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-6 px-4 transition-colors duration-300">
        <div className="flex items-center gap-2 mb-6 px-2">
          <button 
            onClick={() => setShowHistory(false)}
            className="p-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-secondary dark:text-emerald-400">Diagnosis History</h2>
        </div>

        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <History size={48} className="mb-4 opacity-20" />
              <p>No past diagnoses found.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => loadHistoryItem(item)}
                className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 cursor-pointer hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition group"
              >
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img src={item.imageUrl} alt="Crop" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <Calendar size={12} />
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={(e) => deleteHistoryItem(e, item.id)}
                      className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-2">
                    {item.analysis.split('\n')[0] || "Analysis Report"}
                  </p>
                  <div className="flex items-center text-xs text-primary mt-2 font-medium">
                    View Report <ChevronRight size={12} className="ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-6 px-4 transition-colors duration-300">
      <div className="flex justify-between items-center mb-2 px-2">
        <h2 className="text-2xl font-bold text-secondary dark:text-emerald-400">Crop Doctor</h2>
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 text-xs font-medium bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:border-primary transition"
        >
          <History size={14} /> History
        </button>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 px-2">Take a photo of your crop to detect diseases.</p>

      {!selectedImage ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-primary dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition h-64 shadow-sm"
        >
          <div className="bg-emerald-100 dark:bg-emerald-900 p-4 rounded-full mb-4">
            <Camera className="text-primary dark:text-emerald-400" size={32} />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">Tap to take photo</p>
          <p className="text-xs text-gray-400 mt-1">or upload from gallery</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden shadow-md">
            <img src={selectedImage} alt="Crop" className="w-full h-64 object-cover" />
            <button 
              onClick={clearImage}
              className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>

          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-600 transition flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" /> Analyzing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2" /> Diagnose Disease
                </>
              )}
            </button>
          )}

          {analysis && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-accent" size={20} />
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white">Diagnosis Report</h3>
                </div>
                {currentDiagnosisId && !isEditing && (
                    <button 
                        onClick={handleStartEdit}
                        className="p-2 text-gray-500 hover:text-primary hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition"
                        title="Edit Analysis"
                    >
                        <Edit3 size={18} />
                    </button>
                )}
              </div>
              
              {isEditing ? (
                  <div className="space-y-3">
                      <textarea
                          value={editedAnalysis}
                          onChange={(e) => setEditedAnalysis(e.target.value)}
                          className="w-full h-64 p-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary outline-none resize-none font-sans leading-relaxed"
                          placeholder="Enter your notes or correct the diagnosis..."
                      />
                      <div className="flex justify-end gap-2">
                          <button 
                              onClick={handleCancelEdit}
                              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleSaveEdit}
                              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-emerald-600 transition flex items-center gap-1.5"
                          >
                              <Save size={16} /> Save Changes
                          </button>
                      </div>
                  </div>
              ) : (
                  <div className="prose prose-sm prose-emerald dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed">
                    <div className="whitespace-pre-wrap">{analysis}</div>
                  </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoctorView;