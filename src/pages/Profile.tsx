import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Building, 
  Crown, 
  Trophy, 
  Star,
  MessageSquare, 
  FileText, 
  Users, 
  Settings, 
  Clock,
  CheckCircle,
  Sparkles,
  Target
} from 'lucide-react';

// Mock data
const mockUser = {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Inc.',
  avatarUrl: null
};

const mockStats = {
  totalFeedback: 45,
  totalReports: 12,
  teamMembers: 3,
  lastActive: new Date().toLocaleString()
};

const mockPlan = {
  name: 'Pro',
  type: 'pro',
  daysLeft: 0,
  isTrial: false
};

export default function EnhancedProfilePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const achievements = [
    {
      id: 'first-feedback',
      title: 'First Feedback',
      description: 'Submit your first piece of feedback',
      icon: <MessageSquare className="h-5 w-5" />,
      unlocked: true,
      progress: 1,
      maxProgress: 1
    },
    {
      id: 'feedback-collector',
      title: 'Feedback Collector',
      description: 'Collect 10 pieces of feedback',
      icon: <MessageSquare className="h-5 w-5" />,
      unlocked: true,
      progress: 10,
      maxProgress: 10
    },
    {
      id: 'first-report',
      title: 'First Report',
      description: 'Generate your first insights report',
      icon: <FileText className="h-5 w-5" />,
      unlocked: true,
      progress: 1,
      maxProgress: 1
    },
    {
      id: 'report-master',
      title: 'Report Master',
      description: 'Generate 5 insights reports',
      icon: <FileText className="h-5 w-5" />,
      unlocked: true,
      progress: 5,
      maxProgress: 5
    },
    {
      id: 'team-player',
      title: 'Team Player',
      description: 'Invite your first team member',
      icon: <Users className="h-5 w-5" />,
      unlocked: true,
      progress: 1,
      maxProgress: 1
    },
    {
      id: 'power-user',
      title: 'Power User',
      description: 'Use all major features',
      icon: <Trophy className="h-5 w-5" />,
      unlocked: false,
      progress: 5,
      maxProgress: 7
    }
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 transition-colors duration-300">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">Your Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome back! Here's your activity overview and achievements.</p>
        </div>

        {/* User Info Card */}
        <div className="max-w-2xl mx-auto">
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors">
            <div className="p-8">
              <div className="text-center space-y-6">
                {/* Profile Picture */}
                <div className="relative mx-auto group w-32 h-32">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 flex items-center justify-center overflow-hidden border-4 border-blue-200 dark:border-blue-800 shadow-lg transition-all duration-200 group-hover:border-blue-300 dark:group-hover:border-blue-600 group-hover:shadow-xl">
                    {mockUser.avatarUrl ? (
                      <img src={mockUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-16 w-16 text-blue-600 dark:text-blue-400" />
                    )}
                    {/* Upload Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium">Change Photo</span>
                      </div>
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 p-2 rounded-full shadow-lg">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Upload Button */}
                <label className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white font-semibold rounded-xl cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinej
