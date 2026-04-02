export interface User {
  id: string;
  nickname: string;
  publicKey: string; // JWK serialized public key
  deviceFingerprint?: string;
  createdAt: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface PublicUserProfile {
  id: string;
  nickname: string;
  publicKey: string;
  isOnline?: boolean;
  lastSeen?: string;
}
