
export type AppRole = 'admin' | 'moderator' | 'user';

export interface UserRoles {
  isAdmin: boolean;
  isModerator: boolean;
  roles: AppRole[];
}
