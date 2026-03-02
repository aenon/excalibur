import type { Timestamp } from 'firebase/firestore';
export interface UserProfile {
    uid: string;
    displayName: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}
