export { WS_EVENT, WS_EMIT } from './lib/ws-events.js';
export type {
  UserIdentity,
  JoinRoomPayload,
  LeaveRoomPayload,
  SendMessagePayload,
  RoomJoinedPayload,
  MemberChangePayload,
  MemberKickedPayload,
  ChatMessagePayload,
  MessageHistoryPayload,
  RoomDeletedPayload,
  WsErrorPayload,
  GameCreatePayload,
  GameStartPayload,
  GameActionPayload,
  GameRejoinPayload,
  GameCancelPayload,
  GameCreatedPayload,
  GameStartedPayload,
  GameStateUpdatePayload,
  GameOverPayload,
  GameErrorPayload,
  GameCancelledPayload,
  LeaveRosterPayload,
  RosterReorderPayload,
  RosterToggleRotatePayload,
} from './lib/ws-types.js';
export type {
  Room,
  RoomVisibility,
  RoomResponse,
  CreateRoomRequest,
  UpdateRoomRequest,
  PaginatedResponse,
  RoomMemberInfo,
  RoomInviteResponse,
  RoomBanResponse,
  InviteUserRequest,
  BanUserRequest,
  RosterSection,
  RosterMember,
  RotationMode,
  RosterState,
  RosterUpdatePayload,
  UpdateRosterRequest,
  KickUserRequest,
  RoomGameSettings,
  RosterToggleReadyPayload,
  GameAbandonPayload,
  RosterSetRotationModePayload,
  GameSettingsUpdatePayload,
  GameSettingsUpdatedPayload,
  GameSettingsLoadedPayload,
} from './lib/room-types.js';
export type {
  AuthMethod,
  AuthStrategy,
  CredentialsResponse,
  LinkBasicCredentialRequest,
  LoginRequest,
  RegisterRequest,
  SessionIdentity,
  StrategiesResponse,
  UnlinkBasicCredentialRequest,
  ChangePasswordRequest,
} from './lib/auth-types.js';
export type { GameType, GameSessionStatus } from './lib/game-types.js';
export type {
  UserProfile,
  UserSearchResult,
  UpdateUsernameRequest,
  UpdateDisplayNameRequest,
  DeleteAccountRequest,
} from './lib/user-types.js';
export type { FriendshipResponse } from './lib/friend-types.js';
export type { FriendRequestBody, FriendRequestResponse } from './lib/friend-request-types.js';
export type { BlockedUserResponse, BlockUserRequest } from './lib/block-types.js';
export type {
  GameLogBroadcast,
  EventBufferEntry,
  GameLogHistoryPayload,
} from './lib/game-log-types.js';
export type {
  CardAsset,
  SeatInfo,
  TrickPlayView,
  StatusItem,
  StatusBarConfig,
  GameTablePlugin,
  SeatBadge,
  BadgeColor,
  BadgePosition,
} from './lib/game-table-types.js';
export {
  USERNAME_MIN,
  USERNAME_MAX,
  USERNAME_PATTERN,
  DISPLAY_NAME_MAX,
  PASSWORD_MIN,
  PASSWORD_MAX,
  isValidUsername,
} from './lib/validation.js';

export { PALETTE_HUES } from './lib/color-types.js';
export type { ColorAssignmentMap } from './lib/color-types.js';
export {
  circularHueDistance,
  minimumDistanceThreshold,
  isValidPaletteHue,
  hueToHsl,
} from './lib/color-utils.js';

export type {
  ReplayEventDto,
  ReplayParticipantDto,
  ReplayDataResponse,
  ReplaySessionSummary,
  ReplaySessionListResponse,
} from './lib/replay-types.js';

export type { SummaryParticipantDto, SummaryDataResponse } from './lib/summary-types.js';

export type {
  PlayerStatRow,
  RoomStatsPlayerDto,
  RoomStatsResponse,
  PlayerStatsResponse,
  StatsQueryParams,
} from './lib/stats-types.js';

export type {
  ReportDescriptor,
  ReportFilters,
  GameReportRepository,
  GameReportPlugin,
  RatioStat,
  AverageStat,
  ScoreTrajectoryPoint,
  SheepsheadReportPayload,
} from './lib/report-types.js';
