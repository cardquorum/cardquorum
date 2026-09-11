import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BlockModule } from '../block/block.module.js';
import { ColorModule } from '../color/color.module.js';
import { FriendModule } from '../friend/friend.module.js';
import { GameModule } from '../game/game.module.js';
import { RoomController } from './room.controller.js';
import { RoomGateway } from './room.gateway.js';
import { RoomService } from './room.service.js';

@Module({
  imports: [AuthModule, BlockModule, ColorModule, FriendModule, forwardRef(() => GameModule)],
  controllers: [RoomController],
  providers: [RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
