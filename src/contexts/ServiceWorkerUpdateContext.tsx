import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

// Intervalle de vérification automatique des mises à jour : 30 minutes
const AUTO_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

export type UpdateCheckStatus =
  | 'idle'
  | 'up-to-date'
  | 'available'
  | 'unsupported'
  | 'error';

interface ServiceWorkerUpdateContextValue {
  /** Indique si une nouvelle version est installée et en attente d'activation */
  updateAvailable: boolean;
  /** Indique si une recherche de mise à jour est en cours */
  isChecking: boolean;
  /** Résultat de la dernière vérification manuelle */
  lastCheckStatus: UpdateCheckStatus;
  /** Envoie SKIP_WAITING au worker en attente pour appliquer la mise à jour */
  applyUpdate: () => void;
  /** Force une vérification manuelle auprès du serveur */
  checkForUpdate: () => Promise<boolean>;
}

const ServiceWorkerUpdateContext = createContext<ServiceWorkerUpdateContextValue | undefined>(
  undefined
);

export function ServiceWorkerUpdateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckStatus, setLastCheckStatus] = useState<UpdateCheckStatus>('idle');

  // Références persistantes entre rendus
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  // Garde-fou pour n'effectuer qu'un seul rechargement lors du changement de contrôleur
  const hasReloadedRef = useRef(false);
  // Mémorise si un contrôleur existait déjà avant l'enregistrement (évite de recharger à la toute 1re visite)
  const hadControllerRef = useRef(
    typeof navigator !== 'undefined' &&
      'serviceWorker' in navigator &&
      Boolean(navigator.serviceWorker.controller)
  );

  // Enregistre une mise à jour en attente dans l'état et la ref
  const markUpdateReady = useCallback((worker: ServiceWorker | null) => {
    if (!worker) return;
    waitingWorkerRef.current = worker;
    setUpdateAvailable(true);
    setLastCheckStatus('available');
  }, []);

  useEffect(() => {
    // Vérifie le support du Service Worker dans le navigateur
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setLastCheckStatus('unsupported');
      return;
    }

    let isMounted = true;
    let activeRegistration: ServiceWorkerRegistration | null = null;
    const trackedWorkers = new Set<ServiceWorker>();

    // Surveille l'évolution d'un nouveau worker en cours d'installation
    const attachStateListener = (worker: ServiceWorker | null) => {
      if (!worker || trackedWorkers.has(worker)) return;
      trackedWorkers.add(worker);

      const handleStateChange = () => {
        if (!isMounted) return;
        // Une mise à jour est prête uniquement si elle est installée et qu'un ancien worker contrôle déjà la page
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          markUpdateReady(worker);
        }
      };

      worker.addEventListener('statechange', handleStateChange);
    };

    const handleUpdateFound = () => {
      if (!activeRegistration) return;
      attachStateListener(activeRegistration.installing);
    };

    // Rechargement unique lorsque le nouveau Service Worker prend le contrôle
    const handleControllerChange = () => {
      if (!hadControllerRef.current) {
        hadControllerRef.current = true;
        return;
      }
      if (hasReloadedRef.current) return;
      hasReloadedRef.current = true;
      setUpdateAvailable(false);
      waitingWorkerRef.current = null;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Enregistrement du fichier public/sw.js à la racine
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        if (!isMounted) return;
        activeRegistration = registration;
        registrationRef.current = registration;

        // Cas où un Service Worker est déjà en attente au démarrage
        if (registration.waiting && navigator.serviceWorker.controller) {
          markUpdateReady(registration.waiting);
        }

        // Cas où un nouveau worker est déjà en cours d'installation
        if (registration.installing) {
          attachStateListener(registration.installing);
        }

        registration.addEventListener('updatefound', handleUpdateFound);
      })
      .catch((err) => {
        console.warn('[PWA] Échec de l’enregistrement du Service Worker :', err);
      });

    // Vérification automatique quand l'utilisateur revient sur l'app (essentiel sur iOS PWA)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Vérification périodique toutes les 30 minutes tant que l'app reste ouverte
    const intervalId = window.setInterval(() => {
      if (registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
    }, AUTO_UPDATE_INTERVAL_MS);

    // Nettoyage complet des écouteurs et du timer au démontage
    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
      if (activeRegistration) {
        activeRegistration.removeEventListener('updatefound', handleUpdateFound);
      }
    };
  }, [markUpdateReady]);

  // Demande au Service Worker en attente de prendre le contrôle immédiatement
  const applyUpdate = useCallback(() => {
    const waitingWorker = waitingWorkerRef.current || registrationRef.current?.waiting;
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  // Recherche manuelle d'une nouvelle version depuis la page de réglages
  const checkForUpdate = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      setLastCheckStatus('unsupported');
      return false;
    }

    setIsChecking(true);
    try {
      const registration =
        registrationRef.current || (await navigator.serviceWorker.getRegistration('/'));

      if (!registration) {
        setLastCheckStatus('up-to-date');
        return false;
      }

      registrationRef.current = registration;

      // Si une mise à jour est déjà en attente, on la signale immédiatement
      if (registration.waiting && navigator.serviceWorker.controller) {
        markUpdateReady(registration.waiting);
        return true;
      }

      await registration.update();

      // Si un worker est en cours d'installation après update(), on attend qu'il soit installé
      if (registration.installing) {
        const found = await new Promise<boolean>((resolve) => {
          const worker = registration.installing!;
          const onState = () => {
            if (worker.state === 'installed') {
              worker.removeEventListener('statechange', onState);
              if (navigator.serviceWorker.controller) {
                markUpdateReady(worker);
                resolve(true);
              } else {
                resolve(false);
              }
            } else if (worker.state === 'redundant') {
              worker.removeEventListener('statechange', onState);
              resolve(false);
            }
          };
          worker.addEventListener('statechange', onState);
        });

        if (!found) {
          setLastCheckStatus('up-to-date');
        }
        return found;
      }

      if (registration.waiting && navigator.serviceWorker.controller) {
        markUpdateReady(registration.waiting);
        return true;
      }

      setLastCheckStatus('up-to-date');
      return false;
    } catch (err) {
      console.warn('[PWA] Erreur lors de la recherche de mise à jour :', err);
      setLastCheckStatus('error');
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [markUpdateReady]);

  return (
    <ServiceWorkerUpdateContext.Provider
      value={{
        updateAvailable,
        isChecking,
        lastCheckStatus,
        applyUpdate,
        checkForUpdate,
      }}
    >
      {children}
    </ServiceWorkerUpdateContext.Provider>
  );
}

/**
 * Hook permettant de lire l'état de mise à jour PWA et d'interagir avec le Service Worker
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateContextValue {
  const context = useContext(ServiceWorkerUpdateContext);
  if (!context) {
    throw new Error(
      'useServiceWorkerUpdate doit être utilisé à l’intérieur d’un ServiceWorkerUpdateProvider.'
    );
  }
  return context;
}
