import { type IncomingMessage } from 'http';
import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
} from '@nestjs/websockets';
import { type Server, type WebSocket } from 'ws';
import { WS_EMIT } from '@cardquorum/shared';
import { WsAuthGuard } from '../auth/ws-auth.guard.js';
import { WsConnectionService } from './ws-connection.service.js';

@WebSocketGateway({ path: '/ws' })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);

  @WebSocketServer()
  declare server: Server;

  constructor(
    private readonly wsAuthGuard: WsAuthGuard,
    private readonly connectionService: WsConnectionService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    // `authenticate` hits the database to validate the session cookie. An error
    // there must not escape this lifecycle hook: Nest does not catch it, so it
    // surfaces as an unhandled rejection instead of a closed socket, and a
    // transient database fault takes out connection handling entirely.
    let identity: Awaited<ReturnType<WsAuthGuard['authenticate']>>;
    try {
      identity = await this.wsAuthGuard.authenticate(request);
    } catch (err) {
      this.logger.error(`WS connection rejected: session lookup failed: ${err}`);
      client.close(1011, 'Internal error');
      return;
    }

    if (!identity) {
      this.logger.warn('WS connection rejected: invalid or missing token');
      client.close(4001, 'Unauthorized');
      return;
    }

    const tracked = this.connectionService.trackClient(client, identity);
    if (!tracked) {
      this.logger.warn(`WS connection rejected: too many connections for user ${identity.userId}`);
      client.close(4002, 'Too many connections');
      return;
    }
    this.logger.log(`Client connected: ${tracked.id} (user: ${identity.userId})`);
    client.send(JSON.stringify({ event: WS_EMIT.CONNECTED, data: {} }));
  }

  async handleDisconnect(client: WebSocket) {
    const tracked = await this.connectionService.notifyDisconnect(client);
    if (tracked) {
      this.logger.log(`Client disconnected: ${tracked.id}`);
    }
  }
}
