import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReadingDto } from './dto/create-reading.dto';
import { Device, Reading } from '@prisma/client';
import { AnomaliesService } from '../anomalies/anomalies.service';
import { ListReadingsQueryDto } from './dto/list-readings-query.dto';
@Injectable()
export class ReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anomaliesService: AnomaliesService,
  ) {}

  async create(deviceId: string, dto: CreateReadingDto): Promise<Reading> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    const reading: Reading = await this.prisma.reading.create({
      data: {
        deviceId,
        metric: dto.metric,
        value: dto.value,
        ...(dto.recordedAt ? { recordedAt: new Date(dto.recordedAt) } : {}),
      },
    });
    await this.anomaliesService.evaluate(reading);
    return reading;
  }

  async findAllForDevice(
    deviceId: string,
    query: ListReadingsQueryDto,
  ): Promise<Reading[]> {
    const device: Device | null = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return await this.prisma.reading.findMany({
      where: {
        deviceId,
        ...(query.metric ? { metric: query.metric } : {}),
        ...(query.from || query.to
          ? {
              recordedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
