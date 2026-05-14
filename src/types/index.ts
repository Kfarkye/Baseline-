export interface UserData {
  userId: string;
  email: string;
  displayName: string;
  balance: number;
  planTier: string;
  queryCount: number;
  lastQueryDate: string;
  preferences: {
    favoriteLeagues: string[];
    riskLevel: string;
  };
}

export interface ArtifactMeta {
  id: string;
  creatorId: string;
  title: string;
  type: string;
  createdAt: any; // firebase timestamp
  content: string;
}
