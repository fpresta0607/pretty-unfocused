declare module 'modujs' {
  export interface ModuleOptions {
    el: HTMLElement;
    name: string;
    dataName: string;
  }

  export class module {
    constructor(options: ModuleOptions);
    el: HTMLElement;
    call(func: string, args?: unknown, mod?: string, id?: string): void;
    init(): void;
    destroy(): void;
  }

  type ModuleConstructor = new (options: ModuleOptions) => module;

  export default class ModularApp {
    constructor(options: { modules: Record<string, ModuleConstructor> });
    init(app: ModularApp, scope?: HTMLElement): void;
    destroy(scope?: HTMLElement): void;
  }
}
