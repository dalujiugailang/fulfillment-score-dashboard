import { ProviderName } from './dashboardData';
import { UserRoleType, UserSession } from './components/LoginScreen';

const ROLE_PROVIDER_MAP: Partial<Record<UserRoleType, ProviderName>> = {
  qingyang: '清洋',
  haijing: '海鲸',
  xiaozhi: '小智'
};

export const isAdmin = (session: UserSession) => session.role === 'admin';

export const getSessionProvider = (session: UserSession): ProviderName | null => {
  return ROLE_PROVIDER_MAP[session.role] ?? null;
};

export const canViewUpload = (session: UserSession) => isAdmin(session);
