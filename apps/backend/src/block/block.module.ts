import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BlockController } from './block.controller.js';
import { BlockService } from './block.service.js';

@Module({
  imports: [AuthModule],
  controllers: [BlockController],
  providers: [BlockService],
  exports: [BlockService],
})
export class BlockModule {}
