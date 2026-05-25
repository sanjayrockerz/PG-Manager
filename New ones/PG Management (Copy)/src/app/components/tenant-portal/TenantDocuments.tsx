import { FileText, Download } from 'lucide-react';

export function TenantDocuments() {
  const documents = [
    { id: 1, name: 'Rental Agreement.pdf', type: 'Agreement', date: 'Feb 1, 2024', size: '2.4 MB' },
    { id: 2, name: 'ID Proof - Aadhaar.pdf', type: 'ID Proof', date: 'Feb 1, 2024', size: '1.2 MB' },
    { id: 3, name: 'Police Verification.pdf', type: 'Verification', date: 'Feb 5, 2024', size: '856 KB' },
    { id: 4, name: 'House Rules & Regulations.pdf', type: 'Rules', date: 'Feb 1, 2024', size: '642 KB' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Agreement': return 'bg-purple-100 text-purple-700';
      case 'ID Proof': return 'bg-blue-100 text-blue-700';
      case 'Verification': return 'bg-green-100 text-green-700';
      case 'Rules': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-sm text-gray-600 mt-1">View and download your important documents</p>
      </div>

      {/* Documents table - Desktop */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Document</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-red-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(doc.type)}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{doc.size}</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Documents cards - Mobile */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex gap-3 mb-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 mb-1 truncate">{doc.name}</p>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(doc.type)}`}>
                    {doc.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
              <span>{doc.date}</span>
              <span>{doc.size}</span>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
