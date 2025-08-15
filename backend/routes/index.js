import express from 'express';
import loansRouter from './loans.js';
import customersRouter from './customers.js';

const router = express.Router();

router.use('/loans', loansRouter);
router.use('/customers', customersRouter);

export default router; 