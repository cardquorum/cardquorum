export { RoomManager } from './lib/room-manager.js';
export type { RoomState } from './lib/room-manager.js';
export {
  addMember,
  removeMember,
  reorderRoster,
  rotateSeat,
  rotateSeatV2,
  handleDisconnect,
  toggleReady,
  demotePlayer,
  demoteNotReadyPlayers,
  validateReorder,
} from './lib/roster-logic.js';
export type {
  GamePlugin,
  GameEventBase,
  ScheduledEvent,
  WithScheduledEvents,
  ApplyEventResult,
  PlayerStatRow,
} from './lib/game-plugin.js';
export type {
  FieldMode,
  ConfigFieldDef,
  SelectFieldDef,
  FieldMetadata,
  FieldRegistry,
  GenericConfigPreset,
  GameConfigPlugin,
} from './lib/game-config-types.js';
