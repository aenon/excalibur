import { type Ref } from 'vue';
import type { UserProfile } from '../types/user';
export declare function useUserProfile(): {
    profile: Ref<UserProfile | null | undefined, UserProfile | null | undefined>;
    hasProfile: import("vue").ComputedRef<boolean>;
    createOrUpdateProfile: (displayName: string) => Promise<void>;
};
