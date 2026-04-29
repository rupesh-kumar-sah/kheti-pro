import { getStoredToken } from './authService';
import { Post } from '../types';

const API_BASE = '/api';

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Fetch all published community posts (newest first) */
export async function fetchPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/posts`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch posts: ${res.status}`);
  const data = await res.json();
  return data.posts as Post[];
}

/** Fetch current user's posts including drafts */
export async function fetchMyPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/posts/mine`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch my posts: ${res.status}`);
  const data = await res.json();
  return data.posts as Post[];
}

/** Create a new post or draft */
export async function createPost(content: string, isDraft = false): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ content, is_draft: isDraft }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || 'Failed to create post');
  }
  const data = await res.json();
  return data.post as Post;
}

/** Update a post's content (and optionally publish it) */
export async function updatePost(id: string, content: string, isDraft?: boolean): Promise<Post> {
  const body: any = { content };
  if (isDraft !== undefined) body.is_draft = isDraft;
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || 'Failed to update post');
  }
  const data = await res.json();
  return data.post as Post;
}

/** Delete a post by id */
export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || 'Failed to delete post');
  }
}

/** Toggle like on a post */
export async function likePost(id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/posts/${id}/like`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Server error' }));
    throw new Error(err.error || 'Failed to toggle like');
  }
  const data = await res.json();
  return data.liked;
}
