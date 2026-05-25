'use client';

import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash, User, Mail, Phone, MapPin, Home, Calendar, IndianRupee, CheckCircle, XCircle, Save, AlertTriangle, Bed, FileText } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  property: string;
  room: string;
  rent: number;
  securityDeposit: number;
  joinDate: string;
  status: 'Active' | 'Inactive';
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  idProof?: {
    type: string;
    number: string;
  };
  bloodGroup?: string;
  occupation?: string;
  previousAddress?: string;
}

const initialTenants: Tenant[] = [
  {
    id: '1',
    name: 'Amit Kumar',
    email: 'amit@example.com',
    phone: '+91 98765 43210',
    alternatePhone: '+91 87654 32109',
    property: 'Sunshine Residency',
    room: '301',
    rent: 8000,
    securityDeposit: 16000,
    joinDate: 'Mar 2025',
    status: 'Active',
    emergencyContact: {
      name: 'Rajesh Kumar',
      phone: '+91 98765 11111',
      relation: 'Father',
    },
    idProof: {
      type: 'Aadhaar',
      number: '1234 5678 9012',
    },
    bloodGroup: 'O+',
    occupation: 'Software Engineer',
    previousAddress: '123 Old Street, Delhi',
  },
  {
    id: '2',
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    phone: '+91 98765 43211',
    property: 'Sunshine Residency',
    room: '302',
    rent: 8000,
    securityDeposit: 16000,
    joinDate: 'Feb 2025',
    status: 'Active',
    emergencyContact: {
      name: 'Suresh Sharma',
      phone: '+91 98765 22222',
      relation: 'Father',
    },
    idProof: {
      type: 'Aadhaar',
      number: '9876 5432 1098',
    },
    bloodGroup: 'A+',
    occupation: 'Data Analyst',
  },
  {
    id: '3',
    name: 'Vikash Singh',
    email: 'vikash@example.com',
    phone: '+91 98765 43212',
    property: 'Lakeview PG',
    room: '201',
    rent: 9000,
    securityDeposit: 18000,
    joinDate: 'Jan 2025',
    status: 'Active',
    emergencyContact: {
      name: 'Ramesh Singh',
      phone: '+91 98765 33333',
      relation: 'Father',
    },
    idProof: {
      type: 'Passport',
      number: 'AB1234567',
    },
    bloodGroup: 'B+',
    occupation: 'Marketing Manager',
  },
  {
    id: '4',
    name: 'Priya Patel',
    email: 'priya@example.com',
    phone: '+91 98765 43213',
    property: 'Lakeview PG',
    room: '101',
    rent: 8000,
    securityDeposit: 16000,
    joinDate: 'Apr 2025',
    status: 'Active',
    emergencyContact: {
      name: 'Dinesh Patel',
      phone: '+91 98765 44444',
      relation: 'Father',
    },
    idProof: {
      type: 'Aadhaar',
      number: '5555 6666 7777',
    },
    bloodGroup: 'AB+',
    occupation: 'Teacher',
  },
  {
    id: '5',
    name: 'Sneha Reddy',
    email: 'sneha@example.com',
    phone: '+91 98765 43214',
    property: 'Green Valley Apartments',
    room: '401',
    rent: 7000,
    securityDeposit: 14000,
    joinDate: 'May 2025',
    status: 'Active',
    emergencyContact: {
      name: 'Krishna Reddy',
      phone: '+91 98765 55555',
      relation: 'Father',
    },
    bloodGroup: 'O-',
    occupation: 'Designer',
  },
  {
    id: '6',
    name: 'Arjun Mehta',
    email: 'arjun.m@example.com',
    phone: '+91 98765 43215',
    property: 'Ocean View Plaza',
    room: '301',
    rent: 10000,
    securityDeposit: 20000,
    joinDate: 'Mar 2025',
    status: 'Active',
    emergencyContact: {
      name: 'Kiran Mehta',
      phone: '+91 98765 66666',
      relation: 'Mother',
    },
    bloodGroup: 'A-',
    occupation: 'Consultant',
  },
  {
    id: '7',
    name: 'Kavita Sharma',
    email: 'kavita@example.com',
    phone: '+91 98765 43216',
    property: 'Maple Heights PG',
    room: '201',
    rent: 7500,
    securityDeposit: 15000,
    joinDate: 'Feb 2025',
    status: 'Active',
    bloodGroup: 'B-',
    occupation: 'HR Manager',
  },
  {
    id: '8',
    name: 'Rohan Gupta',
    email: 'rohan@example.com',
    phone: '+91 98765 43217',
    property: 'Sunrise Residency',
    room: '301',
    rent: 8500,
    securityDeposit: 17000,
    joinDate: 'Jan 2025',
    status: 'Active',
    occupation: 'Developer',
  },
  {
    id: '9',
    name: 'Anjali Das',
    email: 'anjali@example.com',
    phone: '+91 98765 43218',
    property: 'Paradise Stays',
    room: '501',
    rent: 9500,
    securityDeposit: 19000,
    joinDate: 'Apr 2025',
    status: 'Active',
    occupation: 'Accountant',
  },
  {
    id: '10',
    name: 'Nikhil Verma',
    email: 'nikhil@example.com',
    phone: '+91 98765 43219',
    property: 'Comfort Inn PG',
    room: '201',
    rent: 7800,
    securityDeposit: 15600,
    joinDate: 'Mar 2025',
    status: 'Active',
    occupation: 'Sales Executive',
  },
  {
    id: '11',
    name: 'Pooja Nair',
    email: 'pooja@example.com',
    phone: '+91 98765 43220',
    property: 'Green Valley Apartments',
    room: '301',
    rent: 9000,
    securityDeposit: 18000,
    joinDate: 'Feb 2025',
    status: 'Active',
    occupation: 'Content Writer',
  },
  {
    id: '12',
    name: 'Karthik Iyer',
    email: 'karthik@example.com',
    phone: '+91 98765 43221',
    property: 'Ocean View Plaza',
    room: '201',
    rent: 9000,
    securityDeposit: 18000,
    joinDate: 'May 2025',
    status: 'Active',
    occupation: 'Product Manager',
  },
  {
    id: '13',
    name: 'Divya Krishnan',
    email: 'divya@example.com',
    phone: '+91 98765 43222',
    property: 'Paradise Stays',
    room: '401',
    rent: 8500,
    securityDeposit: 17000,
    joinDate: 'Jan 2025',
    status: 'Active',
    occupation: 'Business Analyst',
  },
  {
    id: '14',
    name: 'Siddharth Rao',
    email: 'siddharth@example.com',
    phone: '+91 98765 43223',
    property: 'Sunrise Residency',
    room: '201',
    rent: 7500,
    securityDeposit: 15000,
    joinDate: 'Apr 2025',
    status: 'Inactive',
    occupation: 'Photographer',
  },
  {
    id: '15',
    name: 'Meera Bose',
    email: 'meera@example.com',
    phone: '+91 98765 43224',
    property: 'Maple Heights PG',
    room: '101',
    rent: 6500,
    securityDeposit: 13000,
    joinDate: 'Mar 2025',
    status: 'Active',
    occupation: 'Architect',
  },
];

interface TenantsV2Props {
  onViewTenant: (tenantId: string) => void;
}

export function TenantsV2({ onViewTenant }: TenantsV2Props) {
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Add Tenant Modal - 6 sections
  const [addTenantOpen, setAddTenantOpen] = useState(false);
  const [addTenantSection, setAddTenantSection] = useState(1);
  const [newTenant, setNewTenant] = useState<Partial<Tenant>>({
    name: '',
    email: '',
    phone: '',
    alternatePhone: '',
    property: '',
    room: '',
    rent: 0,
    securityDeposit: 0,
    joinDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    status: 'Active',
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
    idProof: {
      type: 'Aadhaar',
      number: '',
    },
    bloodGroup: '',
    occupation: '',
    previousAddress: '',
  });

  // Edit Tenant Modal
  const [editTenantOpen, setEditTenantOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Delete Tenant Modal
  const [deleteTenantOpen, setDeleteTenantOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  // View Tenant Modal
  const [viewTenantOpen, setViewTenantOpen] = useState(false);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      tenant.room.includes(searchQuery) ||
      tenant.property.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'All' || tenant.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = [
    { label: 'Total Tenants', value: tenants.length, icon: User, color: 'from-purple-500 to-pink-500' },
    { label: 'Active', value: tenants.filter((t) => t.status === 'Active').length, icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
    { label: 'Inactive', value: tenants.filter((t) => t.status === 'Inactive').length, icon: XCircle, color: 'from-red-500 to-rose-500' },
    { label: 'Monthly Revenue', value: `₹${tenants.filter((t) => t.status === 'Active').reduce((sum, t) => sum + t.rent, 0).toLocaleString()}`, icon: IndianRupee, color: 'from-blue-500 to-cyan-500' },
  ];

  // Add Tenant Handler
  const handleAddTenant = () => {
    if (!newTenant.name || !newTenant.email || !newTenant.phone || !newTenant.property || !newTenant.room) {
      toast.error('Please fill all required fields');
      return;
    }

    const tenant: Tenant = {
      id: String(Date.now()),
      name: newTenant.name,
      email: newTenant.email,
      phone: newTenant.phone,
      alternatePhone: newTenant.alternatePhone,
      property: newTenant.property,
      room: newTenant.room,
      rent: newTenant.rent || 0,
      securityDeposit: newTenant.securityDeposit || 0,
      joinDate: newTenant.joinDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status: 'Active',
      emergencyContact: newTenant.emergencyContact,
      idProof: newTenant.idProof,
      bloodGroup: newTenant.bloodGroup,
      occupation: newTenant.occupation,
      previousAddress: newTenant.previousAddress,
    };

    setTenants([...tenants, tenant]);
    setAddTenantOpen(false);
    setAddTenantSection(1);
    setNewTenant({
      name: '',
      email: '',
      phone: '',
      alternatePhone: '',
      property: '',
      room: '',
      rent: 0,
      securityDeposit: 0,
      joinDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      status: 'Active',
      emergencyContact: { name: '', phone: '', relation: '' },
      idProof: { type: 'Aadhaar', number: '' },
      bloodGroup: '',
      occupation: '',
      previousAddress: '',
    });
    toast.success('Tenant added successfully!');
  };

  // Edit Tenant Handler
  const handleEditTenant = () => {
    if (!editingTenant) return;

    setTenants(tenants.map((t) => (t.id === editingTenant.id ? editingTenant : t)));
    setEditTenantOpen(false);
    setEditingTenant(null);
    toast.success('Tenant updated successfully!');
  };

  // Delete Tenant Handler
  const handleDeleteTenant = () => {
    if (!deletingTenant) return;

    setTenants(tenants.filter((t) => t.id !== deletingTenant.id));
    setDeleteTenantOpen(false);
    setDeletingTenant(null);
    toast.success('Tenant deleted successfully!');
  };

  const renderAddTenantSection = () => {
    switch (addTenantSection) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
            <div className="space-y-2">
              <Label htmlFor="tenant-name" className="text-sm font-semibold">Full Name *</Label>
              <Input
                id="tenant-name"
                placeholder="e.g., Amit Kumar"
                value={newTenant.name}
                onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-email" className="text-sm font-semibold">Email *</Label>
                <Input
                  id="tenant-email"
                  type="email"
                  placeholder="amit@example.com"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant({ ...newTenant, email: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-phone" className="text-sm font-semibold">Phone *</Label>
                <Input
                  id="tenant-phone"
                  placeholder="+91 98765 43210"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant({ ...newTenant, phone: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-alt-phone" className="text-sm font-semibold">Alternate Phone</Label>
              <Input
                id="tenant-alt-phone"
                placeholder="+91 87654 32109"
                value={newTenant.alternatePhone}
                onChange={(e) => setNewTenant({ ...newTenant, alternatePhone: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Property & Room Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-property" className="text-sm font-semibold">Property *</Label>
                <Input
                  id="tenant-property"
                  placeholder="e.g., Sunshine Residency"
                  value={newTenant.property}
                  onChange={(e) => setNewTenant({ ...newTenant, property: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-room" className="text-sm font-semibold">Room Number *</Label>
                <Input
                  id="tenant-room"
                  placeholder="e.g., 301"
                  value={newTenant.room}
                  onChange={(e) => setNewTenant({ ...newTenant, room: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenant-rent" className="text-sm font-semibold">Monthly Rent (₹) *</Label>
                <Input
                  id="tenant-rent"
                  type="number"
                  placeholder="8000"
                  value={newTenant.rent || ''}
                  onChange={(e) => setNewTenant({ ...newTenant, rent: parseInt(e.target.value) || 0 })}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant-deposit" className="text-sm font-semibold">Security Deposit (₹)</Label>
                <Input
                  id="tenant-deposit"
                  type="number"
                  placeholder="16000"
                  value={newTenant.securityDeposit || ''}
                  onChange={(e) => setNewTenant({ ...newTenant, securityDeposit: parseInt(e.target.value) || 0 })}
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenant-join-date" className="text-sm font-semibold">Join Date</Label>
              <Input
                id="tenant-join-date"
                placeholder="May 2025"
                value={newTenant.joinDate}
                onChange={(e) => setNewTenant({ ...newTenant, joinDate: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Emergency Contact</h3>
            <div className="space-y-2">
              <Label htmlFor="emergency-name" className="text-sm font-semibold">Name</Label>
              <Input
                id="emergency-name"
                placeholder="e.g., Rajesh Kumar"
                value={newTenant.emergencyContact?.name}
                onChange={(e) =>
                  setNewTenant({
                    ...newTenant,
                    emergencyContact: { ...newTenant.emergencyContact!, name: e.target.value },
                  })
                }
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-phone" className="text-sm font-semibold">Phone</Label>
                <Input
                  id="emergency-phone"
                  placeholder="+91 98765 11111"
                  value={newTenant.emergencyContact?.phone}
                  onChange={(e) =>
                    setNewTenant({
                      ...newTenant,
                      emergencyContact: { ...newTenant.emergencyContact!, phone: e.target.value },
                    })
                  }
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency-relation" className="text-sm font-semibold">Relation</Label>
                <Input
                  id="emergency-relation"
                  placeholder="e.g., Father"
                  value={newTenant.emergencyContact?.relation}
                  onChange={(e) =>
                    setNewTenant({
                      ...newTenant,
                      emergencyContact: { ...newTenant.emergencyContact!, relation: e.target.value },
                    })
                  }
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">ID Proof Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id-type" className="text-sm font-semibold">ID Type</Label>
                <select
                  id="id-type"
                  value={newTenant.idProof?.type}
                  onChange={(e) =>
                    setNewTenant({
                      ...newTenant,
                      idProof: { ...newTenant.idProof!, type: e.target.value },
                    })
                  }
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="DrivingLicense">Driving License</option>
                  <option value="VoterID">Voter ID</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="id-number" className="text-sm font-semibold">ID Number</Label>
                <Input
                  id="id-number"
                  placeholder="1234 5678 9012"
                  value={newTenant.idProof?.number}
                  onChange={(e) =>
                    setNewTenant({
                      ...newTenant,
                      idProof: { ...newTenant.idProof!, number: e.target.value },
                    })
                  }
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blood-group" className="text-sm font-semibold">Blood Group</Label>
                <select
                  id="blood-group"
                  value={newTenant.bloodGroup}
                  onChange={(e) => setNewTenant({ ...newTenant, bloodGroup: e.target.value })}
                  className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="occupation" className="text-sm font-semibold">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="e.g., Software Engineer"
                  value={newTenant.occupation}
                  onChange={(e) => setNewTenant({ ...newTenant, occupation: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Previous Address</h3>
            <div className="space-y-2">
              <Label htmlFor="previous-address" className="text-sm font-semibold">Previous Address</Label>
              <textarea
                id="previous-address"
                placeholder="Enter previous address"
                value={newTenant.previousAddress}
                onChange={(e) => setNewTenant({ ...newTenant, previousAddress: e.target.value })}
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Review & Submit</h4>
              <p className="text-sm text-green-700">
                Please review all the information before submitting. You can go back to edit any section if needed.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Sticky Header with Gradient */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-4 bg-gradient-to-r from-purple-50 via-white to-blue-50 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Tenants
            </h1>
            <p className="text-sm text-gray-600 mt-1">Manage all your tenants and their information</p>
          </div>
          <Button
            onClick={() => setAddTenantOpen(true)}
            className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] w-full md:w-auto shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-xl hover:scale-105 h-12 md:h-10"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-semibold">Add Tenant</span>
          </Button>
        </div>
      </div>

      {/* Stats - Enhanced */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`} />
              <div className="relative p-4 md:p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mb-1 font-medium">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold bg-gradient-to-br from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {stat.value}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['All', 'Active', 'Inactive'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
              filterStatus === status
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300 hover:shadow-md'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Search Bar - Enhanced */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
        <Input
          type="text"
          placeholder="Search by name, room, phone, email, or property..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 md:h-11 border-2 border-purple-100 focus:border-purple-400 shadow-md rounded-xl"
        />
      </div>

      {/* Table - Desktop */}
      <Card className="hidden md:block overflow-hidden border-0 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200">
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Property</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Room</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Rent</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-purple-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all duration-200">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-sm">
                          {tenant.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{tenant.name}</div>
                        <div className="text-sm text-gray-600">{tenant.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tenant.property}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md">
                        <span className="text-white text-xs font-bold">{tenant.room}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{tenant.phone}</div>
                    <div className="text-xs text-gray-600">{tenant.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-green-700">₹{tenant.rent.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{tenant.joinDate}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                        tenant.status === 'Active'
                          ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                          : 'bg-gradient-to-r from-red-400 to-rose-400 text-white'
                      }`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingTenant(tenant);
                          setViewTenantOpen(true);
                        }}
                        className="h-9 w-9 p-0 rounded-full hover:bg-purple-100"
                      >
                        <Eye className="w-4 h-4 text-purple-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTenant(tenant);
                          setEditTenantOpen(true);
                        }}
                        className="h-9 w-9 p-0 rounded-full hover:bg-blue-100"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingTenant(tenant);
                          setDeleteTenantOpen(true);
                        }}
                        className="h-9 w-9 p-0 rounded-full hover:bg-red-100"
                      >
                        <Trash className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredTenants.map((tenant) => (
          <Card
            key={tenant.id}
            className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
          >
            <div className="p-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                  <span className="text-white font-bold text-lg">
                    {tenant.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{tenant.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{tenant.email}</p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                      tenant.status === 'Active'
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                        : 'bg-gradient-to-r from-red-400 to-rose-400 text-white'
                    }`}
                  >
                    {tenant.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600">Property</p>
                    <p className="font-semibold text-gray-900 truncate">{tenant.property}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl">
                    <Bed className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600">Room</p>
                      <p className="font-bold text-gray-900">{tenant.room}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <IndianRupee className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-600">Rent</p>
                      <p className="font-bold text-green-700">₹{tenant.rent.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <Phone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">{tenant.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
                  <Calendar className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-600">Joined</p>
                    <p className="font-semibold text-gray-900">{tenant.joinDate}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => {
                    setViewingTenant(tenant);
                    setViewTenantOpen(true);
                  }}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 shadow-md h-11"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button
                  onClick={() => {
                    setEditingTenant(tenant);
                    setEditTenantOpen(true);
                  }}
                  variant="outline"
                  className="border-2 border-blue-300 hover:bg-blue-50 h-11"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  onClick={() => {
                    setDeletingTenant(tenant);
                    setDeleteTenantOpen(true);
                  }}
                  variant="outline"
                  className="border-2 border-red-300 hover:bg-red-50 text-red-600 h-11"
                >
                  <Trash className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Tenant Modal - 6 Sections */}
      <Dialog open={addTenantOpen} onOpenChange={setAddTenantOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Add New Tenant
            </DialogTitle>
            <DialogDescription>Section {addTenantSection} of 6</DialogDescription>
          </DialogHeader>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map((section) => (
              <div
                key={section}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  section <= addTenantSection
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="py-4">{renderAddTenantSection()}</div>

          <DialogFooter className="gap-2">
            {addTenantSection > 1 && (
              <Button variant="outline" onClick={() => setAddTenantSection(addTenantSection - 1)}>
                Previous
              </Button>
            )}
            {addTenantSection < 6 ? (
              <Button
                onClick={() => setAddTenantSection(addTenantSection + 1)}
                className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9]"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleAddTenant}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Save className="w-4 h-4 mr-2" />
                Add Tenant
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Tenant Modal */}
      <Dialog open={viewTenantOpen} onOpenChange={setViewTenantOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Tenant Details
            </DialogTitle>
          </DialogHeader>
          {viewingTenant && (
            <div className="space-y-6 py-4">
              {/* Header */}
              <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-purple-100 via-blue-50 to-purple-50 rounded-2xl border-2 border-purple-200">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-2xl">
                    {viewingTenant.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">{viewingTenant.name}</h3>
                  <p className="text-gray-700 mt-1">{viewingTenant.email}</p>
                  <span
                    className={`inline-block mt-2 px-4 py-1.5 rounded-full text-xs font-bold ${
                      viewingTenant.status === 'Active'
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-white'
                        : 'bg-gradient-to-r from-red-400 to-rose-400 text-white'
                    }`}
                  >
                    {viewingTenant.status}
                  </span>
                </div>
              </div>

              {/* Grid Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-semibold text-gray-900">{viewingTenant.phone}</p>
                    </div>
                    {viewingTenant.alternatePhone && (
                      <div>
                        <span className="text-gray-600">Alternate:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.alternatePhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Property Details */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Property Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Property:</span>
                      <p className="font-semibold text-gray-900">{viewingTenant.property}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Room:</span>
                      <p className="font-semibold text-gray-900">{viewingTenant.room}</p>
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <IndianRupee className="w-5 h-5" />
                    Financial Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Monthly Rent:</span>
                      <p className="font-bold text-green-700 text-lg">₹{viewingTenant.rent.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Security Deposit:</span>
                      <p className="font-semibold text-gray-900">₹{viewingTenant.securityDeposit.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                {viewingTenant.emergencyContact && (
                  <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-xl border border-red-200">
                    <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Emergency Contact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.emergencyContact.name}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.emergencyContact.phone}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Relation:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.emergencyContact.relation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ID Proof */}
                {viewingTenant.idProof && (
                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <h4 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      ID Proof
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.idProof.type}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Number:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.idProof.number}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Info */}
                <div className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Additional Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    {viewingTenant.bloodGroup && (
                      <div>
                        <span className="text-gray-600">Blood Group:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.bloodGroup}</p>
                      </div>
                    )}
                    {viewingTenant.occupation && (
                      <div>
                        <span className="text-gray-600">Occupation:</span>
                        <p className="font-semibold text-gray-900">{viewingTenant.occupation}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Joined:</span>
                      <p className="font-semibold text-gray-900">{viewingTenant.joinDate}</p>
                    </div>
                  </div>
                </div>
              </div>

              {viewingTenant.previousAddress && (
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200">
                  <h4 className="font-bold text-indigo-900 mb-2">Previous Address</h4>
                  <p className="text-sm text-gray-700">{viewingTenant.previousAddress}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (viewingTenant) {
                  setEditingTenant(viewingTenant);
                  setViewTenantOpen(false);
                  setEditTenantOpen(true);
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Modal - Similar to Add but pre-filled */}
      <Dialog open={editTenantOpen} onOpenChange={setEditTenantOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit Tenant
            </DialogTitle>
            <DialogDescription>Update tenant information</DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-sm font-semibold">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="h-11"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-sm font-semibold">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingTenant.email}
                    onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="text-sm font-semibold">Phone *</Label>
                  <Input
                    id="edit-phone"
                    value={editingTenant.phone}
                    onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-property" className="text-sm font-semibold">Property *</Label>
                  <Input
                    id="edit-property"
                    value={editingTenant.property}
                    onChange={(e) => setEditingTenant({ ...editingTenant, property: e.target.value })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-room" className="text-sm font-semibold">Room *</Label>
                  <Input
                    id="edit-room"
                    value={editingTenant.room}
                    onChange={(e) => setEditingTenant({ ...editingTenant, room: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rent" className="text-sm font-semibold">Monthly Rent (₹) *</Label>
                  <Input
                    id="edit-rent"
                    type="number"
                    value={editingTenant.rent}
                    onChange={(e) => setEditingTenant({ ...editingTenant, rent: parseInt(e.target.value) || 0 })}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status" className="text-sm font-semibold">Status</Label>
                  <select
                    id="edit-status"
                    value={editingTenant.status}
                    onChange={(e) => setEditingTenant({ ...editingTenant, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditTenantOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditTenant}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Save className="w-4 h-4 mr-2" />
              Update Tenant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Modal */}
      <AlertDialog open={deleteTenantOpen} onOpenChange={setDeleteTenantOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Tenant?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingTenant?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTenant} className="bg-red-600 hover:bg-red-700 text-white">
              Delete Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
