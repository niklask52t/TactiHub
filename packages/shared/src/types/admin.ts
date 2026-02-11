export interface RegistrationToken {
  id: string;
  token: string;
  createdBy: string;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  registrationEnabled: boolean;
  [key: string]: unknown;
}

export interface AdminStats {
  totalUsers: number;
  totalBattleplans: number;
  totalGames: number;
  totalMaps: number;
  recentUsers: Array<{
    id: string;
    username: string;
    email: string;
    createdAt: string;
  }>;
}
