'use client';

export type LogoutSyncReason = 'manual' | 'idle' | 'max_session' | 'access_denied';

type LogoutSyncEvent = {
  type: 'logout';
  eventId: string;
  issuedAt: number;
  reason: LogoutSyncReason;
  sourceTabId: string;
};

const LOGOUT_SYNC_CHANNEL = 'summa-social-auth';
const LOGOUT_SYNC_STORAGE_KEY = 'summa-social:auth:logout';
const TAB_ID_STORAGE_KEY = 'summa-social:tab-id';

let fallbackTabId: string | null = null;

function isClient(): boolean {
  return typeof window !== 'undefined';
}

function createLogoutEvent(reason: LogoutSyncReason): LogoutSyncEvent {
  return {
    type: 'logout',
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    issuedAt: Date.now(),
    reason,
    sourceTabId: getTabId(),
  };
}

function createRandomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getTabId(): string {
  if (!isClient()) {
    return 'server';
  }

  try {
    const existing = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY);
    if (existing) {
      return existing;
    }

    const created = createRandomId();
    window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, created);
    return created;
  } catch {
    if (!fallbackTabId) {
      fallbackTabId = createRandomId();
    }

    return fallbackTabId;
  }
}

function openLogoutChannel(): BroadcastChannel | null {
  if (!isClient() || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  return new BroadcastChannel(LOGOUT_SYNC_CHANNEL);
}

function parseLogoutEvent(raw: string | null): LogoutSyncEvent | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LogoutSyncEvent>;
    if (
      parsed.type !== 'logout' ||
      typeof parsed.eventId !== 'string' ||
      typeof parsed.reason !== 'string' ||
      typeof parsed.sourceTabId !== 'string'
    ) {
      return null;
    }

    return {
      type: 'logout',
      eventId: parsed.eventId,
      issuedAt: typeof parsed.issuedAt === 'number' ? parsed.issuedAt : Date.now(),
      reason: parsed.reason as LogoutSyncReason,
      sourceTabId: parsed.sourceTabId,
    };
  } catch {
    return null;
  }
}

export function broadcastLogoutSync(reason: LogoutSyncReason = 'manual'): void {
  if (!isClient()) {
    return;
  }

  const event = createLogoutEvent(reason);

  try {
    window.localStorage.setItem(LOGOUT_SYNC_STORAGE_KEY, JSON.stringify(event));
  } catch {
    // Ignorem errors d'emmagatzematge per no bloquejar el logout.
  }

  const channel = openLogoutChannel();
  if (!channel) {
    return;
  }

  try {
    channel.postMessage(event);
  } finally {
    channel.close();
  }
}

export function subscribeToLogoutSync(onLogout: (event: LogoutSyncEvent) => void): () => void {
  if (!isClient()) {
    return () => {};
  }

  let lastEventId: string | null = null;
  const currentTabId = getTabId();

  const handleEvent = (event: LogoutSyncEvent | null) => {
    if (!event || event.eventId === lastEventId || event.sourceTabId === currentTabId) {
      return;
    }

    lastEventId = event.eventId;
    onLogout(event);
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== LOGOUT_SYNC_STORAGE_KEY) {
      return;
    }

    handleEvent(parseLogoutEvent(event.newValue));
  };

  window.addEventListener('storage', handleStorage);

  const channel = openLogoutChannel();
  const handleMessage = (event: MessageEvent<LogoutSyncEvent>) => {
    handleEvent(event.data);
  };

  channel?.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (!channel) {
      return;
    }

    channel.removeEventListener('message', handleMessage);
    channel.close();
  };
}
