import { Phone, Mail, MessageCircle, Book } from 'lucide-react';

export function RentCareHelp() {
  const rules = [
    'Maintain cleanliness in your room and common areas at all times',
    'No smoking or consumption of alcohol inside the PG premises',
    'Visitors allowed only between 10 AM to 7 PM with prior registration at reception',
    'Keep noise levels low after 10 PM to respect other residents',
    'Water and electricity should be used responsibly to avoid wastage',
    'Report any maintenance issues immediately to the caretaker or through the app',
  ];

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Help & Rules</h1>
        <p className="text-gray-600 mt-1">Contact information and house rules</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contact Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Contact</h2>

          {/* Caretaker */}
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Caretaker</p>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                RG
              </div>
              <div>
                <p className="font-semibold text-gray-900">Ramesh Gupta</p>
                <p className="text-sm text-gray-600">+91 97654 32100</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 rounded-lg transition-colors">
                <Phone className="w-4 h-4" />
                Call
              </button>
              <button className="flex items-center justify-center gap-2 border border-green-500 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2.5 rounded-lg transition-colors">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>

          {/* Support Email */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Support Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
              <a href="mailto:support@rentcare.in" className="text-sm text-[#4F46E5] hover:underline font-semibold">
                support@rentcare.in
              </a>
            </div>
          </div>
        </div>

        {/* House Rules */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-5 h-5 text-[#4F46E5]" />
            <h2 className="text-lg font-bold text-gray-900">House Rules</h2>
          </div>

          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-6 h-6 bg-[#4F46E5] rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                  {index + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed pt-0.5">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
