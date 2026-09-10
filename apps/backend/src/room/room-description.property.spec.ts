import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as fc from 'fast-check';
import { type Mock } from 'vitest';
import { WsConnectionService } from '../ws/ws-connection.service';
import { CreateRoomDto, UpdateRoomDto } from './room.dto';
import { RoomService } from './room.service';

/**
 * For any valid room description (null, empty string, or string up to 256 characters
 * including unicode), creating or updating a room with that description and then reading
 * the room back should return the exact same description value.
 */
describe('Description round-trip persistence', () => {
  let service: RoomService;

  const now = new Date('2026-01-01T00:00:00Z');

  const makeRoom = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    name: 'Test Room',
    description: null as string | null,
    ownerId: 1,
    ownerDisplayName: 'Alice',
    ownerUsername: 'alice',
    visibility: 'public',
    memberLimit: null,
    rotatePlayers: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  let mockRepo: Record<string, Mock>;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const connectionService = new WsConnectionService();

    service = new RoomService(
      mockRepo as any,
      {
        findInvitedRoomIds: vi.fn(),
        isInvited: vi.fn(),
        findByRoom: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        delete: vi.fn(),
      } as any,
      {
        findBannedRoomIds: vi.fn(),
        isBanned: vi.fn(),
        findByRoom: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      } as any,
      {
        findByRoom: vi.fn().mockResolvedValue([]),
        addMember: vi.fn(),
        removeMember: vi.fn(),
        replaceRoster: vi.fn(),
        countMembers: vi.fn().mockResolvedValue(0),
        isMember: vi.fn().mockResolvedValue(false),
        getAssignedHues: vi.fn().mockResolvedValue([]),
        setAssignedHue: vi.fn(),
        updateLastVisitedAt: vi.fn(),
      } as any,
      { findByRoomId: vi.fn().mockResolvedValue([]) } as any,
      { findByRoomId: vi.fn().mockResolvedValue(null), upsert: vi.fn() } as any,
      connectionService,
      { areFriends: vi.fn(), findFriendIds: vi.fn() } as any,
      {
        getBlockedIds: vi.fn().mockResolvedValue([]),
        isBlocked: vi.fn().mockResolvedValue(false),
      } as any,
      { assignHue: vi.fn().mockReturnValue(0) } as any,
      { getColorPreference: vi.fn().mockResolvedValue(null) } as any,
      { isGameActive: vi.fn().mockReturnValue(false) } as any,
    );
  });

  const descriptionArb = fc.option(fc.string({ minLength: 0, maxLength: 256 }), { nil: null });

  it('should preserve description unchanged through create', async () => {
    await fc.assert(
      fc.asyncProperty(descriptionArb, async (description) => {
        mockRepo['create'].mockResolvedValue(makeRoom({ description }));

        const result = await service.create('Test Room', 1, 'public', undefined, description);

        expect(result.description).toBe(description);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve description unchanged through update', async () => {
    await fc.assert(
      fc.asyncProperty(descriptionArb, async (description) => {
        mockRepo['update'].mockResolvedValue(makeRoom({ description }));

        const result = await service.update(1, { description });

        expect(result.description).toBe(description);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve description unchanged through findById', async () => {
    await fc.assert(
      fc.asyncProperty(descriptionArb, async (description) => {
        mockRepo['findById'].mockResolvedValue(makeRoom({ description }));

        const result = await service.findById(1);

        expect(result!.description).toBe(description);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * For any string with length greater than 256 characters, attempting to create or update
 * a room with that string as the description should be rejected with a validation error.
 */
describe('Description length validation', () => {
  const longStringArb = fc.string({ minLength: 257, maxLength: 500 });

  it('should reject CreateRoomDto with description exceeding 256 characters', async () => {
    await fc.assert(
      fc.asyncProperty(longStringArb, async (description) => {
        const dto = plainToInstance(CreateRoomDto, {
          name: 'Valid Room',
          description,
        });

        const errors = await validate(dto);

        const descriptionError = errors.find((e) => e.property === 'description');
        expect(descriptionError).toBeDefined();
        expect(descriptionError!.constraints).toHaveProperty('maxLength');
      }),
      { numRuns: 100 },
    );
  });

  it('should reject UpdateRoomDto with description exceeding 256 characters', async () => {
    await fc.assert(
      fc.asyncProperty(longStringArb, async (description) => {
        const dto = plainToInstance(UpdateRoomDto, { description });

        const errors = await validate(dto);

        const descriptionError = errors.find((e) => e.property === 'description');
        expect(descriptionError).toBeDefined();
        expect(descriptionError!.constraints).toHaveProperty('maxLength');
      }),
      { numRuns: 100 },
    );
  });

  it('should accept CreateRoomDto with description at exactly 256 characters', async () => {
    const dto = plainToInstance(CreateRoomDto, {
      name: 'Valid Room',
      description: 'a'.repeat(256),
    });

    const errors = await validate(dto);
    const descriptionError = errors.find((e) => e.property === 'description');

    expect(descriptionError).toBeUndefined();
  });

  it('should accept UpdateRoomDto with no description', async () => {
    const dto = plainToInstance(UpdateRoomDto, { name: 'Valid Room' });

    const errors = await validate(dto);
    const descriptionError = errors.find((e) => e.property === 'description');

    expect(descriptionError).toBeUndefined();
  });
});
