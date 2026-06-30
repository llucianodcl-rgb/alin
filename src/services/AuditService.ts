import { auditRepository } from '../db/repository';
import { AuditLog } from '../types';

class AuditService {
  async log(logData: Omit<AuditLog, 'id' | 'timestamp' | 'createdAt' | 'updatedAt'>) {
    try {
      await auditRepository.add({
        ...logData,
        timestamp: new Date().toISOString()
      } as any);
    } catch (error) {
      console.error('Failed to log audit event', error);
    }
  }
}

export const auditService = new AuditService();
