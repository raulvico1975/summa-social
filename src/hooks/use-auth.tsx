// This file is no longer needed with the new architecture
// and can be deleted or left empty.
// To avoid breaking imports, we'll leave it with a basic hook.

'use client';

import { useContext } from 'react';
import { OrganizationContext } from './organization-provider';

export const useAuth = () => {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an OrganizationProvider');
    }
    
    // This hook will now be a proxy to the organization context
    // The actual user object construction happens in the sidebar directly
    return {
        user: {
            uid: context.firebaseUser?.uid,
            name: context.userProfile?.displayName || context.firebaseUser?.displayName,
            email: context.firebaseUser?.email,
            picture: context.firebaseUser?.photoURL,
        },
        loading: context.isLoading,
    }
};

// The AuthProvider component is no longer needed
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};
