
'use client';

import { createContext, useContext } from 'react';

export interface LogMessage {
  id: number;
  timestamp: string;
  message: string;
}

interface AppLogContextType {
  logs: LogMessage[];
  log: (message: string) => void;
  clearLogs: () => void;
}

export const AppLogContext = createContext<AppLogContextType>({
  logs: [],
  log: () => {},
  clearLogs: () => {},
});


export const useAppLog = () => useContext(AppLogContext);
