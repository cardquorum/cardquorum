import { type IncomingMessage } from 'http';
import { type WebSocket } from 'ws';
import { WS_EMIT } from '@cardquorum/shared';
import { type WsAuthGuard } from '../auth/ws-auth.guard.js';
import { type WsConnectionService } from './ws-connection.service.js';
import { WsGateway } from './ws.gateway.js';

describe('WsGateway', () => {
  let gateway: WsGateway;
  let authGuard: { authenticate: ReturnType<typeof vi.fn> };
  let connectionService: {
    trackClient: ReturnType<typeof vi.fn>;
    notifyDisconnect: ReturnType<typeof vi.fn>;
  };

  const identity = { userId: 1, username: 'alice', displayName: 'Alice' };
  const request = {} as IncomingMessage;

  const createMockWs = () => ({ send: vi.fn(), close: vi.fn() }) as unknown as WebSocket;

  beforeEach(() => {
    authGuard = { authenticate: vi.fn() };
    connectionService = { trackClient: vi.fn(), notifyDisconnect: vi.fn() };
    gateway = new WsGateway(
      authGuard as unknown as WsAuthGuard,
      connectionService as unknown as WsConnectionService,
    );
  });

  describe('handleConnection', () => {
    it('should accept an authenticated client and emit CONNECTED', async () => {
      authGuard.authenticate.mockResolvedValue(identity);
      connectionService.trackClient.mockReturnValue({ id: 'conn-1', identity });
      const client = createMockWs();

      await gateway.handleConnection(client, request);

      expect(client.close).not.toHaveBeenCalled();
      expect(client.send).toHaveBeenCalledWith(
        JSON.stringify({ event: WS_EMIT.CONNECTED, data: {} }),
      );
    });

    it('should close with 4001 when the session is invalid', async () => {
      authGuard.authenticate.mockResolvedValue(null);
      const client = createMockWs();

      await gateway.handleConnection(client, request);

      expect(client.close).toHaveBeenCalledWith(4001, 'Unauthorized');
      expect(connectionService.trackClient).not.toHaveBeenCalled();
    });

    it('should close with 4002 when the user has too many connections', async () => {
      authGuard.authenticate.mockResolvedValue(identity);
      connectionService.trackClient.mockReturnValue(null);
      const client = createMockWs();

      await gateway.handleConnection(client, request);

      expect(client.close).toHaveBeenCalledWith(4002, 'Too many connections');
      expect(client.send).not.toHaveBeenCalled();
    });

    /*
     * `authenticate` queries the database to validate the session cookie. Nest
     * does not catch throws from a lifecycle hook, so without the guard in
     * handleConnection a transient database fault escapes as an unhandled
     * rejection and takes out connection handling rather than closing the
     * socket. This test is the regression guard for that.
     */
    it('should close with 1011 and not reject when the session lookup throws', async () => {
      authGuard.authenticate.mockRejectedValue(new Error('DB connection lost'));
      const client = createMockWs();

      await expect(gateway.handleConnection(client, request)).resolves.toBeUndefined();

      expect(client.close).toHaveBeenCalledWith(1011, 'Internal error');
      expect(connectionService.trackClient).not.toHaveBeenCalled();
      expect(client.send).not.toHaveBeenCalled();
    });
  });
});
