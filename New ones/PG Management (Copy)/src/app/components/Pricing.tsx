import { Check, Zap, Building2, Sparkles, Rocket, Shield, TrendingUp, Users, Smartphone, Utensils, Lock, Star, Database, Globe, Bot } from 'lucide-react';

export function Pricing() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-gray-900">Choose Your Plan</h1>
        <p className="text-gray-600 mt-2">Simple, transparent pricing for your PG management needs</p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto mt-8">
        {/* Free Plan */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-8 hover:border-blue-300 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-gray-900 text-xl font-semibold">Free</h3>
              <p className="text-sm text-gray-600">Perfect for getting started</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-4xl font-bold text-gray-900">₹0</p>
            <p className="text-sm text-gray-600 mt-1">Forever free</p>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">1 Property</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Up to 5 Tenants</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Maintenance Requests</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Announcements</span>
            </div>
          </div>

          <button className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
            Current Plan
          </button>
        </div>

        {/* Paid Plan */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-500 p-8 relative shadow-lg">
          {/* Popular Badge */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-md">
              Most Popular
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 text-xl font-semibold">Pro</h3>
              <p className="text-sm text-gray-600">For growing PG businesses</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-4xl font-bold text-gray-900">₹999</p>
            <p className="text-sm text-gray-600 mt-1">per month</p>
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium mt-3">
              <Check className="w-4 h-4" />
              <span>15 Days Free Trial</span>
            </div>
          </div>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 font-medium">Unlimited Properties</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 font-medium">Unlimited Tenants</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Payment Tracking</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">WhatsApp Integration</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Maintenance Requests</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Announcements</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Extra Charges Management</span>
            </div>
            <div className="flex items-start gap-3">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700">Priority Support</span>
            </div>
          </div>

          <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-md">
            Start Free Trial
          </button>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto mt-12">
        <h2 className="text-gray-900 text-xl font-semibold text-center mb-6">Frequently Asked Questions</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-200">
          <div className="p-6">
            <h3 className="text-gray-900 font-medium mb-2">Can I upgrade from Free to Pro anytime?</h3>
            <p className="text-gray-600 text-sm">Yes! You can upgrade to Pro at any time and get immediate access to all premium features.</p>
          </div>
          <div className="p-6">
            <h3 className="text-gray-900 font-medium mb-2">What happens after the 15-day free trial?</h3>
            <p className="text-gray-600 text-sm">After the trial ends, you'll be charged ₹999/month. You can cancel anytime before the trial ends without any charges.</p>
          </div>
          <div className="p-6">
            <h3 className="text-gray-900 font-medium mb-2">Is there a setup fee?</h3>
            <p className="text-gray-600 text-sm">No! There are no setup fees or hidden charges. You only pay the monthly subscription for the Pro plan.</p>
          </div>
          <div className="p-6">
            <h3 className="text-gray-900 font-medium mb-2">Can I cancel my subscription?</h3>
            <p className="text-gray-600 text-sm">Yes, you can cancel your Pro subscription at any time. You'll continue to have access until the end of your billing period.</p>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="max-w-3xl mx-auto mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="text-center">
          <p className="text-gray-900 font-medium mb-2">🎉 Special Launch Offer</p>
          <p className="text-gray-600 text-sm">First 100 customers get lifetime 20% discount on Pro plan!</p>
        </div>
      </div>

      {/* Future Scope Section */}
      <div className="max-w-6xl mx-auto mt-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full mb-4">
            <Rocket className="w-5 h-5 text-purple-600" />
            <span className="text-purple-900 font-medium text-sm">Coming Soon</span>
          </div>
          <h2 className="text-gray-900 text-3xl font-bold mb-3">🚀 Future Scope</h2>
          <p className="text-gray-600 text-lg">Exciting features we're building for you!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Advanced Tenant Management */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Advanced Tenant Management</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Tenant KYC & identity verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Document storage (ID, address proof)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Parent/guardian details & verification</span>
              </li>
            </ul>
          </div>

          {/* Integrated Payment & Billing */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Integrated Payment & Billing</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Payment gateway (UPI, cards, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Automated rent collection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Receipts & financial reports</span>
              </li>
            </ul>
          </div>

          {/* Customizable Analytics */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Customizable Analytics Dashboard</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Occupancy & revenue trends</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Custom reports & insights</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 mt-1">•</span>
                <span>Property performance metrics</span>
              </li>
            </ul>
          </div>

          {/* Role-Based Access */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border-2 border-orange-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Role-Based Access & Multi-User</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>Access levels for owners, staff</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>Multi-property management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 mt-1">•</span>
                <span>Multi-manager support</span>
              </li>
            </ul>
          </div>

          {/* Tenant Mobile App */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border-2 border-pink-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Tenant Mobile App & Marketplace</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-pink-600 mt-1">•</span>
                <span>Tenant app for payments & complaints</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 mt-1">•</span>
                <span>PG discovery marketplace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 mt-1">•</span>
                <span>For students & professionals</span>
              </li>
            </ul>
          </div>

          {/* Operations & Facility Management */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 border-indigo-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Operations & Facility Management</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>Property operations tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>Issue management system</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-600 mt-1">•</span>
                <span>Staff coordination & tasks</span>
              </li>
            </ul>
          </div>

          {/* Mess / Food Management */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border-2 border-yellow-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-4">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Mess / Food Management</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Meal planning & menu tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Food feedback & complaints</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 mt-1">•</span>
                <span>Kitchen expense monitoring</span>
              </li>
            </ul>
          </div>

          {/* Smart Entry & Security */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border-2 border-red-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Smart Entry & Security Integration</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span>Biometric or smart access systems</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span>Entry/exit tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-600 mt-1">•</span>
                <span>Tenant & visitor monitoring</span>
              </li>
            </ul>
          </div>

          {/* Rating & Review System */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border-2 border-teal-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-teal-600 rounded-lg flex items-center justify-center mb-4">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Rating & Review System</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-1">•</span>
                <span>Tenant feedback on facilities & food</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-1">•</span>
                <span>Management ratings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-teal-600 mt-1">•</span>
                <span>Public ratings for marketplace</span>
              </li>
            </ul>
          </div>

          {/* White-Label Solutions */}
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-6 border-2 border-cyan-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-cyan-600 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">White-Label Solutions for PG Chains</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>Custom branded software</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>For large PG operators</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-600 mt-1">•</span>
                <span>Multi-property chain management</span>
              </li>
            </ul>
          </div>

          {/* Expansion to Other Segments */}
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl p-6 border-2 border-violet-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-violet-600 rounded-lg flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">Expansion to Other Property Segments</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-violet-600 mt-1">•</span>
                <span>Rental flats & apartment societies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 mt-1">•</span>
                <span>Co-living spaces</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-violet-600 mt-1">•</span>
                <span>Short-term rentals (Airbnb-style)</span>
              </li>
            </ul>
          </div>

          {/* CRM Integration */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border-2 border-emerald-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">CRM Integration</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-1">•</span>
                <span>Tenant relationship management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-1">•</span>
                <span>Property relationship tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 mt-1">•</span>
                <span>Communication history & insights</span>
              </li>
            </ul>
          </div>

          {/* AI Chatbot Assistance */}
          <div className="bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 rounded-xl p-6 border-2 border-fuchsia-200 hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-lg flex items-center justify-center mb-4">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-2">AI Chatbot Assistance 🤖</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-600 mt-1">•</span>
                <span>24/7 AI-powered tenant support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-600 mt-1">•</span>
                <span>Automated query resolution</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-600 mt-1">•</span>
                <span>Smart rent reminders & follow-ups</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-600 mt-1">•</span>
                <span>Natural language processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-fuchsia-600 mt-1">•</span>
                <span>Multi-language support</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
          <Rocket className="w-12 h-12 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-3">Join Us on This Journey! 🎯</h3>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            We're constantly innovating to make PG management easier, smarter, and more efficient. 
            Your feedback shapes our roadmap—let's build the future together!
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg">
            Request a Feature
          </button>
        </div>
      </div>
    </div>
  );
}