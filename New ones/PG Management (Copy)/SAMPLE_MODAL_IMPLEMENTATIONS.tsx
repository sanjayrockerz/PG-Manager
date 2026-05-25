// ============================================================================
// SAMPLE MODAL IMPLEMENTATIONS
// Copy these into your actual components or create separate modal files
// ============================================================================

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Plus, X, Upload } from 'lucide-react';

// ============================================================================
// 1. ADD PROPERTY MODAL
// ============================================================================

export function AddPropertyModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    floors: 1,
    trackingType: 'room-based', // 'room-based' or 'bed-based'
    contactName: '',
    contactPhone: '',
    contactEmail: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Create new property object
    const newProperty = {
      id: Date.now().toString(),
      name: formData.name,
      address: `${formData.address}, ${formData.city}`,
      city: formData.city,
      floors: parseInt(formData.floors),
      rooms: 0, // Will be calculated as rooms are added
      beds: 0, // Will be calculated
      dateAdded: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      contact: {
        name: formData.contactName,
        phone: formData.contactPhone,
        email: formData.contactEmail,
      },
      trackingType: formData.trackingType,
    };

    onSubmit(newProperty);

    // Reset form
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      floors: 1,
      trackingType: 'room-based',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Property
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Property Details</h3>

            <div>
              <Label htmlFor="name">Property Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Sunshine Residency"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="address">Full Address *</Label>
              <Textarea
                id="address"
                placeholder="Street address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="e.g., Bangalore"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  placeholder="e.g., Karnataka"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  type="number"
                  placeholder="e.g., 560001"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="floors">Number of Floors *</Label>
                <Input
                  id="floors"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.floors}
                  onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Tracking Type *</Label>
              <RadioGroup
                value={formData.trackingType}
                onValueChange={(value) => setFormData({ ...formData, trackingType: value })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="room-based" id="room-based" />
                  <Label htmlFor="room-based" className="font-normal cursor-pointer">
                    Room-based (Track entire rooms)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bed-based" id="bed-based" />
                  <Label htmlFor="bed-based" className="font-normal cursor-pointer">
                    Bed-based (Track individual beds)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Contact Person Section */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-gray-900">Contact Person (Caretaker)</h3>

            <div>
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                placeholder="e.g., Ramesh Kumar"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="contactPhone">Contact Phone *</Label>
              <Input
                id="contactPhone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="contact@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 2. ADD ROOM MODAL
// ============================================================================

export function AddRoomModal({ isOpen, onClose, onSubmit, property }) {
  const [formData, setFormData] = useState({
    number: '',
    floor: 1,
    type: 'Single',
    beds: 1,
    rent: '',
    status: 'Vacant',
  });

  const handleTypeChange = (type) => {
    const bedsMap = {
      'Single': 1,
      'Double': 2,
      'Triple': 3,
    };
    setFormData({ ...formData, type, beds: bedsMap[type] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newRoom = {
      id: Date.now().toString(),
      propertyId: property.id,
      number: formData.number,
      floor: parseInt(formData.floor),
      type: formData.type,
      beds: parseInt(formData.beds),
      rent: parseInt(formData.rent),
      status: formData.status,
      occupiedBeds: 0,
    };

    onSubmit(newRoom);

    // Reset form
    setFormData({
      number: '',
      floor: 1,
      type: 'Single',
      beds: 1,
      rent: '',
      status: 'Vacant',
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Room to {property?.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="number">Room Number *</Label>
              <Input
                id="number"
                placeholder="e.g., 301"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="floor">Floor *</Label>
              <Select
                value={formData.floor.toString()}
                onValueChange={(value) => setFormData({ ...formData, floor: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: property?.floors || 5 }, (_, i) => i + 1).map((floor) => (
                    <SelectItem key={floor} value={floor.toString()}>
                      Floor {floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="type">Room Type *</Label>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single (1 bed)</SelectItem>
                <SelectItem value="Double">Double (2 beds)</SelectItem>
                <SelectItem value="Triple">Triple (3 beds)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="beds">Number of Beds *</Label>
              <Input
                id="beds"
                type="number"
                min="1"
                max="5"
                value={formData.beds}
                onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="rent">Monthly Rent (₹) *</Label>
              <Input
                id="rent"
                type="number"
                placeholder="e.g., 8000"
                value={formData.rent}
                onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vacant">Vacant</SelectItem>
                <SelectItem value="Occupied">Occupied</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 3. ADD TENANT MODAL (6-Section Multi-Step Form)
// ============================================================================

export function AddTenantModal({ isOpen, onClose, onSubmit, properties }) {
  const [currentSection, setCurrentSection] = useState(1);
  const [formData, setFormData] = useState({
    // Section 1: Basic Info
    photo: null,
    name: '',
    phone: '',
    email: '',

    // Section 2: Room Assignment
    propertyId: '',
    floor: '',
    room: '',
    bed: '',

    // Section 3: Rent Details
    monthlyRent: '',
    securityDeposit: '',
    dueDate: '5',

    // Section 4: Emergency Contact
    emergencyName: '',
    emergencyPhone: '',

    // Section 5: KYC
    idType: 'Aadhaar',
    idNumber: '',
    idDocument: null,

    // Section 6: Stay Details
    joinDate: '',
    status: 'Active',
  });

  const sections = [
    'Basic Info',
    'Room Assignment',
    'Rent Details',
    'Emergency Contact',
    'KYC/Verification',
    'Stay Details',
  ];

  const handleNext = () => {
    if (currentSection < 6) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newTenant = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      property: properties.find(p => p.id === formData.propertyId)?.name || '',
      room: formData.room,
      rent: parseInt(formData.monthlyRent),
      joinDate: new Date(formData.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status: formData.status,
      // ... other fields
    };

    onSubmit(newTenant);

    // Reset form
    setCurrentSection(1);
    setFormData({
      photo: null, name: '', phone: '', email: '',
      propertyId: '', floor: '', room: '', bed: '',
      monthlyRent: '', securityDeposit: '', dueDate: '5',
      emergencyName: '', emergencyPhone: '',
      idType: 'Aadhaar', idNumber: '', idDocument: null,
      joinDate: '', status: 'Active',
    });

    onClose();
  };

  const renderSection = () => {
    switch (currentSection) {
      case 1: // Basic Info
        return (
          <div className="space-y-4">
            <div>
              <Label>Profile Photo (Optional)</Label>
              <div className="mt-2 flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                  {formData.photo ? (
                    <img src={formData.photo} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <Button type="button" variant="outline" size="sm">
                  Upload Photo
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Amit Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="amit@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
        );

      case 2: // Room Assignment
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="property">Select Property *</Label>
              <Select
                value={formData.propertyId}
                onValueChange={(value) => setFormData({ ...formData, propertyId: value, floor: '', room: '', bed: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.propertyId && (
              <>
                <div>
                  <Label htmlFor="floor">Floor *</Label>
                  <Select
                    value={formData.floor}
                    onValueChange={(value) => setFormData({ ...formData, floor: value, room: '', bed: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose floor" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: properties.find(p => p.id === formData.propertyId)?.floors || 3 }, (_, i) => i + 1).map((floor) => (
                        <SelectItem key={floor} value={floor.toString()}>
                          Floor {floor}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="room">Room Number *</Label>
                  <Input
                    id="room"
                    placeholder="e.g., 301"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bed">Bed (if bed-based tracking)</Label>
                  <Select
                    value={formData.bed}
                    onValueChange={(value) => setFormData({ ...formData, bed: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose bed (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Bed A</SelectItem>
                      <SelectItem value="B">Bed B</SelectItem>
                      <SelectItem value="C">Bed C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        );

      case 3: // Rent Details
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="monthlyRent">Monthly Rent (₹) *</Label>
              <Input
                id="monthlyRent"
                type="number"
                placeholder="e.g., 8000"
                value={formData.monthlyRent}
                onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="securityDeposit">Security Deposit (₹) *</Label>
              <Input
                id="securityDeposit"
                type="number"
                placeholder="e.g., 16000"
                value={formData.securityDeposit}
                onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Rent Due Date (Day of Month) *</Label>
              <Select
                value={formData.dueDate}
                onValueChange={(value) => setFormData({ ...formData, dueDate: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of every month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4: // Emergency Contact
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="emergencyName">Parent/Guardian Name *</Label>
              <Input
                id="emergencyName"
                placeholder="e.g., Rajesh Kumar"
                value={formData.emergencyName}
                onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="emergencyPhone">Parent/Guardian Phone *</Label>
              <Input
                id="emergencyPhone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                required
              />
            </div>
          </div>
        );

      case 5: // KYC
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="idType">ID Type *</Label>
              <Select
                value={formData.idType}
                onValueChange={(value) => setFormData({ ...formData, idType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhaar">Aadhaar Card</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="DL">Driving License</SelectItem>
                  <SelectItem value="VoterID">Voter ID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="idNumber">ID Number *</Label>
              <Input
                id="idNumber"
                placeholder="Enter ID number"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Upload ID Document *</Label>
              <div className="mt-2">
                <Button type="button" variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  {formData.idDocument ? 'Document Uploaded' : 'Choose File (PDF/JPG/PNG)'}
                </Button>
              </div>
            </div>
          </div>
        );

      case 6: // Stay Details
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="joinDate">Join Date *</Label>
              <Input
                id="joinDate"
                type="date"
                value={formData.joinDate}
                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <RadioGroup
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Active" id="active" />
                  <Label htmlFor="active" className="font-normal cursor-pointer">
                    Active
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Inactive" id="inactive" />
                  <Label htmlFor="inactive" className="font-normal cursor-pointer">
                    Inactive
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Tenant
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-4">
          {sections.map((section, index) => (
            <div key={section} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  currentSection === index + 1
                    ? 'bg-[#4F46E5] text-white'
                    : currentSection > index + 1
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {index + 1}
              </div>
              {index < sections.length - 1 && (
                <div className={`w-8 h-1 ${currentSection > index + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Section {currentSection} of 6: <span className="font-semibold">{sections[currentSection - 1]}</span>
        </p>

        <form onSubmit={currentSection === 6 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          <div className="min-h-[300px]">
            {renderSection()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={currentSection === 1}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>

              {currentSection < 6 ? (
                <Button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA]">
                  Next
                </Button>
              ) : (
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tenant
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// 4. CONFIRMATION DIALOG (for Delete operations)
// ============================================================================

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

export function ConfirmDeleteDialog({ isOpen, onClose, onConfirm, title, description, itemName }) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title || 'Confirm Deletion'}</AlertDialogTitle>
          <AlertDialogDescription>
            {description || `Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================================================
// USAGE EXAMPLE IN PropertiesV2.tsx:
// ============================================================================

/*
import { AddPropertyModal, AddRoomModal, ConfirmDeleteDialog } from './modals';

export function PropertiesV2({ onNavigate }: PropertiesV2Props) {
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Modal states
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [selectedPropertyForRoom, setSelectedPropertyForRoom] = useState<Property | null>(null);
  const [showDeletePropertyDialog, setShowDeletePropertyDialog] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  // Data state
  const [propertiesData, setPropertiesData] = useState(properties);
  const [roomsData, setRoomsData] = useState(rooms);

  // Handlers
  const handleAddProperty = (newProperty) => {
    setPropertiesData([...propertiesData, newProperty]);
  };

  const handleAddRoom = (newRoom) => {
    setRoomsData([...roomsData, newRoom]);
  };

  const handleDeleteProperty = () => {
    setPropertiesData(propertiesData.filter(p => p.id !== propertyToDelete.id));
    setPropertyToDelete(null);
  };

  return (
    <>
      // ... your existing JSX

      <Button onClick={() => setShowAddPropertyModal(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Property
      </Button>

      <Button onClick={() => {
        setSelectedPropertyForRoom(property);
        setShowAddRoomModal(true);
      }}>
        <Plus className="w-4 h-4 mr-2" />
        Add Room
      </Button>

      <Button onClick={() => {
        setPropertyToDelete(property);
        setShowDeletePropertyDialog(true);
      }}>
        <Trash className="w-4 h-4" />
      </Button>

      // Modals
      <AddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
        onSubmit={handleAddProperty}
      />

      <AddRoomModal
        isOpen={showAddRoomModal}
        onClose={() => setShowAddRoomModal(false)}
        onSubmit={handleAddRoom}
        property={selectedPropertyForRoom}
      />

      <ConfirmDeleteDialog
        isOpen={showDeletePropertyDialog}
        onClose={() => setShowDeletePropertyDialog(false)}
        onConfirm={handleDeleteProperty}
        itemName={propertyToDelete?.name}
        title="Delete Property"
        description={`Are you sure you want to delete "${propertyToDelete?.name}" and all its rooms? This cannot be undone.`}
      />
    </>
  );
}
*/
