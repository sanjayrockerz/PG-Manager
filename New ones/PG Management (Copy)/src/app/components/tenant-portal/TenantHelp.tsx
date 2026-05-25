import { Phone, Mail, MessageCircle, Book } from 'lucide-react';

export function TenantHelp() {
  const rules = [
    'Maintain cleanliness in your room and common areas at all times',
    'No smoking or consumption of alcohol inside the PG premises',
    'Visitors allowed only between 10 AM to 7 PM with prior registration',
    'Keep noise levels low after 10 PM to respect other residents',
    'Water and electricity should be used responsibly to avoid wastage',
    'Report any maintenance issues immediately to the caretaker',
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help & Rules</h1>
        <p className="text-sm text-gray-600 mt-1">Contact information and house rules</p>
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Caretaker</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                  RG
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Ramesh Gupta</p>
                  <p className="text-sm text-gray-600">+91 97654 32100</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <button className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2.5 rounded-lg transition-colors">
                  <Phone className="w-4 h-4" />
                  Call
                </button>
                <button className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors">
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Support Email</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href="mailto:support@greenvalleypg.com" className="text-indigo-600 hover:underline">
                  support@greenvalleypg.com
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Office Hours</p>
              <p className="text-sm text-gray-600">Monday - Saturday: 9 AM - 6 PM</p>
              <p className="text-sm text-gray-600">Sunday: 10 AM - 2 PM</p>
            </div>
          </div>
        </div>

        {/* House Rules */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">House Rules</h2>
          </div>

          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-indigo-600">{index + 1}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              For complete house rules and regulations, please refer to your rental agreement or contact the caretaker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
