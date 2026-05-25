import { User, Bell, Lock, CreditCard, Globe, FileText, Plus, X } from 'lucide-react';
import { useState } from 'react';

export function Settings() {
  const [pgRules, setPgRules] = useState([
    'Check-in time: After 6:00 PM',
    'Check-out time: Before 11:00 AM',
    'No smoking inside the premises',
    'Maintain silence after 10:00 PM',
    'Guests are allowed only in common areas',
    'Keep common areas clean',
    'No cooking in rooms',
    'Electricity and water usage should be minimal',
  ]);
  const [newRule, setNewRule] = useState('');
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);
  
  // WhatsApp Automation Settings State
  const [whatsappSettings, setWhatsappSettings] = useState({
    welcomeMessage: {
      enabled: true,
      template: 'Welcome to {{pgName}}, {{tenantName}}! 👋\n\nYour Room: {{room}}\nFloor: {{floor}}\n\nYou can use this WhatsApp for:\n• Checking rent status 💳\n• Raising complaints 🔧\n• Viewing PG rules 📜\n\nType "Hi" to see the menu!'
    },
    rentReminder: {
      enabled: true,
      daysBeforeDue: 3,
      template: '🔔 Rent Reminder\n\nHi {{tenantName}},\n\nYour rent for {{month}} is due on {{dueDate}}.\n\nAmount: ₹{{amount}}\n\nThank you! 🙏'
    },
    paymentConfirmation: {
      enabled: true,
      template: '✅ Payment Received\n\nThank you, {{tenantName}}!\n\nMonth: {{month}}\nAmount: ₹{{amount}}\nDate: {{date}}\n\nYour rent status is up to date! 🎉'
    },
    complaintUpdate: {
      enabled: true,
      notifyOnCreate: true,
      notifyOnProgress: true,
      notifyOnResolve: true
    }
  });

  const [showWhatsAppTemplateModal, setShowWhatsAppTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{type: string, value: string} | null>(null);

  const handleAddRule = () => {
    if (newRule.trim()) {
      if (editingRuleIndex !== null) {
        const updated = [...pgRules];
        updated[editingRuleIndex] = newRule.trim();
        setPgRules(updated);
        setEditingRuleIndex(null);
      } else {
        setPgRules([...pgRules, newRule.trim()]);
      }
      setNewRule('');
      setShowAddRuleModal(false);
    }
  };

  const handleEditRule = (index: number) => {
    setNewRule(pgRules[index]);
    setEditingRuleIndex(index);
    setShowAddRuleModal(true);
  };

  const handleDeleteRule = (index: number) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setPgRules(pgRules.filter((_, i) => i !== index));
    }
  };

  const handleWhatsAppTemplateChange = (type: string, value: string) => {
    setWhatsappSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        template: value
      }
    }));
  };

  const handleWhatsAppTemplateToggle = (type: string) => {
    setWhatsappSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled
      }
    }));
  };

  const handleWhatsAppTemplateEdit = (type: string) => {
    setEditingTemplate({type, value: whatsappSettings[type].template});
    setShowWhatsAppTemplateModal(true);
  };

  const handleWhatsAppTemplateSave = () => {
    if (editingTemplate) {
      handleWhatsAppTemplateChange(editingTemplate.type, editingTemplate.value);
      setEditingTemplate(null);
      setShowWhatsAppTemplateModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account settings</p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-gray-900">Profile Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl">
                A
              </div>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                Change Photo
              </button>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Full Name</label>
              <input 
                type="text" 
                defaultValue="Admin User"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Email</label>
              <input 
                type="email" 
                defaultValue="admin@pgmanager.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update Profile
            </button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-gray-900">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Payment Notifications</p>
                <p className="text-xs text-gray-600">Get notified about payments</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Maintenance Alerts</p>
                <p className="text-xs text-gray-600">New maintenance requests</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Tenant Updates</p>
                <p className="text-xs text-gray-600">Check-in and check-out alerts</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-900">Email Notifications</p>
                <p className="text-xs text-gray-600">Receive email updates</p>
              </div>
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <Lock className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-gray-900">Security</h2>
          </div>
          
          <div className="space-y-4">
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left">
              <p className="text-sm">Change Password</p>
              <p className="text-xs text-gray-600">Update your password regularly</p>
            </button>
            
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left">
              <p className="text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-gray-600">Add an extra layer of security</p>
            </button>
            
            <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-left">
              <p className="text-sm">Active Sessions</p>
              <p className="text-xs text-gray-600">Manage your active devices</p>
            </button>
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-yellow-600" />
            </div>
            <h2 className="text-gray-900">Payment Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">UPI ID</label>
              <input 
                type="text" 
                placeholder="yourname@upi"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Bank Account</label>
              <input 
                type="text" 
                placeholder="Account number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Late Payment Fee</label>
              <input 
                type="number" 
                defaultValue="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Payment Settings
            </button>
          </div>
        </div>

        {/* Additional Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-gray-900">Additional Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Language</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>English</option>
                <option>Hindi</option>
                <option>Marathi</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Timezone</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>IST (UTC+5:30)</option>
                <option>GMT (UTC+0)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">Currency</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>INR (₹)</option>
                <option>USD ($)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
        <h2 className="text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-700 mb-4">These actions are irreversible. Please be careful.</p>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Export All Data
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Delete All Data
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
            Close Account
          </button>
        </div>
      </div>

      {/* PG Rules Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-gray-900">PG Rules</h2>
              <p className="text-sm text-gray-600">Rules for WhatsApp chatbot auto-replies</p>
            </div>
          </div>
          <button 
            onClick={() => {
              setEditingRuleIndex(null);
              setNewRule('');
              setShowAddRuleModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        </div>
        
        <div className="space-y-2">
          {pgRules.map((rule, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 font-mono">{index + 1}.</span>
                <p className="text-sm text-gray-900">{rule}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditRule(index)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteRule(index)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {pgRules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No rules added yet. Click "Add Rule" to get started.</p>
          </div>
        )}
      </div>

      {/* Add/Edit Rule Modal */}
      {showAddRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddRuleModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">{editingRuleIndex !== null ? 'Edit Rule' : 'Add New Rule'}</h2>
              <button onClick={() => setShowAddRuleModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Rule Text *</label>
                <textarea
                  value={newRule}
                  onChange={(e) => setNewRule(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="e.g., Check-in time: After 6:00 PM"
                />
                <p className="text-xs text-gray-500">This rule will be sent to tenants when they send "Rules" via WhatsApp</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddRuleModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={!newRule.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingRuleIndex !== null ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Template Modal */}
      {showWhatsAppTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" onClick={() => setShowWhatsAppTemplateModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-gray-900">Edit WhatsApp Template</h2>
              <button onClick={() => setShowWhatsAppTemplateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-700">Template Text *</label>
                <textarea
                  value={editingTemplate?.value || ''}
                  onChange={(e) => setEditingTemplate(prev => prev ? {...prev, value: e.target.value} : null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  placeholder="Enter your template text here"
                />
                <p className="text-xs text-gray-500">This template will be sent to tenants via WhatsApp</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowWhatsAppTemplateModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWhatsAppTemplateSave}
                  disabled={!editingTemplate?.value.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Automation Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-gray-900">WhatsApp Automation</h2>
              <p className="text-sm text-gray-600">Configure WhatsApp chatbot templates</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-mono">1.</span>
              <p className="text-sm text-gray-900">Welcome Message</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" checked={whatsappSettings.welcomeMessage.enabled} onChange={() => handleWhatsAppTemplateToggle('welcomeMessage')} />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
              <button 
                onClick={() => handleWhatsAppTemplateEdit('welcomeMessage')}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-mono">2.</span>
              <p className="text-sm text-gray-900">Rent Reminder</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" checked={whatsappSettings.rentReminder.enabled} onChange={() => handleWhatsAppTemplateToggle('rentReminder')} />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
              <button 
                onClick={() => handleWhatsAppTemplateEdit('rentReminder')}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-mono">3.</span>
              <p className="text-sm text-gray-900">Payment Confirmation</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" checked={whatsappSettings.paymentConfirmation.enabled} onChange={() => handleWhatsAppTemplateToggle('paymentConfirmation')} />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
              <button 
                onClick={() => handleWhatsAppTemplateEdit('paymentConfirmation')}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-mono">4.</span>
              <p className="text-sm text-gray-900">Complaint Notifications</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-block w-12 h-6">
                <input type="checkbox" className="sr-only peer" checked={whatsappSettings.complaintUpdate.enabled} onChange={() => handleWhatsAppTemplateToggle('complaintUpdate')} />
                <div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors cursor-pointer"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Rent Reminder Settings */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <label className="block text-sm text-gray-700 mb-2">Rent Reminder Timing</label>
          <select 
            value={whatsappSettings.rentReminder.daysBeforeDue}
            onChange={(e) => setWhatsappSettings(prev => ({
              ...prev,
              rentReminder: {
                ...prev.rentReminder,
                daysBeforeDue: parseInt(e.target.value)
              }
            }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">1 day before</option>
            <option value="2">2 days before</option>
            <option value="3">3 days before</option>
            <option value="5">5 days before</option>
            <option value="7">7 days before</option>
          </select>
          <p className="text-xs text-gray-600 mt-2">Automatic rent reminders will be sent this many days before the due date</p>
        </div>
      </div>
    </div>
  );
}