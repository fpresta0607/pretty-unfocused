const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled])';

export interface DisclosureOptions {
  isModal: boolean;
  onChange?: (isOpen: boolean) => void;
}

export class Disclosure {
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private isOpen = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: DisclosureOptions,
  ) {
    const button = root.querySelector<HTMLButtonElement>('button[aria-controls]');
    const panelId = button?.getAttribute('aria-controls');
    const panel = panelId === undefined || panelId === null ? null : document.getElementById(panelId);
    if (button === null || panel === null) {
      throw new Error('A disclosure needs a button with aria-controls pointing at its panel');
    }
    this.button = button;
    this.panel = panel;

    this.button.addEventListener('click', this.handleButtonClick);
    this.panel.addEventListener('click', this.handlePanelClick);
    if (!options.isModal) {
      this.root.addEventListener('focusout', this.handleFocusOut);
    }
  }

  open(isKeyboard = false): void {
    if (this.isOpen) {
      return;
    }
    this.setOpen(true);
    this.panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus({ focusVisible: isKeyboard });
    window.addEventListener('keydown', this.handleKeydown);
    if (!this.options.isModal) {
      document.addEventListener('pointerdown', this.handlePointerDown);
    }
  }

  close(shouldRestoreFocus: boolean): void {
    if (!this.isOpen) {
      return;
    }
    this.setOpen(false);
    window.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('pointerdown', this.handlePointerDown);
    if (shouldRestoreFocus) {
      this.button.focus();
    }
  }

  destroy(): void {
    this.close(false);
    this.button.removeEventListener('click', this.handleButtonClick);
    this.panel.removeEventListener('click', this.handlePanelClick);
    this.root.removeEventListener('focusout', this.handleFocusOut);
  }

  private setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.root.toggleAttribute('data-open', isOpen);
    this.button.setAttribute('aria-expanded', String(isOpen));
    this.options.onChange?.(isOpen);
  }

  private readonly handleButtonClick = (event: MouseEvent): void => {
    if (this.isOpen) {
      this.close(true);
    } else {
      this.open(event.detail === 0);
    }
  };

  private readonly handlePanelClick = (event: Event): void => {
    if (event.target instanceof Element && event.target.closest('a[href]') !== null) {
      this.close(false);
    }
  };

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.close(true);
    }
  };

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.target instanceof Node && !this.root.contains(event.target)) {
      this.close(false);
    }
  };

  private readonly handleFocusOut = (event: FocusEvent): void => {
    if (event.relatedTarget instanceof Node && !this.root.contains(event.relatedTarget)) {
      this.close(false);
    }
  };
}
