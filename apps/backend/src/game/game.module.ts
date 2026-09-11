import { forwardRef, Module } from '@nestjs/common';
import { RoomModule } from '../room/room.module.js';
import { StatsModule } from '../stats/stats.module.js';
import { EventLogService } from './event-log.service.js';
import { GameGateway } from './game.gateway.js';
import { GameService } from './game.service.js';

@Module({
  imports: [forwardRef(() => RoomModule), StatsModule],
  providers: [GameService, GameGateway, EventLogService],
  exports: [GameService],
})
export class GameModule {}
