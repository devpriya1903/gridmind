import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReadingDto } from './dto/create-reading.dto';

@Injectable()
export class ReadingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(deviceId: string, dto: CreateReadingDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return this.prisma.reading.create({
      data: {
        deviceId,
        metric: dto.metric,
        value: dto.value,
        ...(dto.recordedAt ? { recordedAt: new Date(dto.recordedAt) } : {}),
      },
    });
  }

  async findAllForDevice(deviceId: string) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      throw new NotFoundException(`Device ${deviceId} not found`);
    }

    return this.prisma.reading.findMany({
      where: { deviceId },
      orderBy: { recordedAt: 'desc' },
    });
  }
}
