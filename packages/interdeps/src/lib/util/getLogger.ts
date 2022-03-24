import debug from 'debug';

const rootLogger = debug('interdeps');
const subLoggers: Record<string, debug.Debugger> = {};

export function getLogger (subName: string): debug.Debugger {
  if (!(subName in subLoggers))
    subLoggers[subName] = rootLogger.extend(subName);
  return subLoggers[subName];
}
