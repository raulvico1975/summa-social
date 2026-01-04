'use client';

import { useState, useEffect, useContext } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { FirebaseContext } from '@/firebase/provider';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * It throws any received error to be caught by Next.js's global-error.tsx.
 *
 * IMPORTANT: Ignora errors permission-denied quan l'usuari no està autenticat,
 * ja que són esperables durant el logout (els listeners es desmunten després del signOut).
 */
export function FirebaseErrorListener() {
  // Use the specific error type for the state for type safety.
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  // Accedir al context per saber si hi ha usuari autenticat
  const firebaseContext = useContext(FirebaseContext);

  useEffect(() => {
    // The callback now expects a strongly-typed error, matching the event payload.
    const handleError = (error: FirestorePermissionError) => {
      // Set error in state to trigger a re-render.
      setError(error);
    };

    // The typed emitter will enforce that the callback for 'permission-error'
    // matches the expected payload type (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // GUARD: Si no hi ha usuari autenticat, ignorar errors permission-denied.
  // Aquests errors són esperables durant logout (listeners es desmunten després del signOut).
  // No volem mostrar la pàgina d'error si l'usuari simplement ha fet logout.
  if (error && !firebaseContext?.user) {
    // No llançar l'error - simplement ignorar-lo
    // El router ja estarà redirigint a /login
    return null;
  }

  // On re-render, if an error exists in state, throw it.
  if (error) {
    throw error;
  }

  // This component renders nothing.
  return null;
}
