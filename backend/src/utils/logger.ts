interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  [key: string]: unknown;
}

export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  console.log(JSON.stringify(entry));
}
