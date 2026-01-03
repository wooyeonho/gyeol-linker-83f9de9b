'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * 커뮤니티 카테고리 타입
 */
export type CommunityCategory = 'tips' | 'qna' | 'free' | 'all';

/**
 * 게시글 데이터 타입
 */
export interface CommunityPost {
  id: string;
  author_id: string;
  author_name: string | null;
  category: CommunityCategory;
  title: string;
  content: string;
  view_count: number;
  prompt_id: string | null;
  created_at: string;
  updated_at: string;
  like_count: number;
  comment_count: number;
  is_liked?: boolean;
}

/**
 * 댓글 데이터 타입
 */
export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

/**
 * 게시글 생성
 */
export async function createPost({
  category,
  title,
  content,
  promptId,
}: {
  category: CommunityCategory;
  title: string;
  content: string;
  promptId?: string | null;
}) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 데이터 검증
  if (!title.trim() || !content.trim()) {
    return { error: '제목과 내용을 입력해주세요.' };
  }

  if (category === 'all' || !['tips', 'qna', 'free'].includes(category)) {
    return { error: '올바른 카테고리를 선택해주세요.' };
  }

  // 3. 게시글 생성
  const { data: post, error } = await supabase
    .from('community_posts')
    .insert({
      author_id: user.id,
      category: category as 'tips' | 'qna' | 'free',
      title: title.trim(),
      content: content.trim(),
      prompt_id: promptId || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('게시글 생성 오류:', error);
    return { error: '게시글 작성에 실패했습니다.' };
  }

  // 4. 페이지 캐시 무효화
  revalidatePath('/community', 'page');

  return { success: true, postId: post.id };
}

/**
 * 게시글 목록 조회
 */
export async function getPosts({
  category = 'all',
  search = '',
  sort = 'latest',
  page = 1,
  limit = 20,
}: {
  category?: CommunityCategory;
  search?: string;
  sort?: 'latest' | 'popular' | 'views';
  page?: number;
  limit?: number;
}): Promise<CommunityPost[]> {
  const supabase = await createClient();

  let query = supabase
    .from('community_posts')
    .select(
      `
      *,
      author:profiles!community_posts_author_id_fkey(name),
      likes:community_likes(count),
      comments:community_comments(count)
    `
    )
    .order('created_at', { ascending: false });

  // 카테고리 필터
  if (category !== 'all') {
    query = query.eq('category', category);
  }

  // 검색 필터
  if (search.trim()) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // 정렬
  if (sort === 'popular') {
    // 인기순은 클라이언트에서 처리 (좋아요 + 조회수 + 댓글수)
    query = query.order('created_at', { ascending: false });
  } else if (sort === 'views') {
    query = query.order('view_count', { ascending: false });
  }

  // 페이지네이션
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    console.error('게시글 조회 오류:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  // 데이터 변환
  return data.map((post: any) => ({
    id: post.id,
    author_id: post.author_id,
    author_name: post.author?.name || null,
    category: post.category,
    title: post.title,
    content: post.content,
    view_count: post.view_count,
    prompt_id: post.prompt_id,
    created_at: post.created_at,
    updated_at: post.updated_at,
    like_count: post.likes?.[0]?.count || 0,
    comment_count: post.comments?.[0]?.count || 0,
  }));
}

/**
 * 인기 게시글 조회
 */
export async function getPopularPosts(limit: number = 10): Promise<CommunityPost[]> {
  const supabase = await createClient();

  // 최근 7일 내 게시글 조회
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data, error } = await supabase
    .from('community_posts')
    .select(
      `
      *,
      author:profiles!community_posts_author_id_fkey(name),
      likes:community_likes(count),
      comments:community_comments(count)
    `
    )
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100); // 후보를 넓게 가져옴

  if (error || !data) {
    return [];
  }

  // 인기 점수 계산 및 정렬
  const scored = data.map((post: any) => {
    const likeCount = post.likes?.[0]?.count || 0;
    const commentCount = post.comments?.[0]?.count || 0;
    const popularityScore =
      likeCount * 10 + post.view_count * 1 + commentCount * 5;

    return {
      id: post.id,
      author_id: post.author_id,
      author_name: post.author?.name || null,
      category: post.category,
      title: post.title,
      content: post.content,
      view_count: post.view_count,
      prompt_id: post.prompt_id,
      created_at: post.created_at,
      updated_at: post.updated_at,
      like_count: likeCount,
      comment_count: commentCount,
      popularityScore,
    };
  });

  return scored
    .sort((a: any, b: any) => b.popularityScore - a.popularityScore)
    .slice(0, limit)
    .map(({ popularityScore, ...post }: any) => post);
}

/**
 * 게시글 상세 조회
 */
export async function getPost(postId: string): Promise<CommunityPost | null> {
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from('community_posts')
    .select(
      `
      *,
      author:profiles!community_posts_author_id_fkey(name),
      likes:community_likes(count),
      comments:community_comments(count)
    `
    )
    .eq('id', postId)
    .single();

  if (error || !post) {
    return null;
  }

  // 현재 사용자 좋아요 여부 확인
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isLiked = false;
  if (user) {
    const { data: like } = await supabase
      .from('community_likes')
      .select('*')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single();
    isLiked = !!like;
  }

  return {
    id: post.id,
    author_id: post.author_id,
    author_name: post.author?.name || null,
    category: post.category,
    title: post.title,
    content: post.content,
    view_count: post.view_count,
    prompt_id: post.prompt_id,
    created_at: post.created_at,
    updated_at: post.updated_at,
    like_count: post.likes?.[0]?.count || 0,
    comment_count: post.comments?.[0]?.count || 0,
    is_liked: isLiked,
  };
}

/**
 * 게시글 수정
 */
export async function updatePost(
  postId: string,
  {
    category,
    title,
    content,
    promptId,
  }: {
    category: CommunityCategory;
    title: string;
    content: string;
    promptId?: string | null;
  }
) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 게시글 소유권 확인
  const { data: post, error: fetchError } = await supabase
    .from('community_posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    return { error: '게시글을 찾을 수 없습니다.' };
  }

  if (post.author_id !== user.id) {
    return { error: '권한이 없습니다.' };
  }

  // 3. 데이터 검증
  if (!title.trim() || !content.trim()) {
    return { error: '제목과 내용을 입력해주세요.' };
  }

  if (category === 'all' || !['tips', 'qna', 'free'].includes(category)) {
    return { error: '올바른 카테고리를 선택해주세요.' };
  }

  // 4. 게시글 수정
  const { error: updateError } = await supabase
    .from('community_posts')
    .update({
      category: category as 'tips' | 'qna' | 'free',
      title: title.trim(),
      content: content.trim(),
      prompt_id: promptId || null,
    })
    .eq('id', postId);

  if (updateError) {
    console.error('게시글 수정 오류:', updateError);
    return { error: '게시글 수정에 실패했습니다.' };
  }

  // 5. 페이지 캐시 무효화
  revalidatePath('/community', 'page');
  revalidatePath(`/community/${postId}`, 'page');

  return { success: true };
}

/**
 * 게시글 삭제
 */
export async function deletePost(postId: string) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 게시글 소유권 확인
  const { data: post, error: fetchError } = await supabase
    .from('community_posts')
    .select('author_id')
    .eq('id', postId)
    .single();

  if (fetchError || !post) {
    return { error: '게시글을 찾을 수 없습니다.' };
  }

  if (post.author_id !== user.id) {
    return { error: '권한이 없습니다.' };
  }

  // 3. 게시글 삭제
  const { error: deleteError } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);

  if (deleteError) {
    console.error('게시글 삭제 오류:', deleteError);
    return { error: '게시글 삭제에 실패했습니다.' };
  }

  // 4. 페이지 캐시 무효화
  revalidatePath('/community', 'page');

  return { success: true };
}

/**
 * 조회수 증가 (쿠키 기반 중복 방지)
 */
export async function incrementViewCount(postId: string) {
  const cookieStore = await cookies();
  const cookieName = `viewed_post_${postId}`;

  // 쿠키 확인
  const viewed = cookieStore.get(cookieName);
  if (viewed) {
    return { success: false, message: 'Already viewed' };
  }

  const supabase = await createClient();

  // 조회수 증가
  const { error } = await supabase.rpc('increment_community_post_view_count', {
    post_uuid: postId,
  });

  if (error) {
    console.error('조회수 증가 오류:', error);
    return { success: false, error: '조회수 증가에 실패했습니다.' };
  }

  // 쿠키 설정 (24시간)
  cookieStore.set(cookieName, '1', {
    maxAge: 60 * 60 * 24, // 24시간
    httpOnly: false,
    sameSite: 'lax',
  });

  // 페이지 캐시 무효화
  revalidatePath(`/community/${postId}`, 'page');

  return { success: true };
}

/**
 * 댓글 작성
 */
export async function createComment(postId: string, content: string) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 데이터 검증
  if (!content.trim()) {
    return { error: '댓글 내용을 입력해주세요.' };
  }

  // 3. 댓글 생성
  const { error } = await supabase.from('community_comments').insert({
    post_id: postId,
    author_id: user.id,
    content: content.trim(),
  });

  if (error) {
    console.error('댓글 작성 오류:', error);
    return { error: '댓글 작성에 실패했습니다.' };
  }

  // 4. 페이지 캐시 무효화
  revalidatePath(`/community/${postId}`, 'page');

  return { success: true };
}

/**
 * 댓글 목록 조회
 */
export async function getComments(postId: string): Promise<CommunityComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('community_comments')
    .select(
      `
      *,
      author:profiles!community_comments_author_id_fkey(name)
    `
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('댓글 조회 오류:', error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data.map((comment: any) => ({
    id: comment.id,
    post_id: comment.post_id,
    author_id: comment.author_id,
    author_name: comment.author?.name || null,
    content: comment.content,
    created_at: comment.created_at,
  }));
}

/**
 * 댓글 삭제
 */
export async function deleteComment(commentId: string) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 댓글 소유권 확인
  const { data: comment, error: fetchError } = await supabase
    .from('community_comments')
    .select('author_id, post_id')
    .eq('id', commentId)
    .single();

  if (fetchError || !comment) {
    return { error: '댓글을 찾을 수 없습니다.' };
  }

  if (comment.author_id !== user.id) {
    return { error: '권한이 없습니다.' };
  }

  // 3. 댓글 삭제
  const { error: deleteError } = await supabase
    .from('community_comments')
    .delete()
    .eq('id', commentId);

  if (deleteError) {
    console.error('댓글 삭제 오류:', deleteError);
    return { error: '댓글 삭제에 실패했습니다.' };
  }

  // 4. 페이지 캐시 무효화
  revalidatePath(`/community/${comment.post_id}`, 'page');

  return { success: true };
}

/**
 * 좋아요 토글
 */
export async function toggleLike(postId: string) {
  const supabase = await createClient();

  // 1. 사용자 인증 확인
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: '로그인이 필요합니다.' };
  }

  // 2. 현재 좋아요 상태 확인
  const { data: existing } = await supabase
    .from('community_likes')
    .select('*')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .single();

  if (existing) {
    // 좋아요 삭제
    const { error } = await supabase
      .from('community_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);

    if (error) {
      console.error('좋아요 삭제 오류:', error);
      return { error: '좋아요 취소에 실패했습니다.' };
    }

    revalidatePath(`/community/${postId}`, 'page');
    revalidatePath('/community', 'page');

    return { success: true, liked: false };
  } else {
    // 좋아요 생성
    const { error } = await supabase.from('community_likes').insert({
      user_id: user.id,
      post_id: postId,
    });

    if (error) {
      console.error('좋아요 생성 오류:', error);
      return { error: '좋아요에 실패했습니다.' };
    }

    revalidatePath(`/community/${postId}`, 'page');
    revalidatePath('/community', 'page');

    return { success: true, liked: true };
  }
}


