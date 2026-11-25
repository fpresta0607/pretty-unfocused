import { module as Module } from 'modujs';

import { Disclosure } from './disclosure.ts';

export class Listen extends Module {
  private disclosure: Disclosure | undefined;

  init(): void {
    this.disclosure = new Disclosure(this.el, { isModal: false });
  }

  destroy(): void {
    this.disclosure?.destroy();
  }
}
