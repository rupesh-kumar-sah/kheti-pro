import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MessageSquare, Send, Trash2, User as UserIcon, PenTool, Loader2, RefreshCw, AlertCircle, Edit3, X, Check, Heart, Share2, Filter, LayoutGrid, List } from 'lucide-react';
import { fetchPosts, createPost, deletePost, updatePost, fetchMyPosts, likePost } from '../services/postService';
import { Post } from '../types';

const POST_MAX = 280;
const DRAFT_MAX = 5;

function CharRing({ count, max }: { count: number; max: number }) {
  const radius = 10;
  const circ = 2 * Math.PI * radius;
  const fill = Math.min(count / max, 1);
  const pct = circ * (1 - fill);
  const danger = count > max * 0.9;
  const over = count >= max;
  const color = over ? '#ef4444' : danger ? '#f97316' : '#10b981';
  return (
    <div className="relative flex items-center justify-center">
      <svg width={32} height={32} viewBox="0 0 28 28" className="shrink-0 -rotate-90">
        <circle cx={14} cy={14} r={radius} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth={2.5} />
        <circle
          cx={14} cy={14} r={radius} fill="none" stroke={color} strokeWidth={2.5}
          strokeDasharray={circ} strokeDashoffset={pct}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s' }}
        />
      </svg>
      {danger && (
        <span className={`absolute text-[9px] font-bold ${over ? 'text-red-500' : 'text-orange-500'}`}>
          {max - count}
        </span>
      )}
    </div>
  );
}

const PostCard = React.memo(({ 
  post, 
  currentUserId, 
  isEditing, 
  editContent, 
  setEditContent, 
  onStartEdit, 
  onCancelEdit, 
  onSaveEdit, 
  onDelete,
  onLike,
  isLiked
}: { 
  post: Post; 
  currentUserId: string;
  isEditing: boolean;
  editContent: string;
  setEditContent: (s: string) => void;
  onStartEdit: (p: Post) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onLike: (id: string) => void;
  isLiked: boolean;
}) => {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.author_name} on KhetiSmart`,
          text: post.content,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(post.content);
      alert('Content copied to clipboard!');
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900/30 transition-all duration-300 group ${post.is_draft ? 'border-dashed border-orange-200 dark:border-orange-900/30' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <UserIcon size={22} className="text-white" />
          </div>
          {post.is_draft && (
            <div className="absolute -top-1 -right-1 bg-orange-500 text-white p-1 rounded-full border-2 border-white dark:border-gray-800" title="Draft">
              <PenTool size={8} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex flex-col">
               <span className="font-bold text-gray-900 dark:text-gray-100 text-[15px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                 {post.author_name}
               </span>
               <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                 {new Date(post.created_at).toLocaleDateString('en-NP', { day: 'numeric', month: 'short' })}
               </span>
            </div>
            {post.user_id === currentUserId && !isEditing && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onStartEdit(post)}
                  className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-xl transition"
                >
                  <Edit3 size={16} />
                </button>
                <button
                  onClick={() => onDelete(post.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-xl transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value.slice(0, 280))}
                className="w-full text-sm p-4 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 text-gray-800 dark:text-gray-200 resize-none outline-none focus:border-blue-400 transition-all"
                rows={4}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button onClick={onCancelEdit} className="text-xs font-bold px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button onClick={() => onSaveEdit(post.id)} className="text-xs font-bold px-5 py-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition shadow-md shadow-blue-500/20">
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>
          )}

          {!isEditing && (
            <div className="mt-4 flex items-center gap-6 pt-3 border-t border-gray-50 dark:border-gray-700/50">
              <button 
                onClick={() => onLike(post.id)}
                className={`flex items-center gap-2 text-xs font-semibold transition-colors ${post.is_liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-500'}`}
              >
                <Heart size={18} fill={post.is_liked ? 'currentColor' : 'none'} className={post.is_liked ? 'animate-bounce' : ''} />
                <span>{post.likes_count || 0} {post.is_liked ? 'Liked' : 'Likes'}</span>
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-blue-500 transition-colors"
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

interface CommunityViewProps {
  userId: string;
}

const CommunityView: React.FC<CommunityViewProps> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const charCount = newPost.length;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allData, mineData] = await Promise.all([
        fetchPosts(),
        fetchMyPosts()
      ]);
      setPosts(allData);
      setMyPosts(mineData);
    } catch (e: any) {
      setError(e.message || 'Could not load community data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handlePost = async (isDraft = false) => {
    if (!newPost.trim() || submitting || newPost.length > POST_MAX) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createPost(newPost.trim(), isDraft);
      if (!isDraft) {
        setPosts(prev => [created, ...prev]);
      }
      setMyPosts(prev => [created, ...prev]);
      setNewPost('');
    } catch (e: any) {
      setError(e.message || 'Failed to post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    setError(null);
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setMyPosts(prev => prev.filter(p => p.id !== id));
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
  };

  const handleLike = async (id: string) => {
    try {
      const isNowLiked = await likePost(id);
      const updateList = (list: Post[]) => list.map(p => {
        if (p.id !== id) return p;
        const oldCount = p.likes_count || 0;
        return {
          ...p,
          is_liked: isNowLiked,
          likes_count: isNowLiked ? oldCount + 1 : Math.max(0, oldCount - 1)
        };
      });
      setPosts(prev => updateList(prev));
      setMyPosts(prev => updateList(prev));
    } catch (e: any) {
      console.error('Like failed', e);
    }
  };

  const startEdit = (post: Post) => {
    setEditingId(post.id);
    setEditContent(post.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (id: string) => {
    if (!editContent.trim() || editContent.length > POST_MAX) return;
    setError(null);
    try {
      const updated = await updatePost(id, editContent.trim());
      setPosts(prev => prev.map(p => p.id === id ? updated : p));
      setMyPosts(prev => prev.map(p => p.id === id ? updated : p));
      setEditingId(null);
    } catch (e: any) {
      setError(e.message || 'Failed to update');
    }
  };

  const displayPosts = activeTab === 'all' ? posts : myPosts;

  const remaining = POST_MAX - charCount;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 pt-6 px-4 transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <MessageSquare size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Community</h2>
            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">Connect & Share</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-3 rounded-2xl text-gray-400 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:text-blue-500 hover:border-blue-100 transition disabled:opacity-50"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 mx-2">
        <button 
          onClick={() => setActiveTab('all')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          <LayoutGrid size={16} /> Global Feed
        </button>
        <button 
          onClick={() => setActiveTab('mine')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'mine' ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
        >
          <UserIcon size={16} /> My Activity
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-medium animate-in slide-in-from-top-2">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Compose Box */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-[2rem] shadow-sm mb-8 border border-gray-100 dark:border-gray-700/50 group focus-within:shadow-xl focus-within:border-blue-200 dark:focus-within:border-blue-900 transition-all duration-300">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center shrink-0">
            <UserIcon size={20} className="text-gray-400" />
          </div>
          <textarea
            value={newPost}
            onChange={e => setNewPost(e.target.value.slice(0, POST_MAX))}
            placeholder="Share an update with your fellow farmers..."
            className="flex-1 bg-transparent resize-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 font-medium text-[15px] pt-2 min-h-[90px]"
          />
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handlePost(true)}
              disabled={!newPost.trim() || submitting || charCount > POST_MAX}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition disabled:opacity-30"
            >
              <PenTool size={16} /> Draft
            </button>
          </div>
          <div className="flex items-center gap-4">
            <CharRing count={charCount} max={POST_MAX} />
            <button
              onClick={() => handlePost(false)}
              disabled={!newPost.trim() || submitting || charCount > POST_MAX}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-500/30 text-sm"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              <span>Post Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <Loader2 size={48} className="text-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            </div>
          </div>
          <p className="mt-4 text-gray-400 font-bold text-sm uppercase tracking-widest">Refreshing Feed...</p>
        </div>
      ) : displayPosts.length === 0 ? (
        <div className="text-center py-20 px-6">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
            <MessageSquare size={40} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
            {activeTab === 'all' ? 'Quiet in the fields' : 'Your activity is empty'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[200px] mx-auto mb-8 font-medium">
            {activeTab === 'all' ? 'Be the first to break the silence and share an update!' : 'Drafts and posts you create will appear here.'}
          </p>
          <button 
            onClick={loadData}
            className="text-blue-500 font-black text-sm uppercase tracking-widest hover:text-blue-600 transition"
          >
            Check Again
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-12">
          {displayPosts.map(post => (
            <PostCard 
              key={post.id}
              post={post}
              currentUserId={userId}
              isEditing={editingId === post.id}
              editContent={editContent}
              setEditContent={setEditContent}
              onStartEdit={startEdit}
              onCancelEdit={cancelEdit}
              onSaveEdit={saveEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              isLiked={!!post.is_liked}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommunityView;
