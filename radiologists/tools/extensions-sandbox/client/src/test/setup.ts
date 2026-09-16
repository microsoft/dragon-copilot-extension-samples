import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// The Adaptive Cards renderer is code-split behind React.lazy, so the first
// assertion that waits for a card also waits for Vite to transform the real
// ~1 MB adaptivecards bundle. That routinely exceeds the 1s default.
configure({ asyncUtilTimeout: 10_000 });

// Fluent UI and the Adaptive Cards renderer both probe browser APIs that jsdom
// does not implement. Stub them once so component tests do not have to.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom does not implement innerText, which the Adaptive Cards renderer uses to
// set TextBlock content. Without this, cards render structurally but with no
// visible text.
if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerText')) {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get(this: HTMLElement) {
      return this.textContent ?? '';
    },
    set(this: HTMLElement, value: string) {
      this.textContent = value;
    },
  });
}

afterEach(() => {
  cleanup();
});
