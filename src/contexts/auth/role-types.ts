
export type AppRole = 'user' | 'admin' | 'moderator';

export interface UserRoles {
  isAdmin: boolean;
  isModerator: boolean;
  roles: AppRole[];
}

export const DEFAULT_USER_ROLES: UserRoles = {
  isAdmin: false,
  isModerator: false,
  roles: ['user']
};
