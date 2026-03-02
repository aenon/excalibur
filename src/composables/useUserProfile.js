import { computed } from 'vue';
import { useDocument, useCurrentUser } from 'vuefire';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
export function useUserProfile() {
    const currentUser = useCurrentUser();
    const profileRef = computed(() => {
        if (!currentUser.value)
            return null;
        return doc(db, 'users', currentUser.value.uid);
    });
    const profile = useDocument(profileRef);
    const hasProfile = computed(() => {
        return profile.value !== null && profile.value !== undefined && !!profile.value.displayName;
    });
    async function createOrUpdateProfile(displayName) {
        if (!currentUser.value)
            return;
        const ref = doc(db, 'users', currentUser.value.uid);
        await setDoc(ref, {
            uid: currentUser.value.uid,
            displayName,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
        }, { merge: true });
    }
    return {
        profile,
        hasProfile,
        createOrUpdateProfile,
    };
}
