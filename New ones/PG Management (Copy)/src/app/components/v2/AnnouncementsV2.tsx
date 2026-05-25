"use client";

import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import {
  Plus,
  Bell,
  Pin,
  Edit,
  MessageCircle,
  Eye,
  Send
} from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Maintenance' | 'Payment' | 'Rules' | 'General';
  date: string;
  views: number;
  isPinned: boolean;
  sentViaWhatsApp: boolean;
}

export function AnnouncementsV2() {
  const [filterCategory, setFilterCategory] = useState<'All' | 'Maintenance' | 'Payment' | 'Rules' | 'General'>('All');
  const [showNewAnnouncementModal, setShowNewAnnouncementModal] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'General' as 'Maintenance' | 'Payment' | 'Rules' | 'General'
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    {
      id: '1',
      title: 'Water Supply Maintenance - May 15th',
      content: 'Water supply will be temporarily suspended on May 15th from 9 AM to 2 PM for tank cleaning. Please store water accordingly.',
      category: 'Maintenance',
      date: '2026-05-10',
      views: 24,
      isPinned: true,
      sentViaWhatsApp: true
    },
    {
      id: '2',
      title: 'Rent Payment Due - May 31st',
      content: 'Friendly reminder that rent payment for June is due by May 31st. Please ensure timely payment to avoid late fees.',
      category: 'Payment',
      date: '2026-05-09',
      views: 32,
      isPinned: true,
      sentViaWhatsApp: true
    },
    {
      id: '3',
      title: 'New Parking Rules Effective June 1st',
      content: 'New parking slot allocations will be effective from June 1st. Please check your assigned parking number on the notice board.',
      category: 'Rules',
      date: '2026-05-08',
      views: 18,
      isPinned: false,
      sentViaWhatsApp: true
    },
    {
      id: '4',
      title: 'Community Gathering - May 20th',
      content: 'Join us for a community gathering on May 20th at 6 PM in the common area. Light refreshments will be provided.',
      category: 'General',
      date: '2026-05-07',
      views: 15,
      isPinned: false,
      sentViaWhatsApp: false
    },
    {
      id: '5',
      title: 'Elevator Maintenance Schedule',
      content: 'Elevator maintenance will be conducted every Sunday from 10 AM to 12 PM. Please use the stairs during this time.',
      category: 'Maintenance',
      date: '2026-05-05',
      views: 28,
      isPinned: false,
      sentViaWhatsApp: true
    },
    {
      id: '6',
      title: 'Security Deposit Refund Process',
      content: 'Tenants planning to vacate should submit a notice 30 days in advance. Security deposit refund will be processed within 15 days after inspection.',
      category: 'Payment',
      date: '2026-05-03',
      views: 12,
      isPinned: false,
      sentViaWhatsApp: false
    },
    {
      id: '7',
      title: 'Noise Policy Reminder',
      content: 'Please maintain silence after 10 PM. Loud music and gatherings should be concluded by this time to respect your neighbors.',
      category: 'Rules',
      date: '2026-05-01',
      views: 22,
      isPinned: false,
      sentViaWhatsApp: true
    },
    {
      id: '8',
      title: 'Guest Registration Requirement',
      content: 'All guests staying overnight must be registered with the security desk. Please provide guest details at least 24 hours in advance.',
      category: 'Rules',
      date: '2026-04-28',
      views: 19,
      isPinned: false,
      sentViaWhatsApp: false
    }
  ]);

  const togglePin = (id: string) => {
    setAnnouncements(announcements.map(a =>
      a.id === id ? { ...a, isPinned: !a.isPinned } : a
    ));
  };

  const filteredAnnouncements = announcements.filter(
    announcement => filterCategory === 'All' || announcement.category === filterCategory
  );

  const pinnedAnnouncements = filteredAnnouncements.filter(a => a.isPinned);
  const regularAnnouncements = filteredAnnouncements.filter(a => !a.isPinned);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Maintenance':
        return 'bg-blue-100 text-blue-700';
      case 'Payment':
        return 'bg-green-100 text-green-700';
      case 'Rules':
        return 'bg-red-100 text-red-700';
      case 'General':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <Button
          onClick={() => setShowNewAnnouncementModal(true)}
          className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 mb-6">
        {(['All', 'Maintenance', 'Payment', 'Rules', 'General'] as const).map((category) => (
          <button
            key={category}
            onClick={() => setFilterCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === category
                ? 'bg-[#4F46E5] text-white'
                : 'bg-white text-gray-700 border border-[#E2E8F0] hover:bg-gray-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Pinned Announcements Section */}
      {pinnedAnnouncements.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Pin className="w-5 h-5 text-[#4F46E5]" />
            Pinned Announcements
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {pinnedAnnouncements.map((announcement) => (
              <Card
                key={announcement.id}
                className="border-[#E2E8F0] bg-gradient-to-r from-purple-50 to-blue-50"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Pin className="w-5 h-5 text-[#4F46E5]" />
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(announcement.category)}`}>
                          {announcement.category}
                        </span>
                        {announcement.sentViaWhatsApp && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Eye className="w-3 h-3" />
                          {announcement.views} views
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{announcement.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{announcement.content}</p>
                      <p className="text-xs text-gray-500">{new Date(announcement.date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePin(announcement.id)}
                        className="text-[#4F46E5] hover:text-[#4338CA]"
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                      >
                        {announcement.sentViaWhatsApp ? <MessageCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Announcements Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">All Announcements</h2>
        <div className="grid grid-cols-1 gap-4">
          {regularAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              className="border-[#E2E8F0] hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(announcement.category)}`}>
                        {announcement.category}
                      </span>
                      {announcement.sentViaWhatsApp && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Eye className="w-3 h-3" />
                        {announcement.views} views
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{announcement.title}</h3>
                    <p className="text-sm text-gray-600 mb-3">{announcement.content}</p>
                    <p className="text-xs text-gray-500">{new Date(announcement.date).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePin(announcement.id)}
                      className="text-gray-400 hover:text-[#4F46E5]"
                    >
                      <Pin className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                    >
                      {announcement.sentViaWhatsApp ? <MessageCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* New Announcement Modal */}
      <Dialog open={showNewAnnouncementModal} onOpenChange={setShowNewAnnouncementModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Announcement</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const announcement: Announcement = {
              id: String(announcements.length + 1),
              title: newAnnouncement.title,
              content: newAnnouncement.content,
              category: newAnnouncement.category,
              date: new Date().toISOString().split('T')[0],
              views: 0,
              isPinned: false,
              sentViaWhatsApp: false
            };
            setAnnouncements([announcement, ...announcements]);
            toast.success('Announcement created successfully!');
            setShowNewAnnouncementModal(false);
            setNewAnnouncement({ title: '', content: '', category: 'General' });
          }} className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                required
                placeholder="e.g., Water Supply Maintenance"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
              />
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea
                required
                placeholder="Detailed announcement message..."
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                rows={4}
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={newAnnouncement.category} onValueChange={(val: any) => setNewAnnouncement({...newAnnouncement, category: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Payment">Payment</SelectItem>
                  <SelectItem value="Rules">Rules</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowNewAnnouncementModal(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#4F46E5] hover:bg-[#4338CA]">
                Create Announcement
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
