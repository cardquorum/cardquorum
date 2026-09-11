import { Module } from '@nestjs/common';
import { SheepsheadReportRepository } from '@cardquorum/sheepshead/reporting';
import { AuthModule } from '../auth/auth.module.js';
import { DRIZZLE } from '../drizzle/drizzle.module.js';
import { ReportController } from './report.controller.js';
import { ReportService } from './report.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ReportController],
  providers: [
    {
      provide: SheepsheadReportRepository,
      useFactory: (db: any) => new SheepsheadReportRepository(db),
      inject: [DRIZZLE],
    },
    ReportService,
  ],
})
export class ReportModule {}
