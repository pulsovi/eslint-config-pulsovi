import { exec } from 'child_process';
import { promisify } from 'util';

export async function cmdOut (cmd: string): Promise<string> {
  return (await promisify(exec)(cmd)).stdout.slice(0, -1);
}
