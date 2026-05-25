import { FileText, Download } from 'lucide-react';

export function RentCareDocuments() {
  const documents = [
    { id: 1, name: 'Aadhaar Card.pdf', type: 'ID Proof', date: 'Feb 1, 2024', size: '1.2 MB', color: 'bg-purple-100 text-purple-600' },
    { id: 2, name: 'Rental Agreement.pdf', type: 'Agreement', date: 'Feb 1, 2024', size: '2.4 MB', color: 'bg-blue-100 text-blue-600' },
    { id: 3, name: 'April Receipt.pdf', type: 'Receipt', date: 'Apr 3, 2026', size: '156 KB', color: 'bg-green-100 text-green-600' },
    { id: 4, name: 'March Receipt.pdf', type: 'Receipt', date: 'Mar 4, 2026', size: '142 KB', color: 'bg-green-100 text-green-600' },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600 mt-1">View and download your documents</p>
        </div>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-purple-100 text-purple-700">
          {documents.length} files
        </span>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Document</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Size</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.color}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${doc.color}`}>
                    {doc.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{doc.date}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{doc.size}</td>
                <td className="px-4 py-3">
                  <button className="text-[#4F46E5] hover:text-[#4338CA] font-semibold text-sm flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex gap-3 mb-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.color}`}>
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 mb-1 truncate">{doc.name}</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${doc.color}`}>
                  {doc.type}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
              <span>{doc.date}</span>
              <span>{doc.size}</span>
            </div>
            <button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
