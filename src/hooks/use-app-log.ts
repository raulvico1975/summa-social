
'use client';

import { useState, createContext, useContext, useCallback } from 'react';

interface LogMessage {
  id: number;
  timestamp: string;
  message: string;
}

interface AppLogContextType {
  logs: LogMessage[];
  log: (message: string) => void;
  clearLogs: () => void;
}

const AppLogContext = createContext<AppLogContextType>({
  logs: [],
  log: () => {},
  clearLogs: () => {},
});

let logCounter = 0;

export const AppLogProvider = ({ children }: { children: React.ReactNode }) => {
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const log = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newLog: LogMessage = {
      id: logCounter++,
      timestamp,
      message,
    };
    setLogs((prevLogs) => [...prevLogs, newLog]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <AppLogContext.Provider value={{ logs, log, clearLogs }}>
      {children}
    </AppLogContext.Provider>
  );
};

export const useAppLog = () => useContext(AppLogContext);
