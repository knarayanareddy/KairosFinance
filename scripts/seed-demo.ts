import Database from 'better-sqlite3';
import { join } from 'path';

/**
 * Seed Demo Script
 * Populates the Bunqsy database with high-fidelity realistic data.
 */
async function seedDemo() {
  const dbPath = join(process.cwd(), 'bunqsy.db');
  const db = new Database(dbPath);

  console.log('🌱 Seeding Bunqsy Demo Data...');

  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL,
      currency TEXT,
      description TEXT,
      category TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dna_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trait TEXT,
      score REAL,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert mock transactions
  const insertTx = db.prepare('INSERT INTO transactions (amount, currency, description, category) VALUES (?, ?, ?, ?)');
  
  const txs = [
    [-1227.24, 'EUR', 'Rent March 2024', 'Bills'],
    [-250.58, 'EUR', 'Albert Heijn', 'Groceries'],
    [2346.45, 'EUR', 'Salary - Google', 'Income'],
    [-460.34, 'EUR', 'Booking.com - Lisbon', 'Travel'],
    [-69.00, 'EUR', 'Netflix / Spotify', 'Subscriptions']
  ];

  txs.forEach(tx => insertTx.run(...tx));
  console.log(`✅ Inserted ${txs.length} transactions.`);

  // Insert DNA Traits
  const insertDna = db.prepare('INSERT INTO dna_profiles (trait, score) VALUES (?, ?)');
  
  const traits = [
    ['Frugality', 0.85],
    ['Investment Velocity', 0.62],
    ['Risk Appetite', 0.12]
  ];

  traits.forEach(trait => insertDna.run(...trait));
  console.log(`✅ Inserted ${traits.length} DNA traits.`);

  console.log('🚀 Seeding Complete. Dashboard ready for action.');
  db.close();
}

seedDemo();
