import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WsConnectionService } from './ws-connection.service.js';
import { WsGateway } from './ws.gateway.js';

@Global()
@Module({
  imports: [AuthModule],
  providers: [WsConnectionService, WsGateway],
  exports: [WsConnectionService],
})
export class WsModule {}
