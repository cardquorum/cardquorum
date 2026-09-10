import { vi } from 'vitest';

/*
 * TestBed initialisation is handled by @angular/build:unit-test, which
 * generates its own setup file. It already passes errorOnUnknownElements and
 * errorOnUnknownProperties, and it only wires in provideZoneChangeDetection
 * when zone.js resolves — which it does not here, so the tests stay zoneless.
 */

// jsdom has no matchMedia; ThemeService uses it to detect the OS colour scheme.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom's localStorage can be non-functional when @angular/build:unit-test
// launches Vitest workers with --localstorage-file pointing at a missing path.
// Provide a simple in-memory stub so ThemeService and any spec that exercises
// localStorage works correctly in every isolated test file.
if (typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
    },
  });
}

// ng2-charts calls HTMLCanvasElement.getContext() during construction.
// jsdom does not implement canvas; stub getContext to return a minimal 2d context
// so components that render charts do not throw in tests.
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Array(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  canvas: {},
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;
