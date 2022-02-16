import indent from 'indent-string';

import { indent as INDENT } from './config';

export default class Messager {
  private readonly stack: string[] = [];
  private readonly header?: string;

  public constructor (header?: string) {
    this.header = header;
  }

  public get length (): number {
    return this.stack.length;
  }

  public push (text: Messager | string | null): this {
    if (typeof text === 'string') this.stack.push(text);
    if (text instanceof Messager) this.push(text.toString());
    return this;
  }

  public prompt (): this {
    const str = this.toString();
    if (str) console.info(str);
    return this;
  }

  public toString (): string | null {
    if (!this.stack.length) return null;
    if (this.header) return `${this.header}\n${indent(this.stack.join('\n'), INDENT)}`;
    return this.stack.join('\n');
  }
}
