// Express router for /api/v1/loans endpoints (LEND, PAYMENT, LEDGER)
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import dbPromise from '../db.js';

const router = express.Router();

// POST /api/v1/loans - LEND
router.post('/', async (req, res) => {
  const { customer_id, loan_amount, loan_period_years, interest_rate_yearly } = req.body;
  if (!customer_id || !loan_amount || !loan_period_years || !interest_rate_yearly) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  try {
    const db = await dbPromise;
    // Check if customer exists
    const customer = await db.get('SELECT * FROM customers WHERE customer_id = ?', customer_id);
    if (!customer) {
      return res.status(400).json({ error: 'Customer does not exist.' });
    }
    // Calculations
    const P = Number(loan_amount);
    const N = Number(loan_period_years);
    const R = Number(interest_rate_yearly);
    const I = P * N * (R / 100);
    const A = P + I;
    const monthly_emi = +(A / (N * 12)).toFixed(2);
    const loan_id = uuidv4();
    await db.run(
      'INSERT INTO loans (loan_id, customer_id, principal_amount, total_amount, interest_rate, loan_period_years, monthly_emi, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [loan_id, customer_id, P, A, R, N, monthly_emi, 'ACTIVE']
    );
    res.status(201).json({
      loan_id,
      customer_id,
      total_amount_payable: A,
      monthly_emi
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/v1/loans/:loan_id/payments - PAYMENT
router.post('/:loan_id/payments', async (req, res) => {
  const { loan_id } = req.params;
  const { amount, payment_type } = req.body;
  if (!amount || !payment_type) {
    return res.status(400).json({ error: 'Missing amount or payment_type.' });
  }
  try {
    const db = await dbPromise;
    // Check if loan exists
    const loan = await db.get('SELECT * FROM loans WHERE loan_id = ?', loan_id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }
    // Calculate total paid so far
    const paidRow = await db.get('SELECT SUM(amount) as total_paid FROM payments WHERE loan_id = ?', loan_id);
    const amount_paid = paidRow.total_paid || 0;
    let balance = loan.total_amount - amount_paid;
    if (balance < 0) balance = 0;
    // Strictly prevent overpayment or extra payments after paid off
    if (balance === 0) {
      return res.status(400).json({ error: 'The required amount has already been paid. No further payments are necessary.' });
    }
    if (Number(amount) > balance) {
      return res.status(400).json({ error: 'Your payment amount is greater than the remaining balance.' });
    }
    // Insert payment
    const { v4: uuidv4 } = await import('uuid');
    const payment_id = uuidv4();
    await db.run(
      'INSERT INTO payments (payment_id, loan_id, amount, payment_type) VALUES (?, ?, ?, ?)',
      [payment_id, loan_id, amount, payment_type]
    );
    // Recalculate totals
    const newPaidRow = await db.get('SELECT SUM(amount) as total_paid FROM payments WHERE loan_id = ?', loan_id);
    const new_amount_paid = newPaidRow.total_paid || 0;
    let new_balance = loan.total_amount - new_amount_paid;
    if (new_balance < 0) new_balance = 0;
    let emis_left = Math.ceil(new_balance / loan.monthly_emi);
    if (new_balance === 0) {
      emis_left = 0;
      await db.run('UPDATE loans SET status = ? WHERE loan_id = ?', ['PAID_OFF', loan_id]);
    }
    res.json({
      payment_id,
      loan_id,
      message: 'Payment recorded successfully.',
      remaining_balance: new_balance,
      emis_left
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/v1/loans/:loan_id/ledger - LEDGER
router.get('/:loan_id/ledger', async (req, res) => {
  const { loan_id } = req.params;
  try {
    const db = await dbPromise;
    const loan = await db.get('SELECT * FROM loans WHERE loan_id = ?', loan_id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }
    const customer_id = loan.customer_id;
    const principal = loan.principal_amount;
    const total_amount = loan.total_amount;
    const monthly_emi = loan.monthly_emi;
    // Payments
    const payments = await db.all('SELECT * FROM payments WHERE loan_id = ? ORDER BY payment_date ASC', loan_id);
    const amount_paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    let balance_amount = total_amount - amount_paid;
    if (balance_amount < 0) balance_amount = 0;
    let emis_left = Math.ceil(balance_amount / monthly_emi);
    if (balance_amount === 0) emis_left = 0;
    // Transactions
    const transactions = payments.map(p => ({
      transaction_id: p.payment_id,
      date: p.payment_date,
      amount: Number(p.amount),
      type: p.payment_type
    }));
    res.json({
      loan_id,
      customer_id,
      principal: Number(principal),
      total_amount: Number(total_amount),
      monthly_emi: Number(monthly_emi),
      amount_paid: Number(amount_paid),
      balance_amount: Number(balance_amount),
      emis_left,
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router; 