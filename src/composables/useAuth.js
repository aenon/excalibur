import { computed } from 'vue';
import { useCurrentUser } from 'vuefire';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, } from 'firebase/auth';
import { auth } from '../firebase';
export function useAuth() {
    const currentUser = useCurrentUser();
    const isAuthenticated = computed(() => currentUser.value !== null && currentUser.value !== undefined);
    async function signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    }
    async function signOut() {
        await firebaseSignOut(auth);
    }
    return {
        currentUser,
        isAuthenticated,
        signInWithGoogle,
        signOut,
    };
}
