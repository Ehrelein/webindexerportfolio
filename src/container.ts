interface FactoryEntry {
  factory: (container: Container) => any;
  singleton: boolean;
}

interface RegisterOptions {
  singleton?: boolean;
}

export class Container {
  private _services: Map<string, any>;
  private _singletons: Map<string, any>;
  private _factories: Map<string, FactoryEntry>;

  constructor() {
    this._services = new Map();
    this._singletons = new Map();
    this._factories = new Map();
  }

  register(name: string, factory: (container: Container) => any, options: RegisterOptions = {}): this {
    this._factories.set(name, { factory, singleton: options.singleton !== false });
    return this;
  }

  registerInstance(name: string, instance: any): this {
    this._singletons.set(name, instance);
    return this;
  }

  registerClass(name: string, Class: new (...args: any[]) => any, options: RegisterOptions = {}): this {
    this._factories.set(name, {
      factory: (...args) => new Class(...args),
      singleton: options.singleton !== false,
    });
    return this;
  }

  get(name: string): any {
    if (this._singletons.has(name)) {
      return this._singletons.get(name);
    }

    const entry = this._factories.get(name);
    if (!entry) {
      throw new Error(`Service '${name}' not registered`);
    }

    if (entry.singleton) {
      const instance = entry.factory(this);
      this._singletons.set(name, instance);
      return instance;
    }

    return entry.factory(this);
  }

  has(name: string): boolean {
    return this._singletons.has(name) || this._factories.has(name);
  }

  resolve(name: string): any {
    return this.get(name);
  }

  clear(): void {
    for (const [name, instance] of this._singletons) {
      if (typeof instance.destroy === "function") {
        instance.destroy();
      }
    }
    this._singletons.clear();
    this._factories.clear();
  }

  list(): string[] {
    return [
      ...this._singletons.keys(),
      ...[...this._factories.keys()].filter(k => !this._singletons.has(k)),
    ];
  }
}

export const container = new Container();
