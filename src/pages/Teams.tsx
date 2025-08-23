import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield, 
  User, 
  MessageSquare, 
  Calendar, 
  Clock, 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Star, 
  TrendingUp, 
  Target, 
  Award, 
  Zap, 
  Globe, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Settings, 
  Bell, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Sparkles, 
  Rocket, 
  Lightbulb, 
  BarChart3, 
  FileText, 
  Share2, 
  Copy, 
  ExternalLink, 
  Download, 
  Upload, 
  RefreshCw, 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Construction,
  Wrench,
  Hammer,
  Cog
} from 'lucide-react';

const Teams = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teams</h1>
            <p className="text-gray-600">Collaborate with your team members</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Construction className="h-4 w-4" />
            Coming Soon
          </Badge>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-6 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Users className="h-10 w-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            Team Collaboration Coming Soon
          </CardTitle>
          <CardDescription className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're building an amazing team collaboration experience that will help you work together seamlessly. 
            Stay tuned for powerful features like team invitations, role management, and real-time collaboration.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-8">
          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4">
              <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Team Invitations</h3>
              <p className="text-sm text-gray-600">
                Invite team members with specific roles and permissions
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Role Management</h3>
              <p className="text-sm text-gray-600">
                Assign different roles: Owner, Admin, Moderator, Member
              </p>
            </div>
            
            <div className="text-center p-4">
              <div className="mx-auto mb-4 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-time Collaboration</h3>
              <p className="text-sm text-gray-600">
                Work together in real-time with live updates and notifications
              </p>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Development Progress</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Database Schema</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Complete
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-700">Backend API</span>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Complete
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cog className="h-5 w-5 text-yellow-500 animate-spin" />
                  <span className="text-sm text-gray-700">Frontend Interface</span>
                </div>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  In Progress
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-500">Testing & Polish</span>
                </div>
                <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">
                  Pending
                </Badge>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="space-y-4">
            <p className="text-gray-600">
              Want to be notified when Teams is ready?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Bell className="h-4 w-4 mr-2" />
                Get Notified
              </Button>
              <Button variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Info className="h-4 w-4" />
              <span>Expected release: Coming soon</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Note */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          In the meantime, you can still use all other features of the platform. 
          Teams functionality will be available soon!
        </p>
      </div>
    </div>
  );
};

export default Teams;