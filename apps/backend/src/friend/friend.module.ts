import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BlockModule } from '../block/block.module.js';
import { FriendController } from './friend.controller.js';
import { FriendService } from './friend.service.js';

@Module({
  imports: [AuthModule, BlockModule],
  controllers: [FriendController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
