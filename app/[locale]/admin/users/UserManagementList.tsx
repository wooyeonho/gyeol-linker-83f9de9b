import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { User, ShoppingBag, Shield } from 'lucide-react';
import ChangeRoleButton from './ChangeRoleButton';

/**
 * 사용자 정보 타입
 */
interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'seller' | 'admin';
  created_at: string;
  prompt_count: number;
  order_count: number;
}

/**
 * 사용자 목록 조회
 */
async function fetchUsers(search: string): Promise<UserInfo[]> {
  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select(`
      id,
      email,
      name,
      role,
      created_at,
      prompts (count),
      orders!buyer_id (count)
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (search.trim()) {
    query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
  }

  const { data: profiles, error } = await query;

  if (error || !profiles) {
    return [];
  }

  return profiles.map((profile: any) => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    created_at: profile.created_at,
    prompt_count: Array.isArray(profile.prompts) ? profile.prompts.length : 0,
    order_count: Array.isArray(profile.orders) ? profile.orders.length : 0,
  }));
}

/**
 * 사용자 목록 컴포넌트
 */
export default async function UserManagementList({
  locale,
  search,
}: {
  locale: string;
  search: string;
}) {
  const users = await fetchUsers(search);
  const t = await getTranslations('adminUsers');

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">사용자를 찾을 수 없습니다</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    user: t('user'),
    seller: t('seller'),
    admin: t('admin'),
  };

  const roleIcons: Record<string, typeof User> = {
    user: User,
    seller: ShoppingBag,
    admin: Shield,
  };

  const roleColors: Record<string, string> = {
    user: 'bg-gray-500/20 text-gray-400',
    seller: 'bg-primary/20 text-primary',
    admin: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="space-y-4">
      {users.map((user) => {
        const RoleIcon = roleIcons[user.role];
        const joinDate = new Date(user.created_at).toLocaleDateString(
          locale === 'ko' ? 'ko-KR' : 'en-US',
          {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        );

        return (
          <div
            key={user.id}
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-primary transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                {/* 아바타 */}
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-400" />
                </div>

                {/* 정보 */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold">{user.name || user.email}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {roleLabels[user.role]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{user.email}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>가입일: {joinDate}</span>
                    <span>프롬프트: {user.prompt_count}</span>
                    <span>주문: {user.order_count}</span>
                  </div>
                </div>
              </div>

              {/* 역할 변경 */}
              <ChangeRoleButton userId={user.id} currentRole={user.role} />
            </div>
          </div>
        );
      })}
    </div>
  );
}



