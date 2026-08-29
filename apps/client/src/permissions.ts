import type { User } from './types';

export const isAdminUser = (user?: Pick<User,'isAdmin'|'isMegaAdmin'>) => Boolean(user && (user.isAdmin || user.isMegaAdmin));
