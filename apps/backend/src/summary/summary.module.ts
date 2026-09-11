import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SummaryController } from './summary.controller.js';
import { SummaryService } from './summary.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SummaryController],
  providers: [SummaryService],
})
export class SummaryModule {}
