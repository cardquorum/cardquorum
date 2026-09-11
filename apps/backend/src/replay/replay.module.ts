import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReplayController } from './replay.controller.js';
import { ReplayService } from './replay.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReplayController],
  providers: [ReplayService],
})
export class ReplayModule {}
