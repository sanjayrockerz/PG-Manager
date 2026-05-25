import { useState } from 'react';
import { Wallet, Download, X, Copy, AlertCircle, Info } from 'lucide-react';

export function RentCarePayments() {
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const stats = [
    { label: 'Total Paid', value: '₹19,920', color: 'bg-green-100 text-green-600' },
    { label: 'Pending', value: '₹6,450', color: 'bg-amber-100 text-amber-600' },
    { label: 'Security Deposit', value: '₹12,000', color: 'bg-purple-100 text-purple-600' },
  ];

  const payments = [
    { id: 1, month: 'May 2026', baseRent: 6000, electricity: 350, water: 100, total: 6450, dueDate: 'May 5, 2026', paidOn: '-', method: '-', status: 'Pending' },
    { id: 2, month: 'Apr 2026', baseRent: 6000, electricity: 220, water: 100, total: 6320, dueDate: 'Apr 5, 2026', paidOn: 'Apr 3, 2026', method: 'UPI', status: 'Paid' },
    { id: 3, month: 'Mar 2026', baseRent: 6000, electricity: 0, water: 0, total: 6000, dueDate: 'Mar 5, 2026', paidOn: 'Mar 4, 2026', method: 'UPI', status: 'Paid' },
    { id: 4, month: 'Feb 2026', baseRent: 6000, electricity: 500, water: 100, total: 6600, dueDate: 'Feb 5, 2026', paidOn: 'Feb 2, 2026', method: 'UPI', status: 'Paid' },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-600 mt-1">View your payment history and manage pending payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Payment History - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Month</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Base Rent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Extra Charges</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Paid On</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.month}</td>
                <td className="px-4 py-3 text-sm text-gray-600">₹{payment.baseRent.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {payment.electricity + payment.water > 0 ? (
                    <div className="group relative inline-block">
                      <span>₹{(payment.electricity + payment.water).toLocaleString()}</span>
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        Electricity: ₹{payment.electricity}, Water: ₹{payment.water}
                      </div>
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{payment.total.toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{payment.dueDate}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{payment.paidOn}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{payment.method}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    payment.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {payment.status === 'Pending' ? (
                    <button
                      onClick={() => { setSelectedPayment(payment); setShowUPIModal(true); }}
                      className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-medium px-3 py-1.5 rounded-lg text-sm"
                    >
                      Pay Now
                    </button>
                  ) : (
                    <button className="text-gray-600 hover:text-gray-900 flex items-center gap-1 text-sm">
                      <Download className="w-4 h-4" />
                      Receipt
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment History - Mobile */}
      <div className="md:hidden space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-900">{payment.month}</p>
                <p className="text-sm text-gray-600">{payment.dueDate}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                payment.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {payment.status}
              </span>
            </div>
            <div className="space-y-2 mb-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Rent:</span>
                <span className="font-medium">₹{payment.baseRent.toLocaleString()}</span>
              </div>
              {payment.electricity + payment.water > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Extra Charges:</span>
                  <span className="font-medium">₹{(payment.electricity + payment.water).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="font-bold">₹{payment.total.toLocaleString()}</span>
              </div>
            </div>
            {payment.status === 'Pending' ? (
              <button
                onClick={() => { setSelectedPayment(payment); setShowUPIModal(true); }}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-2.5 rounded-lg"
              >
                Pay Now
              </button>
            ) : (
              <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
            )}
          </div>
        ))}
      </div>

      {/* UPI Modal */}
      {showUPIModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowUPIModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Pay via UPI</h3>
              <button onClick={() => setShowUPIModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 mb-6 border border-purple-200">
              <p className="text-sm text-purple-600 font-medium mb-1">Amount to Pay</p>
              <p className="text-4xl font-bold text-gray-900">₹{selectedPayment.total.toLocaleString()}</p>
              <p className="text-sm text-gray-700 mt-1">{selectedPayment.month} Rent</p>
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 mb-2 block">UPI ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="pgowner@upi"
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg font-mono text-sm"
                />
                <button className="p-3 hover:bg-gray-100 rounded-lg border border-gray-300">
                  <Copy className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-semibold py-3.5 rounded-xl shadow-lg mb-3">
              Open UPI App →
            </button>
            <button onClick={() => setShowUPIModal(false)} className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-xl">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
