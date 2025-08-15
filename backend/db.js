import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({
  filename: './bank.db',
  driver: sqlite3.Database
});

export async function initDb() {
  const db = await dbPromise;
  // Customers
  await db.exec(`CREATE TABLE IF NOT EXISTS customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  // Loans
  await db.exec(`CREATE TABLE IF NOT EXISTS loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT,
    principal_amount DECIMAL,
    total_amount DECIMAL,
    interest_rate DECIMAL,
    loan_period_years INTEGER,
    monthly_emi DECIMAL,
    status TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
  )`);
  // Payments
  await db.exec(`CREATE TABLE IF NOT EXISTS payments (
    payment_id TEXT PRIMARY KEY,
    loan_id TEXT,
    amount DECIMAL,
    payment_type TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
  )`);
}

export async function clearDb() {
  const db = await dbPromise;
  await db.exec('DELETE FROM payments');
  await db.exec('DELETE FROM loans');
  await db.exec('DELETE FROM customers');
}

export default dbPromise; 