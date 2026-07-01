import { db, generateId } from '../db/db';
import { db as firestoreDb } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp,
  getDocs,
  query,
  where,
  onSnapshot
} from 'firebase/firestore';
import { cleanUndefined } from '../utils/cleanData';

export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';

export class SyncService {
  private static instance: SyncService;
  private isProcessing = false;
  private onlineStatus = navigator.onLine;

  private constructor() {
    window.addEventListener('online', () => {
      this.onlineStatus = true;
      this.processQueue();
    });
    window.addEventListener('offline', () => {
      this.onlineStatus = false;
    });
  }

  static getInstance() {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  /**
   * Adds an operation to the sync queue and updates local syncStatus
   */
  async enqueue(collectionName: string, id: string, action: SyncAction, data: any) {
    await db.syncQueue.add({
      id: generateId(),
      collection: collectionName,
      action,
      data,
      timestamp: new Date().toISOString(),
      priority: 1,
      status: 'PENDING',
      attempts: 0
    });

    // Update local syncStatus if the item exists in the respective table
    const table = (db as any)[collectionName];
    if (table && action !== 'DELETE') {
      await table.update(id, { syncStatus: 'PENDING' });
    }

    if (this.onlineStatus) {
      this.processQueue();
    }
  }

  /**
   * Processes the synchronization queue
   */
  async processQueue() {
    if (this.isProcessing || !this.onlineStatus) return;
    this.isProcessing = true;

    try {
      const pendingItems = await db.syncQueue
        .where('status')
        .equals('PENDING')
        .sortBy('timestamp');

      if (pendingItems.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`Syncing ${pendingItems.length} items...`);

      // Process in batches of 50 (Firestore limit is 500, but let's be conservative)
      const batchSize = 50;
      for (let i = 0; i < pendingItems.length; i += batchSize) {
        const batchItems = pendingItems.slice(i, i + batchSize);
        const firestoreBatch = writeBatch(firestoreDb);

        for (const item of batchItems) {
          const docRef = doc(firestoreDb, item.collection, item.id);
          
          if (item.action === 'DELETE') {
            firestoreBatch.delete(docRef);
          } else {
            firestoreBatch.set(docRef, {
              ...cleanUndefined(item.data),
              lastSyncedAt: serverTimestamp(),
              syncStatus: 'SYNCED'
            }, { merge: true });
          }
        }

        await firestoreBatch.commit();

        // Update local status
        for (const item of batchItems) {
          await db.syncQueue.update(item.id, { status: 'SYNCING' }); // Intermediate state
          
          const table = (db as any)[item.collection];
          if (table && item.action !== 'DELETE') {
            await table.update(item.data.id, { 
              syncStatus: 'SYNCED',
              lastSyncedAt: new Date().toISOString()
            });
          }
          
          await db.syncQueue.delete(item.id);
        }
      }
      
      console.log('Sync completed successfully');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        console.warn('Sync delayed: Missing or insufficient permissions. User might not be approved yet.');
      } else {
        console.error('Sync error:', error);
      }
    } finally {
      this.isProcessing = false;
      
      // If there are still items, retry after a delay if online
      const remainingCount = await db.syncQueue.count();
      if (remainingCount > 0 && this.onlineStatus) {
        setTimeout(() => this.processQueue(), 10000); // 10s delay
      }
    }
  }

  /**
   * Initial synchronization of master data from Firestore to Dexie
   */
  async pullMasterData(collections: string[]) {
    for (const colName of collections) {
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, colName));
        const items = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          syncStatus: 'SYNCED'
        }));

        const table = (db as any)[colName];
        if (table) {
          await table.bulkPut(items);
        }
      } catch (error) {
        console.error(`Error pulling master data for ${colName}:`, error);
      }
    }
  }

  /**
   * Subscribes to real-time updates for specific collections
   */
  subscribeToUpdates(collectionName: string) {
    const q = query(collection(firestoreDb, collectionName));
    return onSnapshot(q, async (snapshot) => {
      const table = (db as any)[collectionName];
      if (!table) return;

      for (const change of snapshot.docChanges()) {
        const data = change.doc.data();
        const id = change.doc.id;

        if (change.type === 'removed') {
          await table.delete(id);
        } else {
          // Only update if local version is not pending sync to avoid overwriting user changes
          const localItem = await table.get(id);
          if (!localItem || localItem.syncStatus !== 'PENDING') {
            await table.put({
              ...data,
              id,
              syncStatus: 'SYNCED'
            });
          }
        }
      }
    });
  }
}

export const syncService = SyncService.getInstance();
