import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BlockModule } from '../block/block.module.js';
import { RoomModule } from '../room/room.module.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  imports: [AuthModule, BlockModule, RoomModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
