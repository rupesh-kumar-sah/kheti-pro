
import React, { useState, useEffect } from 'react';
import Header from './Header';
import WeatherCard from './WeatherCard';
import { ViewState } from '../types';
import { TrendingUp, Camera, MessageCircle, Sprout, ChevronRight, Plus, Check, Trash2, Bot } from 'lucide-react';

interface HomeViewProps {
  setView: (view: ViewState) => void;
  onOpenChat: () => void;
}

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

const HomeView: React.FC<HomeViewProps> = ({ setView, onOpenChat }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    const savedTasks = localStorage.getItem('khetismart_tasks');
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (e) {
        console.error('Error parsing tasks', e);
      }
    }
  }, []);

  const saveTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem('khetismart_tasks', JSON.stringify(updatedTasks));
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      text: newTask.trim(),
      completed: false,
    };
    saveTasks([task, ...tasks]); // Add new tasks to the top
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
  };

  return (
    <div className="pb-24">
      <Header />
      <WeatherCard />
      
      <div className="px-6 mt-8">
        <h3 className="text-lg font-bold text-secondary dark:text-emerald-400 mb-4 transition-colors">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setView('market')}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-emerald-50 dark:hover:bg-gray-700 transition duration-300"
          >
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-full mb-3">
              <TrendingUp className="text-primary dark:text-emerald-400" size={24} />
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Market Prices</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Check Trends</span>
          </button>

          <button 
            onClick={() => setView('doctor')}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-emerald-50 dark:hover:bg-gray-700 transition duration-300"
          >
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-full mb-3">
              <Camera className="text-primary dark:text-emerald-400" size={24} />
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Crop Doctor</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Identify Disease</span>
          </button>

          <button 
            onClick={onOpenChat}
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-emerald-50 dark:hover:bg-gray-700 transition duration-300"
          >
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-3 rounded-full mb-3">
              <MessageCircle className="text-primary dark:text-emerald-400" size={24} />
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Farming Guide</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ask AI Expert</span>
          </button>

          <button 
            onClick={() => {}} 
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center hover:bg-emerald-50 dark:hover:bg-gray-700 transition duration-300 opacity-60"
          >
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full mb-3">
              <Sprout className="text-gray-500 dark:text-gray-400" size={24} />
            </div>
            <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">My Crops</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coming Soon</span>
          </button>
        </div>
      </div>

      <div className="px-6 mt-8">
        <div className="bg-gradient-to-r from-secondary to-primary dark:from-emerald-900 dark:to-emerald-700 p-5 rounded-2xl text-white shadow-lg relative overflow-hidden transition-colors duration-300">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 opacity-90">
              <Sprout size={16} />
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Tip</span>
            </div>
            <p className="font-medium text-sm leading-relaxed mb-3 text-emerald-50">
              The best time to water your crops is early morning or late evening to minimize water loss through evaporation.
            </p>
            <button className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full flex items-center w-fit transition">
              Read More <ChevronRight size={12} className="ml-1" />
            </button>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        </div>
      </div>

      {/* To-Do List Section */}
      <div className="px-6 mt-8">
        <h3 className="text-lg font-bold text-secondary dark:text-emerald-400 mb-4 transition-colors">My Tasks</h3>
        
        {/* Add Task Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add new task..."
            className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-gray-100 transition-colors shadow-sm"
          />
          <button
            onClick={handleAddTask}
            disabled={!newTask.trim()}
            className="bg-primary text-white p-3 rounded-xl shadow-sm hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
              <p className="text-gray-400 text-sm">No tasks yet. Add one above!</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div 
                key={task.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${
                  task.completed 
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-emerald-500'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <span className={`text-sm truncate ${
                    task.completed 
                      ? 'text-gray-400 line-through' 
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {task.text}
                  </span>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Floating Action Button */}
      <button
        onClick={onOpenChat}
        className="fixed bottom-24 right-4 z-30 bg-secondary dark:bg-emerald-600 text-white p-3.5 rounded-full shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 pr-5"
      >
        <div className="bg-white/20 p-1 rounded-full">
            <Bot size={20} />
        </div>
        <span className="font-semibold text-sm">Ask AI</span>
      </button>
    </div>
  );
};

export default HomeView;
