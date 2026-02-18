/**
 * OpenClaw SNS Client — Moltbook <-> OpenClaw Gateway bidirectional sync
 *
 * Outbound: Internal moltbook post -> Gateway /api/social/post
 * Inbound:  Gateway /api/social/feed -> Internal moltbook DB
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const OPENCLAW_URL = process.env.OPENCLAW_GATEWAY_URL ?? '';
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN ?? '';

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (OPENCLAW_TOKEN) h['Authorization'] = `Bearer ${OPENCLAW_TOKEN}`;
  return h;
}

function baseUrl(): string {
  return OPENCLAW_URL.replace(/\/$/, '');
}

export interface OpenClawPost {
  id: string;
  agentId: string;
  agentName?: string;
  content: string;
  likes: number;
  commentsCount: number;
  createdAt: string;
}

export interface OpenClawComment {
  id: string;
  postId: string;
  agentId: string;
  content: string;
  createdAt: string;
}

export async function fetchOpenClawFeed(limit = 20): Promise<OpenClawPost[]> {
  if (!OPENCLAW_URL) return [];
  try {
    const res = await fetch(`${baseUrl()}/api/social/feed?limit=${limit}`, {
      method: 'GET',
      headers: headers(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.posts) ? data.posts : [];
  } catch {
    return [];
  }
}

export async function postToOpenClaw(
  agentId: string,
  content: string,
  agentName?: string,
): Promise<OpenClawPost | null> {
  if (!OPENCLAW_URL) return null;
  try {
    const res = await fetch(`${baseUrl()}/api/social/post`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ agentId, content, agentName }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as OpenClawPost;
  } catch {
    return null;
  }
}

export async function likeOnOpenClaw(postId: string, agentId: string): Promise<boolean> {
  if (!OPENCLAW_URL) return false;
  try {
    const res = await fetch(`${baseUrl()}/api/social/like`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ postId, agentId }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function commentOnOpenClaw(
  postId: string,
  agentId: string,
  content: string,
): Promise<OpenClawComment | null> {
  if (!OPENCLAW_URL) return null;
  try {
    const res = await fetch(`${baseUrl()}/api/social/comment`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ postId, agentId, content }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as OpenClawComment;
  } catch {
    return null;
  }
}

export async function syncOpenClawToLocal(
  supabase: SupabaseClient,
  agentId: string,
  limit = 20,
): Promise<{ synced: number; errors: number }> {
  const feed = await fetchOpenClawFeed(limit);
  if (!feed.length) return { synced: 0, errors: 0 };

  const { data: existing } = await supabase
    .from('gyeol_openclaw_post_mappings')
    .select('openclaw_post_id');
  const existingIds = new Set((existing ?? []).map((e: { openclaw_post_id: string }) => e.openclaw_post_id));

  let synced = 0;
  let errors = 0;

  for (const post of feed) {
    if (existingIds.has(post.id)) continue;

    const { data: localPost, error: insertErr } = await supabase
      .from('gyeol_moltbook_posts')
      .insert({
        agent_id: agentId,
        content: post.content,
        post_type: 'openclaw_sync',
        likes: post.likes ?? 0,
        comments_count: post.commentsCount ?? 0,
      })
      .select('id')
      .single();

    if (insertErr || !localPost) {
      errors++;
      continue;
    }

    await supabase.from('gyeol_openclaw_post_mappings').insert({
      local_post_id: localPost.id,
      openclaw_post_id: post.id,
      sync_direction: 'inbound',
    });
    synced++;
  }

  return { synced, errors };
}

export async function syncLocalToOpenClaw(
  supabase: SupabaseClient,
  localPostId: string,
  agentId: string,
  content: string,
  agentName?: string,
): Promise<boolean> {
  const openclawPost = await postToOpenClaw(agentId, content, agentName);
  if (!openclawPost) return false;

  await supabase.from('gyeol_openclaw_post_mappings').insert({
    local_post_id: localPostId,
    openclaw_post_id: openclawPost.id,
    sync_direction: 'outbound',
  });
  return true;
}
