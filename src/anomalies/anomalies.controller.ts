import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { AnomaliesService } from './anomalies.service';
import { Anomaly } from '@prisma/client';

@Controller('devices')
export class AnomaliesController {
  constructor(private readonly anomaliesService: AnomaliesService) {}

  @Get(':deviceId/anomalies')
  async findAllForDevice(
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ): Promise<Anomaly[]> {
    return await this.anomaliesService.findAllForDevice(deviceId);
  }
}
