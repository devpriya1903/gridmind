import { Module } from '@nestjs/common';
import { ReadingsController } from './readings.controller';
import { ReadingsService } from './readings.service';
import { AnomaliesModule } from '../anomalies/anomalies.module';

@Module({
  controllers: [ReadingsController],
  providers: [ReadingsService],
  imports: [AnomaliesModule],
})
export class ReadingsModule {}
