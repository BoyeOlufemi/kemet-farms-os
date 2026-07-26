import React, { useState } from 'react';
import { LedgerEntry, KemetDB } from '../types';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  CheckCircle2, 
  ExternalLink, 
  UserCheck, 
  ShieldCheck,
  DollarSign,
  Receipt,
  Building2,
  PieChart
} from 'lucide-react';

interface SeedFundLedgerProps {
  db: KemetDB;
  onUpdateDb: (updatedDb: KemetDB) => void;
}

export default function SeedFundLedger({ db, onUpdateDb }: SeedFundLedgerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [entryType, setEntryType] = useState<'disbursement' | 'expense'>('disbursement');
  const [managerId, setManagerId] = useState<string>(db.staff[0]?.id || 'staff-1');
  const [category, setCategory] = useState<LedgerEntry['category']>('Seed Fund');
  const [amount, setAmount] = useState<number>(50000);
  const [description, setDescription] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState<string>('field-1');

  // Metrics
  const totalDisbursed = db.ledgerEntries
    .filter(e => e.type === 'disbursement')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalExpense = db.ledgerEntries
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const netBalance = totalDisbursed - totalExpense;

  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const staff = db.staff.find(s => s.id === managerId);
    if (!staff) return;

    const newEntry: LedgerEntry = {
      id: `ledg-${Date.now()}`,
      manager_id: managerId,
      manager_name: staff.name,
      type: entryType,
      category,
      amount: Number(amount),
      description,
      field_id: entryType === 'expense' ? selectedFieldId : undefined,
      created_at: new Date().toISOString(),
      verified: true
    };

    const updatedDb: KemetDB = {
      ...db,
      ledgerEntries: [newEntry, ...db.ledgerEntries]
    };

    onUpdateDb(updatedDb);
    setShowAddModal(false);
    setDescription('');
  };

  const handleToggleVerify = (entryId: string) => {
    const updatedLedger = db.ledgerEntries.map(e => 
      e.id === entryId ? { ...e, verified: !e.verified } : e
    );
    onUpdateDb({ ...db, ledgerEntries: updatedLedger });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Wallet size={22} />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 font-display">Seed Fund & Execution Ledger</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Financial tracking of seeded operational funds, field expenses, and auto-parsed receipts
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
        >
          <PlusCircle size={15} />
          <span>New Ledger Transaction</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Seeded Grants */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-4 rounded-2xl border border-emerald-800 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-3xs font-mono uppercase tracking-wider text-emerald-300">
            <span>Total Seed Disbursed</span>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono">₦{totalDisbursed.toLocaleString()}</p>
          <p className="text-3xs text-emerald-200/80">Capital granted to field managers</p>
        </div>

        {/* Card 2: Field Expenses */}
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-3xs font-mono uppercase tracking-wider text-rose-400">
            <span>Total Operational Expenses</span>
            <TrendingDown size={14} className="text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-300">₦{totalExpense.toLocaleString()}</p>
          <p className="text-3xs text-slate-400">Supplies, equipment & labor spent</p>
        </div>

        {/* Card 3: Net Available Fund Balance */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/80 space-y-2 shadow-xs">
          <div className="flex justify-between items-center text-3xs font-mono uppercase tracking-wider text-gray-500">
            <span>Available Unspent Balance</span>
            <Wallet size={14} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-700">₦{netBalance.toLocaleString()}</p>
          <p className="text-3xs text-gray-400">Current liquid capital across managers</p>
        </div>

      </div>

      {/* Manager Balance Breakdown Cards */}
      <div className="space-y-3">
        <h4 className="font-bold text-xs text-gray-800 font-display flex items-center space-x-2">
          <UserCheck size={15} className="text-emerald-600" />
          <span>Manager Seed Allocation Breakdown</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {db.staff.map((staff) => {
            const managerDisbursed = db.ledgerEntries
              .filter(e => e.manager_id === staff.id && e.type === 'disbursement')
              .reduce((sum, e) => sum + e.amount, 0);

            const managerSpent = db.ledgerEntries
              .filter(e => e.manager_id === staff.id && e.type === 'expense')
              .reduce((sum, e) => sum + e.amount, 0);

            const managerRem = managerDisbursed - managerSpent;

            return (
              <div key={staff.id} className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-gray-900">{staff.name}</span>
                  <span className="text-3xs font-bold font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                    {staff.role.split(' ')[0]}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1 text-3xs font-mono text-gray-500 pt-1 border-t border-gray-200/60">
                  <div>
                    <span>Disbursed:</span>
                    <p className="font-bold text-gray-800">₦{managerDisbursed.toLocaleString()}</p>
                  </div>
                  <div>
                    <span>Spent:</span>
                    <p className="font-bold text-rose-600">₦{managerSpent.toLocaleString()}</p>
                  </div>
                </div>

                <div className="pt-1 flex justify-between items-center text-xs font-mono">
                  <span className="text-3xs font-bold text-gray-400">Balance:</span>
                  <span className={`font-bold ${managerRem >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ₦{managerRem.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Financial Ledger Table */}
      <div className="space-y-3">
        <h4 className="font-bold text-xs text-gray-800 font-display flex items-center space-x-2">
          <Receipt size={15} className="text-emerald-600" />
          <span>Recent Financial Transactions ({db.ledgerEntries.length})</span>
        </h4>

        <div className="overflow-x-auto rounded-2xl border border-gray-200/80">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-gray-700 uppercase font-mono text-3xs border-b border-gray-200">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Manager</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center">Receipt</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
              {db.ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <span className={`inline-flex items-center space-x-1 font-bold text-3xs font-mono px-2 py-0.5 rounded-full ${
                      entry.type === 'disbursement' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {entry.type === 'disbursement' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      <span className="capitalize">{entry.type}</span>
                    </span>
                  </td>
                  <td className="p-3 font-semibold">{entry.manager_name}</td>
                  <td className="p-3 font-mono text-2xs text-gray-600">{entry.category}</td>
                  <td className="p-3 text-2xs max-w-xs truncate">{entry.description}</td>
                  <td className={`p-3 font-bold font-mono text-right ${
                    entry.type === 'disbursement' ? 'text-emerald-700' : 'text-rose-600'
                  }`}>
                    {entry.type === 'disbursement' ? '+' : '-'}₦{entry.amount.toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    {entry.receipt_url ? (
                      <a
                        href={entry.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:underline"
                      >
                        <Receipt size={12} />
                        <span>View</span>
                      </a>
                    ) : (
                      <span className="text-3xs text-gray-400 font-mono">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleToggleVerify(entry.id)}
                      className={`px-2 py-1 rounded-lg text-3xs font-bold font-mono cursor-pointer border ${
                        entry.verified 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {entry.verified ? 'VERIFIED' : 'PENDING'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-base text-gray-900 font-display">New Financial Transaction</h3>

            <form onSubmit={handleSubmitEntry} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Transaction Type</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setEntryType('disbursement'); setCategory('Seed Fund'); }}
                    className={`flex-1 py-1.5 rounded-lg font-bold ${
                      entryType === 'disbursement' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Seed Disbursement
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEntryType('expense'); setCategory('Chemicals/Fertilizer'); }}
                    className={`flex-1 py-1.5 rounded-lg font-bold ${
                      entryType === 'expense' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    Field Expense
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Farm Manager</label>
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                >
                  {db.staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                >
                  <option value="Seed Fund">Seed Fund</option>
                  <option value="Chemicals/Fertilizer">Chemicals / Fertilizer</option>
                  <option value="Equipment">Equipment & Drip Irrigation</option>
                  <option value="Labor/Operations">Labor & Field Operations</option>
                  <option value="Other">Other Operational Cost</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Amount (NGN ₦)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-bold font-mono"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Description / Memo</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Q3 Seed Fund Disbursement or Organic Fertilizer purchase"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
