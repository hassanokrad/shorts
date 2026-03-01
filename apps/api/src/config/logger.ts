type Meta = Record<string, unknown>;

const formatMessage = (level: string, message: string, meta?: Meta): void => {
  const payload = {
    level,
    message,
    ...(meta ? { meta } : {})
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (message: string, meta?: Meta): void => formatMessage('info', message, meta),
  warn: (message: string, meta?: Meta): void => formatMessage('warn', message, meta),
  error: (message: string, meta?: Meta): void => formatMessage('error', message, meta)
};
