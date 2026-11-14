import { Injectable, NotFoundException } from '@nestjs/common';
import { Reading, Anomaly } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnomaliesService {
    constructor(private readonly prisma: PrismaService) {}

    async evaluate(reading: Reading): Promise<Anomaly | null> {
        if (reading.metric !== 'power_kw') {
            return null;
        }

        let severity: string | null = null;
        if (reading.value > 100) {
            severity = 'critical';
        } else if (reading.value > 50) {
            severity = 'warning';
        }

        if (!severity) { return null; }

        return await this.prisma.anomaly.create({
            data: {
                readingId: reading.id,
                severity,
                reason: `power_kw ${reading.value} exceeded threshold`,
            },
        });
    }

    async findAllForDevice(deviceId: string): Promise<Anomaly[]> {
        const device = await this.prisma.device.findUnique({
          where: { id: deviceId },
        });
        if (!device) {
          throw new NotFoundException(`Device ${deviceId} not found`);
        }
        return this.prisma.anomaly.findMany({
          where: { reading: { deviceId } },
          orderBy: { createdAt: 'desc' },
        });
      }
}