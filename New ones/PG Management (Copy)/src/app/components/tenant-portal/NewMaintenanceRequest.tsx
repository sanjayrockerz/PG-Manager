import { useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

interface NewMaintenanceRequestProps {
  setActiveScreen: (screen: string) => void;
}

export function NewMaintenanceRequest({ setActiveScreen }: NewMaintenanceRequestProps) {
  const [submitted, setSubmitted] = useState(false);
  const [issueTitle, setIssueTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Request Submitted!</h2>
          <p className="text-gray-600 mb-2">Your maintenance request has been submitted successfully.</p>
          <p className="text-sm text-gray-600 mb-6">
            Ticket ID: <span className="font-mono font-semibold text-indigo-600">MNT-1004</span>
          </p>
          <button
            onClick={() => setActiveScreen('maintenance')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Back to Maintenance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div>
        <button
          onClick={() => setActiveScreen('maintenance')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Maintenance</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Maintenance Request</h1>
        <p className="text-sm text-gray-600 mt-1">Submit a new maintenance or repair request</p>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Title *
            </label>
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="e.g., AC not cooling properly"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level *
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPriority('Low')}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  priority === 'Low'
                    ? 'bg-blue-500 text-white border-2 border-blue-500'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-500'
                }`}
              >
                Low
              </button>
              <button
                type="button"
                onClick={() => setPriority('Medium')}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  priority === 'Medium'
                    ? 'bg-amber-500 text-white border-2 border-amber-500'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-amber-500'
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriority('High')}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                  priority === 'High'
                    ? 'bg-red-500 text-white border-2 border-red-500'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-red-500'
                }`}
              >
                High
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              Your request will be sent to the caretaker via WhatsApp. You will receive updates on the progress.
            </p>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            Submit Request
          </button>
        </form>
      </div>
    </div>
  );
}
