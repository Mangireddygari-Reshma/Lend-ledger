import React, { useState, useEffect } from 'react';
import { FaCalculator, FaMoneyCheckAlt, FaBookOpen, FaChartBar, FaUser, FaRupeeSign, FaCalendarAlt, FaPercent } from 'react-icons/fa';

const API = '/api/v1';
const tabList = [
  { key: 'create', label: 'Create Loan', icon: <FaCalculator /> },
  { key: 'payment', label: 'Record Payment', icon: <FaMoneyCheckAlt /> },
  { key: 'ledger', label: 'View Ledger', icon: <FaBookOpen /> },
  { key: 'overview', label: 'Account Overview', icon: <FaChartBar /> },
];

function BankApp() {
  // Shared state
  const [tab, setTab] = useState('create');
  const [customers, setCustomers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedLoan, setSelectedLoan] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Create Loan form
  const [loanForm, setLoanForm] = useState({ customerId: '', principal: '', period: '', rate: '' });

  // Payment form
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentType: 'EMI' });

  // Ledger and Overview
  const [ledger, setLedger] = useState(null);
  const [overview, setOverview] = useState(null);

  // Fetch customers on mount and when needed
  useEffect(() => { fetchCustomers(); }, []);
  async function fetchCustomers() {
    setLoading(true);
    const res = await fetch(`${API}/customers`);
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }

  // Fetch loans for a customer
  async function fetchLoans(customerId) {
    setLoading(true);
    const res = await fetch(`${API}/customers/${customerId}/overview`);
    if (res.ok) {
      const data = await res.json();
      setLoans(data.loans);
    } else {
      setLoans([]);
    }
    setLoading(false);
  }

  // Create Loan
  async function handleCreateLoan(e) {
    e.preventDefault();
    setMessage(null);
    if (!loanForm.customerId || !loanForm.principal || !loanForm.period || !loanForm.rate) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' });
      return;
    }
    setLoading(true);
    const res = await fetch(`${API}/loans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_id: loanForm.customerId,
        loan_amount: Number(loanForm.principal),
        loan_period_years: Number(loanForm.period),
        interest_rate_yearly: Number(loanForm.rate)
      })
    });
    if (res.ok) {
      setMessage({ type: 'success', text: '✔ Loan created successfully!' });
      setLoanForm({ customerId: '', principal: '', period: '', rate: '' });
      fetchLoans(loanForm.customerId);
    } else {
      const err = await res.json();
      let errorMsg = 'Error creating loan.';
      if (err && err.error) errorMsg = err.error;
      setMessage({ type: 'error', text: errorMsg });
    }
    setLoading(false);
  }

  // Record Payment
  async function handleRecordPayment(e) {
    e.preventDefault();
    setMessage(null);
    if (!selectedCustomer) {
      setMessage({ type: 'error', text: 'Please select a customer.' });
      return;
    }
    if (!selectedLoan) {
      setMessage({ type: 'error', text: 'Please select a loan.' });
      return;
    }
    if (!paymentForm.amount) {
      setMessage({ type: 'error', text: 'Please enter an amount.' });
      return;
    }
    setLoading(true);
    const res = await fetch(`${API}/loans/${selectedLoan}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Number(paymentForm.amount),
        payment_type: paymentForm.paymentType
      })
    });
    if (res.ok) {
      setMessage({ type: 'success', text: '✔ Payment recorded successfully!' });
      setPaymentForm({ amount: '', paymentType: 'EMI' });
    } else {
      const err = await res.json();
      let errorMsg = 'Error recording payment.';
      if (err && err.error) {
        if (err.error === 'Your payment amount is greater than the remaining balance.') {
          errorMsg = 'Your payment amount is greater than the remaining balance.';
        } else {
          errorMsg = err.error;
        }
      }
      setMessage({ type: 'error', text: errorMsg });
    }
    setLoading(false);
  }

  // View Ledger
  async function handleViewLedger(loanId) {
    setLoading(true);
    setLedger(null);
    const res = await fetch(`${API}/loans/${loanId}/ledger`);
    if (res.ok) setLedger(await res.json());
    setLoading(false);
  }

  // View Overview
  async function handleViewOverview(customerId) {
    setLoading(true);
    setOverview(null);
    const res = await fetch(`${API}/customers/${customerId}/overview`);
    if (res.ok) setOverview(await res.json());
    setLoading(false);
  }

  // Add Customer (for demo/testing)
  async function handleAddCustomer(e) {
    e.preventDefault();
    setLoading(true);
    const name = e.target.name.value.trim();
    if (!name) {
      setLoading(false);
      return;
    }
    const res = await fetch(`${API}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      setMessage({ type: 'success', text: '✔ Customer added successfully!' });
      // Fetch the updated customer list and set the new customer as selected
      const updated = await (await fetch(`${API}/customers`)).json();
      setCustomers(updated);
      if (updated.length > 0) {
        const newCustomer = updated.find(c => c.name === name) || updated[0];
        setLoanForm(f => ({ ...f, customerId: newCustomer.customer_id }));
        setSelectedCustomer(newCustomer.customer_id);
      }
      e.target.reset();
    } else {
      const err = await res.json();
      let errorMsg = 'Error adding customer.';
      if (err && err.error) errorMsg = err.error;
      setMessage({ type: 'error', text: errorMsg });
    }
    setLoading(false);
  }

  // Reset all selection fields when tab changes
  function handleTabChange(newTab) {
    setTab(newTab);
    setMessage(null);
    setLedger(null);
    setOverview(null);
    setSelectedCustomer('');
    setSelectedLoan('');
    setLoanForm({ customerId: '', principal: '', period: '', rate: '' });
    setPaymentForm({ amount: '', paymentType: 'EMI' });
  }

  // UI
  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#f7f9fb', minHeight: '100vh', padding: 0 }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0 0 0 24px' }}>
        {tabList.map(t => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            style={{
              border: 'none',
              background: tab === t.key ? '#f7f9fb' : '#fff',
              borderBottom: tab === t.key ? '3px solid #2563eb' : '3px solid transparent',
              color: tab === t.key ? '#2563eb' : '#222',
              fontWeight: 500,
              fontSize: 16,
              padding: '18px 32px 12px 12px',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <span style={{ marginRight: 8 }}>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 900, margin: '32px auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #e5e7eb', padding: 32 }}>
        {message && (
          <div style={{
            color: message.type === 'success' ? '#16a34a' : '#dc2626',
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 6,
            padding: '10px 16px',
            marginBottom: 12,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {message.text}
          </div>
        )}
        {loading && <div style={{ color: '#2563eb', marginBottom: 12 }}>Loading...</div>}

        {/* Add Customer Form (standalone, not nested) */}
        <form onSubmit={handleAddCustomer} style={{ marginBottom: 24, display: 'flex', gap: 8, maxWidth: 400 }}>
          <input name="name" placeholder="Add new customer name" style={{ flex: 1, padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 500, cursor: 'pointer' }}>Add Customer</button>
        </form>

        {/* Create Loan Tab */}
        {tab === 'create' && (
          <form onSubmit={handleCreateLoan}>
            <h2 style={{ display: 'flex', alignItems: 'center', fontSize: 26, fontWeight: 600, marginBottom: 8 }}>
              <FaCalculator style={{ marginRight: 10, color: '#2563eb' }} /> Create New Loan
            </h2>
            <div style={{ color: '#64748b', marginBottom: 24 }}>
              Generate a new loan with automated EMI calculations using simple interest formula
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              {/* Customer Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                  <FaUser style={{ marginRight: 8, color: '#2563eb' }} /> Customer Information
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontWeight: 500 }}>Customer ID</label>
                  <select
                    name="customerId"
                    value={loanForm.customerId}
                    onChange={e => setLoanForm({ ...loanForm, customerId: e.target.value })}
                    style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}
                  >
                    <option value="">{customers.length === 0 ? 'No customers found. Please add one.' : 'Select customer'}</option>
                    {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_id.slice(0, 6)})</option>)}
                  </select>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>Unique identifier for the customer</div>
                </div>
              </div>
              {/* Loan Parameters */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                  <FaRupeeSign style={{ marginRight: 8, color: '#2563eb' }} /> Loan Parameters
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 500 }}>Principal Amount (₹)</label>
                  <input
                    name="principal"
                    type="number"
                    value={loanForm.principal}
                    onChange={e => setLoanForm({ ...loanForm, principal: e.target.value })}
                    style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>Amount to be borrowed</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 500 }}><FaCalendarAlt style={{ marginRight: 5, color: '#2563eb' }} /> Loan Period (Years)</label>
                  <input
                    name="period"
                    type="number"
                    value={loanForm.period}
                    onChange={e => setLoanForm({ ...loanForm, period: e.target.value })}
                    style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>Duration of the loan in years</div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 500 }}><FaPercent style={{ marginRight: 5, color: '#2563eb' }} /> Annual Interest Rate (%)</label>
                  <input
                    name="rate"
                    type="number"
                    value={loanForm.rate}
                    onChange={e => setLoanForm({ ...loanForm, rate: e.target.value })}
                    style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}
                  />
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>Simple interest rate per annum</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button type="button" onClick={() => setLoanForm({ customerId: '', principal: '', period: '', rate: '' })} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#222', border: 'none', borderRadius: 6, fontWeight: 500, fontSize: 16, cursor: 'pointer' }}>Reset</button>
              <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 500, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <FaCalculator style={{ marginRight: 8 }} /> Create Loan
              </button>
            </div>
          </form>
        )}

        {/* Record Payment Tab */}
        {tab === 'payment' && (
          <form onSubmit={handleRecordPayment}>
            <h2 style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              <FaMoneyCheckAlt style={{ marginRight: 10, color: '#2563eb' }} /> Record Payment
            </h2>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Select Customer</label>
              <select value={selectedCustomer} onChange={async e => {
                setSelectedCustomer(e.target.value);
                await fetchLoans(e.target.value);
                setSelectedLoan('');
              }} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}>
                <option value="">{customers.length === 0 ? 'No customers found. Please add one.' : 'Select customer'}</option>
                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_id.slice(0, 6)})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Select Loan</label>
              <select value={selectedLoan} onChange={e => setSelectedLoan(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}>
                <option value="">Select loan</option>
                {loans.map(l => <option key={l.loan_id} value={l.loan_id}>Loan {l.loan_id.slice(0, 6)} - ₹{l.principal}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Amount</label>
              <input name="amount" type="number" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Payment Type</label>
              <select name="paymentType" value={paymentForm.paymentType} onChange={e => setPaymentForm({ ...paymentForm, paymentType: e.target.value })} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}>
                <option value="EMI">EMI</option>
                <option value="LUMP_SUM">LUMP_SUM</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button type="submit" style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 500, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <FaMoneyCheckAlt style={{ marginRight: 8 }} /> Record Payment
              </button>
            </div>
          </form>
        )}

        {/* View Ledger Tab */}
        {tab === 'ledger' && (
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              <FaBookOpen style={{ marginRight: 10, color: '#2563eb' }} /> View Ledger
            </h2>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Select Customer</label>
              <select value={selectedCustomer} onChange={async e => {
                setSelectedCustomer(e.target.value);
                await fetchLoans(e.target.value);
                setSelectedLoan('');
                setLedger(null);
              }} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}>
                <option value="">{customers.length === 0 ? 'No customers found. Please add one.' : 'Select customer'}</option>
                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_id.slice(0, 6)})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Select Loan</label>
              <select value={selectedLoan} onChange={e => { setSelectedLoan(e.target.value); handleViewLedger(e.target.value); }} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}>
                <option value="">Select loan</option>
                {loans.map(l => <option key={l.loan_id} value={l.loan_id}>Loan {l.loan_id.slice(0, 6)} - ₹{l.principal}</option>)}
              </select>
            </div>
            {!selectedLoan && <div style={{ color: '#dc2626', marginTop: 8 }}>Please select a loan to view the ledger.</div>}
            {ledger && selectedLoan && (
              <div style={{ marginTop: 24 }}>
                <div><b>Loan ID:</b> {ledger.loan_id}</div>
                <div><b>Customer ID:</b> {ledger.customer_id}</div>
                <div><b>Principal:</b> ₹{ledger.principal}</div>
                <div><b>Total Amount:</b> ₹{ledger.total_amount}</div>
                <div><b>Monthly EMI:</b> ₹{ledger.monthly_emi}</div>
                <div><b>Amount Paid:</b> ₹{ledger.amount_paid}</div>
                <div><b>Balance:</b> ₹{ledger.balance_amount}</div>
                <div><b>EMIs Left:</b> {ledger.emis_left}</div>
                <h4 style={{ marginTop: 18 }}>Transactions</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.transactions.map(tx => (
                      <tr key={tx.transaction_id}>
                        <td>{tx.transaction_id.slice(0, 6)}...</td>
                        <td>{tx.date ? tx.date.slice(0, 19).replace('T', ' ') : ''}</td>
                        <td>₹{tx.amount}</td>
                        <td>{tx.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Account Overview Tab */}
        {tab === 'overview' && (
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
              <FaChartBar style={{ marginRight: 10, color: '#2563eb' }} /> Account Overview
            </h2>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>Select Customer</label>
              <select value={selectedCustomer} onChange={async e => {
                setSelectedCustomer(e.target.value);
                await handleViewOverview(e.target.value);
              }} style={{ width: '100%', padding: 10, border: '1px solid #e5e7eb', borderRadius: 6, marginTop: 6, fontSize: 15 }}>
                <option value="">{customers.length === 0 ? 'No customers found. Please add one.' : 'Select customer'}</option>
                {customers.map(c => <option key={c.customer_id} value={c.customer_id}>{c.name} ({c.customer_id.slice(0, 6)})</option>)}
              </select>
            </div>
            {overview && (
              <div style={{ marginTop: 24 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      <th>Loan ID</th>
                      <th>Principal</th>
                      <th>Total</th>
                      <th>Interest</th>
                      <th>EMI</th>
                      <th>Paid</th>
                      <th>EMIs Left</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.loans.map(loan => (
                      <tr key={loan.loan_id}>
                        <td>{loan.loan_id.slice(0, 6)}...</td>
                        <td>₹{loan.principal}</td>
                        <td>₹{loan.total_amount}</td>
                        <td>₹{loan.total_interest}</td>
                        <td>₹{loan.emi_amount}</td>
                        <td>₹{loan.amount_paid}</td>
                        <td>{loan.emis_left}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BankApp; 