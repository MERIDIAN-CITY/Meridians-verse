import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './audit-log.entity';

export interface AuditContext {
  entityName: string;
  entityId?: string | number | null;
  action: AuditAction;
  performedById?: number | null;
  performedByEmail?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(ctx: AuditContext): Promise<void> {
    const entry = this.auditRepo.create({
      entityName: ctx.entityName,
      entityId: ctx.entityId != null ? String(ctx.entityId) : null,
      action: ctx.action,
      performedById: ctx.performedById ?? null,
      performedByEmail: ctx.performedByEmail ?? null,
      previousValues: ctx.previousValues ?? null,
      newValues: ctx.newValues ?? null,
      ipAddress: ctx.ipAddress ?? null,
    });
    await this.auditRepo.save(entry);
  }
}
