import { db as firestoreDb } from '../lib/firebase';
import { 
  doc, 
  updateDoc, 
  increment, 
  getDoc, 
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { GlobalStats } from '../types';

export class StatsService {
  private static instance: StatsService;
  private statsDocRef = doc(firestoreDb, 'statistics', 'global');

  private constructor() {}

  static getInstance() {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  async getStats(): Promise<GlobalStats | null> {
    const snap = await getDoc(this.statsDocRef);
    if (snap.exists()) {
      return snap.data() as GlobalStats;
    }
    return null;
  }

  /**
   * Increment or decrement specific metrics atomically in Firestore
   */
  async updateMetrics(updates: Partial<Record<keyof GlobalStats, number>>) {
    const incrementFields: any = {
      lastUpdated: serverTimestamp()
    };

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'number') {
        incrementFields[key] = increment(value);
      }
    }

    try {
      await updateDoc(this.statsDocRef, incrementFields);
    } catch (error) {
      // If doc doesn't exist, initialize it
      console.warn('Stats document not found, initializing...');
      await this.initializeStats();
      await updateDoc(this.statsDocRef, incrementFields);
    }
  }

  private async initializeStats() {
    const initialStats: GlobalStats = {
      id: 'global',
      totalProducts: 0,
      expiredProducts: 0,
      nearExpirationProducts: 0,
      lowStockProducts: 0,
      totalStockValue: 0,
      monthlyRevenue: 0,
      monthlyExpenses: 0,
      monthlyProfit: 0,
      totalEmployees: 0,
      activeEvents: 0,
      unresolvedInventories: 0,
      criticalInvestigations: 0,
      lastUpdated: new Date().toISOString()
    };
    await setDoc(this.statsDocRef, initialStats);
  }

  /**
   * Re-calculate stats from scratch (only used for repair/initialization)
   * This is heavy and should be used sparingly.
   */
  async forceRecalculate() {
    // This would fetch all products, expenses, etc. and sum them up.
    // Given the "don't read thousands" rule, we should avoid this in normal flow.
  }
}

export const statsService = StatsService.getInstance();
