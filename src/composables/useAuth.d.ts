import { Ref } from 'vue';
import { User } from 'firebase/auth';
export declare function useAuth(): {
    currentUser: Ref<User | null, User | null>;
    isAuthenticated: import("vue").ComputedRef<boolean>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
};
