import express from 'express';
import dbPromise from '../db.js';

const router = express.Router();

// POST /api/v1/customers - Create a new customer
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  try {
    const { v4: uuidv4 } = await import('uuid');
    const customer_id = uuidv4();
    const db = await dbPromise;
    await db.run('INSERT INTO customers (customer_id, name) VALUES (?, ?)', [customer_id, name]);
    res.status(201).json({ customer_id, name });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/v1/customers - List all customers
router.get('/', async (req, res) => {
  try {
    const db = await dbPromise;
    const customers = await db.all('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/v1/customers/:customer_id/overview - ACCOUNT OVERVIEW
router.get('/:customer_id/overview', async (req, res) => {
  const { customer_id } = req.params;
  try {
    const db = await dbPromise;
    // Check if customer exists
    const customer = await db.get('SELECT * FROM customers WHERE customer_id = ?', customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    // Get all loans
    const loans = await db.all('SELECT * FROM loans WHERE customer_id = ?', customer_id);
    if (!loans || loans.length === 0) {
      return res.status(404).json({ error: 'No loans found for this customer.' });
    }
    // For each loan, calculate amount paid and EMIs left
    const loansWithStats = await Promise.all(loans.map(async loan => {
      const payments = await db.all('SELECT * FROM payments WHERE loan_id = ?', loan.loan_id);
      const amount_paid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const total_interest = loan.total_amount - loan.principal_amount;
      let emis_left = Math.ceil((loan.total_amount - amount_paid) / loan.monthly_emi);
      if ((loan.total_amount - amount_paid) <= 0) emis_left = 0;
      return {
        loan_id: loan.loan_id,
        principal: Number(loan.principal_amount),
        total_amount: Number(loan.total_amount),
        total_interest: Number(total_interest),
        emi_amount: Number(loan.monthly_emi),
        amount_paid: Number(amount_paid),
        emis_left
      };
    }));
    res.json({
      customer_id,
      total_loans: loansWithStats.length,
      loans: loansWithStats
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router; 