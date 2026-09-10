import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';
import type { GamePlugin } from '@cardquorum/engine';
import type { ReplayEventDto, ReplayParticipantDto } from '@cardquorum/shared';
import { GAME_ENGINE_PLUGINS, ReplayEngineService } from './replay-engine.service';

/**
 * A pass-through plugin. These properties are about navigation positions, not
 * game rules, so the engine only has to count events without rejecting them.
 * The cast is needed because `validateConfig` is declared as a type predicate.
 */
const STUB_PLUGIN = {
  gameType: 'sheepshead',
  validateConfig: () => true,
  createInitialState: (_config: unknown, userIDs: number[]) => ({
    phase: 'initial',
    players: userIDs.map((id) => ({ userID: id })),
    eventCount: 0,
  }),
  applyEvent: (_config: unknown, state: { eventCount: number }) => ({
    state: { ...state, eventCount: state.eventCount + 1 },
  }),
  getPlayerView: (_config: unknown, state: unknown) => state,
  getValidActions: () => [],
  isGameOver: () => false,
  buildStore: () => ({}),
} as unknown as GamePlugin;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [{ provide: GAME_ENGINE_PLUGINS, useValue: { sheepshead: STUB_PLUGIN } }],
  });
});

afterEach(() => {
  TestBed.resetTestingModule();
});

/** Generate a list of M non-synthetic replay events. */
function makeEvents(count: number): ReplayEventDto[] {
  return Array.from({ length: count }, (_, i) => ({
    eventType: 'play_card',
    userId: 1,
    payload: { index: i },
    message: `Event ${i + 1}`,
    seq: i + 1,
    createdAt: new Date(2024, 0, 1, 0, 0, i).toISOString(),
  }));
}

const PARTICIPANTS: ReplayParticipantDto[] = [
  { userId: 1, seatIndex: 0, displayName: 'Alice', username: 'alice' },
  { userId: 2, seatIndex: 1, displayName: 'Bob', username: 'bob' },
  { userId: 3, seatIndex: 2, displayName: 'Charlie', username: 'charlie' },
];

function initializeEngine(totalEvents: number): ReplayEngineService {
  const engine = TestBed.runInInjectionContext(() => new ReplayEngineService());
  const events = makeEvents(totalEvents);
  engine.initialize('sheepshead', {}, PARTICIPANTS, events, 1);
  return engine;
}

describe('Navigation position correctness', () => {
  // Arbitrary for totalEvents M (1..50) and currentPosition N (0..M)
  const totalAndPositionArb = fc
    .integer({ min: 1, max: 50 })
    .chain((m) => fc.tuple(fc.constant(m), fc.integer({ min: 0, max: m })));

  it('stepForward when N < M results in position N + 1', () => {
    fc.assert(
      fc.property(totalAndPositionArb, ([m, n]) => {
        // Only test when N < M (can step forward)
        fc.pre(n < m);

        const engine = initializeEngine(m);
        engine.goToPosition(n);
        expect(engine.currentPosition()).toBe(n);

        engine.stepForward();
        expect(engine.currentPosition()).toBe(n + 1);
      }),
      { numRuns: 100 },
    );
  });

  it('stepBackward when N > 0 results in position N - 1', () => {
    fc.assert(
      fc.property(totalAndPositionArb, ([m, n]) => {
        // Only test when N > 0 (can step backward)
        fc.pre(n > 0);

        const engine = initializeEngine(m);
        engine.goToPosition(n);
        expect(engine.currentPosition()).toBe(n);

        engine.stepBackward();
        expect(engine.currentPosition()).toBe(n - 1);
      }),
      { numRuns: 100 },
    );
  });

  it('jumpToStart always results in position 0', () => {
    fc.assert(
      fc.property(totalAndPositionArb, ([m, n]) => {
        const engine = initializeEngine(m);
        engine.goToPosition(n);

        engine.jumpToStart();
        expect(engine.currentPosition()).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('jumpToEnd always results in position M', () => {
    fc.assert(
      fc.property(totalAndPositionArb, ([m, n]) => {
        const engine = initializeEngine(m);
        engine.goToPosition(n);

        engine.jumpToEnd();
        expect(engine.currentPosition()).toBe(m);
      }),
      { numRuns: 100 },
    );
  });

  it('stepForward when N = M leaves position unchanged at M', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (m) => {
        const engine = initializeEngine(m);
        engine.goToPosition(m); // at end
        expect(engine.currentPosition()).toBe(m);

        engine.stepForward();
        expect(engine.currentPosition()).toBe(m); // unchanged
      }),
      { numRuns: 100 },
    );
  });

  it('stepBackward when N = 0 leaves position unchanged at 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (m) => {
        const engine = initializeEngine(m);
        engine.goToPosition(0); // at start
        expect(engine.currentPosition()).toBe(0);

        engine.stepBackward();
        expect(engine.currentPosition()).toBe(0); // unchanged
      }),
      { numRuns: 100 },
    );
  });
});
