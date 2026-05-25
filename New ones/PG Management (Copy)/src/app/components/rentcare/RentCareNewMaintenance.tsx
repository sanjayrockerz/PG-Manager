import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Upload, AlertCircle } from 'lucide-react';

interface RentCareNewMaintenanceProps {
  setActiveScreen: (screen: string) => void;
}

export function RentCareNewMaintenance({ setActiveScreen }: RentCareNewMaintenanceProps) {
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
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-2">Ticket #TKT0013 · We'll respond within 24 hours</p>
          <p className="text-sm text-gray-600 mb-6">You'll receive a WhatsApp notification when the status changes</p>
          <button
            onClick={() => setActiveScreen('maintenance')}
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-8 py-3 rounded-xl shadow-lg"
          >
            Back to Maintenance
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6 max-w-2xl">
      <div>
        <button
          onClick={() => setActiveScreen('maintenance')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">New Maintenance Request</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Title *</label>
            <input
              type="text"
              value={issueTitle}
              onChange={(e) => setIssueTitle(e.target.value)}
              placeholder="e.g., AC not cooling properly"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              required
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-[#4F46E5] resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Priority *</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setPriority('Low')}
                className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                  priority === 'Low'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-green-500'
                }`}
              >
                Low
              </button>
              <button
                type="button"
                onClick={() => setPriority('Medium')}
                className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                  priority === 'Medium'
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-amber-500'
                }`}
              >
                Medium
              </button>
              <button
                type="button"
                onClick={() => setPriority('High')}
                className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                  priority === 'High'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-red-500'
                }`}
              >
                High
              </button>
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Photo (Optional)</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#4F46E5] transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
              <p className="text-xs text-gray-500 mt-1">Optional — add a photo of the issue</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-900">
              We typically respond within 24 hours. You'll get a WhatsApp update when status changes.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-semibold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            Submit Request →
          </button>
        </form>
      </div>
    </div>
  );
}
