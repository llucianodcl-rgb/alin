import { db, generateId } from '../db/db';
import { AuditLog } from '../types';

class AuditService {
  async log(logData: Omit<AuditLog, 'id' | 'timestamp'>) {
    try {
      const dataToSave = {
        id: generateId(),
        ...logData,
        timestamp: new Date().toISOString()
      };
      
      // Removing undefined values for Dexie (optional but good practice)
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key as keyof typeof dataToSave] === undefined) {
          delete dataToSave[key as keyof typeof dataToSave];
        }
      });
      
      await db.auditLogs.add(dataToSave as AuditLog);
    } catch (error) {
      console.error('Failed to log audit event', error);
    }
  }
}

export const auditService = new AuditService();
