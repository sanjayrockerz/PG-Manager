import { useState } from 'react';
import { Wallet, AlertCircle, Download, X, Copy } from 'lucide-react';

interface TenantPaymentsProps {
  setActiveScreen?: (screen: string) => void;
}

export function TenantPayments({ setActiveScreen }: TenantPaymentsProps) {
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const stats = [
    { label: 'Total Paid', value: '₹18,350', color: 'bg-green-500' },
    { label: 'Pending', value: '₹6,450', color: 'bg-amber-500' },
    { label: 'Security Deposit', value: '₹12,000', color: 'bg-blue-500' },
  ];

  const payments = [
    { id: 1, month: 'May 2026', baseRent: 6000, extras: 450, total: 6450, dueDate: 'May 10, 2026', paidOn: '-', method: '-', status: 'Pending' },
    { id: 2, month: 'Apr 2026', baseRent: 6000, extras: 200, total: 6200, dueDate: 'Apr 10, 2026', paidOn: 'Apr 8, 2026', method: 'UPI', status: 'Paid' },
    { id: 3, month: 'Mar 2026', baseRent: 6000, extras: 150, total: 6150, dueDate: 'Mar 10, 2026', paidOn: 'Mar 9, 2026', method: 'UPI', status: 'Paid' },
    { id: 4, month: 'Feb 2026', baseRent: 6000, extras: 0, total: 6000, dueDate: 'Feb 10, 2026', paidOn: 'Feb 7, 2026', method: 'Bank Transfer', status: 'Paid' },
  ];

  const handlePayNow = (payment: any) => {
    setSelectedPayment(payment);
    setShowUPIModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-sm text-gray-600 mt-1">View your payment history and manage pending payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Payments table - Desktop */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Base Rent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Extra Charges</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid On</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.month}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">₹{payment.baseRent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">₹{payment.extras}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{payment.total.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.dueDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.paidOn}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{payment.method}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      payment.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {payment.status === 'Pending' ? (
                      <button
                        onClick={() => handlePayNow(payment)}
                        className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Pay Now
                      </button>
                    ) : (
                      <button className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments cards - Mobile */}
      <div className="md:hidden space-y-3">
        {payments.map((payment) => (
          <div key={payment.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{payment.month}</p>
                <p className="text-sm text-gray-600 mt-0.5">Due: {payment.dueDate}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                payment.status === 'Paid' ? 'bg-green-100 text-green-800' :
                payment.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {payment.status}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Base Rent:</span>
                <span className="font-medium text-gray-900">₹{payment.baseRent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Extra Charges:</span>
                <span className="font-medium text-gray-900">₹{payment.extras}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-gray-900">₹{payment.total.toLocaleString()}</span>
              </div>
            </div>

            {payment.status === 'Paid' && (
              <div className="text-xs text-gray-600 mb-3">
                Paid on {payment.paidOn} via {payment.method}
              </div>
            )}

            {payment.status === 'Pending' ? (
              <button
                onClick={() => handlePayNow(payment)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors"
              >
                Pay Now
              </button>
            ) : (
              <button className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Receipt
              </button>
            )}
          </div>
        ))}
      </div>

      {/* UPI Payment Modal */}
      {showUPIModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUPIModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Pay via UPI</h3>
              <button onClick={() => setShowUPIModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Amount to Pay</p>
              <p className="text-3xl font-bold text-gray-900">₹{selectedPayment.total.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">{selectedPayment.month} Rent</p>
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-gray-700 mb-2 block">UPI ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value="greenvalleypg@paytm"
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-mono"
                />
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Copy className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 flex gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">After payment, screenshot the confirmation and send it to the caretaker via WhatsApp</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUPIModal(false)}
                className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                Open UPI App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
