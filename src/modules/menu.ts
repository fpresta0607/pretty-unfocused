import { module as Module } from 'modujs';

import { Disclosure } from './disclosure.ts';

export class Menu extends Module {
  private disclosure: Disclosure | undefined;

  init(): void {
    this.disclosure = new Disclosure(this.el, {
      isModal: true,
      onChange: (isOpen) => {
        document.documentElement.toggleAttribute('data-menu-open', isOpen);
        document.querySelectorAll<HTMLElement>('[data-inert-on-menu]').forEach((element) => {
          element.inert = isOpen;
        });
      },
    });
  }

  destroy(): void {
    this.disclosure?.destroy();
  }
}
