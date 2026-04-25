import isomorphicSqlite3 from 'better-sqlite3';
import { join } from 'path';
import { unlinkSync, existsSync } from 'fs';

/**
 * Reset Demo Script
 * COMPLETELY WIPES the database to ensure a clean state for presentations.
 */
async function resetDemo() {
  console.log('🧹 Preparing for a clean Bunqsy Demo...');
  
  const dbPath = join(process.cwd(), 'bunqsy.db');
  const walPath = join(process.cwd(), 'bunqsy.db-wal');
  const shmPath = join(process.cwd(), 'bunqsy.db-shm');

  const paths = [dbPath, walPath, shmPath];

  paths.forEach(path => {
    if (existsSync(path)) {
      try {
        unlinkSync(path);
        console.log(`✅ Removed: ${path}`);
      } catch (err) {
        console.error(`❌ Failed to remove ${path}:`, err);
      }
    }
  });

  console.log('✨ Environment Reset. Ready for Seed.');
}

resetDemo();
