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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                </label>

                {/* Upload Instructions */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {selectedFile ? `Selected: ${selectedFile.name}` : 'Click the button above to upload your logo'}
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-400 dark:text-gray-500">
                    <span>• JPG, PNG, GIF up to 5MB</span>
                  </div>
                </div>

                {/* Name and Email */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {mockUser.firstName} {mockUser.lastName}
                  </h2>
                  <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4" />
                    <span>{mockUser.email}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400">
                    <Building className="h-4 w-4" />
                    <span>{mockUser.company}</span>
                  </div>
                </div>

                {/* Plan Badge */}
                <div className="flex items-center justify-center">
                  <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-800 rounded-full text-sm font-medium flex items-center space-x-2">
                    <Crown className="h-4 w-4" />
                    <span>{mockPlan.name} Plan</span>
                  </div>
                </div>

                {/* Edit Button */}
                <button className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors mx-auto">
                  <Settings className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Overview */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Activity Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Feedback */}
            <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors text-center">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full mx-auto mb-4">
                  <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Total Feedback</h4>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{mockStats.totalFeedback}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">pieces collected</p>
              </div>
            </div>

            {/* Total Reports */}
            <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors text-center">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full mx-auto mb-4">
                  <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Reports Generated</h4>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{mockStats.totalReports}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">insights created</p>
              </div>
            </div>

            {/* Team Members */}
            <div className="rounded-xl border-2 border-blue-100 dark:border-blue-900 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-colors text-center">
              <div className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-full mx-auto mb-4">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Team Members</h4>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{mockStats.teamMembers}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">collaborators</p>
              </div>
            </div>
          </div>

          {/* Last Active */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">
              <Clock className="h-4 w-4" />
              <span>Last active: {mockStats.lastActive}</span>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Your Achievements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map((achievement) => (
              <div 
                key={achievement.id}
                className={`rounded-xl border-2 shadow-lg transition-all duration-200 ${
                  achievement.unlocked 
                    ? 'border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-950/30' 
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50'
                } backdrop-blur-sm`}
              >
                <div className="p-6 text-center">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-4 ${
                    achievement.unlocked 
                      ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}>
                    {achievement.icon}
                  </div>
                  
                  <h4 className={`font-semibold mb-2 ${
                    achievement.unlocked ? 'text-green-900 dark:text-green-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {achievement.title}
                  </h4>
                  
                  <p className={`text-sm mb-4 ${
                    achievement.unlocked ? 'text-green-700 dark:text-green-300' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {achievement.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className={achievement.unlocked ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                        Progress
                      </span>
                      <span className={achievement.unlocked ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}>
                        {achievement.progress}/{achievement.maxProgress}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          achievement.unlocked 
                            ? 'bg-gradient-to-r from-green-600 to-green-400' 
                            : 'bg-gray-400 dark:bg-gray-600'
                        }`}
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4">
                    {achievement.unlocked ? (
                      <div className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-full text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        <span>Unlocked</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium">
                        Locked
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Achievement Summary */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-6 py-3 rounded-full">
              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-800 dark:text-blue-300 font-medium">
                {unlockedCount} of {achievements.length} achievements unlocked
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Quick Actions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <MessageSquare className="h-5 w-5" />
              <span>View Feedback</span>
            </button>
            
            <button className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <Sparkles className="h-5 w-5" />
              <span>Generate Insights</span>
            </button>
            
            <button className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <FileText className="h-5 w-5" />
              <span>View Reports</span>
            </button>
            
            <button className="h-16 text-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-all flex items-center justify-center space-x-2 text-gray-900 dark:text-gray-100">
              <Crown className="h-5 w-5" />
              <span>Manage Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
