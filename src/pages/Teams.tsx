import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserPlus,
  Settings,
  MessageSquare,
  Calendar,
  FileText,
  BarChart3,
  Bell,
  Shield,
  Globe,
  Zap,
  Sparkles,
  Clock
} from 'lucide-react';

const Teams: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Users className="h-10 w-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Collaboration</h1>
          <p className="text-muted-foreground">Coming Soon - Powerful team features are on the way!</p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Clock className="h-3 w-3 mr-1" />
          Expected Q2 2024
        </Badge>
      </div>

      {/* Coming Soon Features */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Team Management */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-lg">Team Management</CardTitle>
            <CardDescription>
              Create and manage teams with role-based access control
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Invite team members</li>
              <li>• Set permissions and roles</li>
              <li>• Manage team settings</li>
            </ul>
          </CardContent>
        </Card>

        {/* Real-time Collaboration */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">Real-time Collaboration</CardTitle>
            <CardDescription>
              Work together on insights and reports in real-time
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Live editing and comments</li>
              <li>• Team chat and discussions</li>
              <li>• Activity tracking</li>
            </ul>
          </CardContent>
        </Card>

        {/* Shared Workspaces */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">Shared Workspaces</CardTitle>
            <CardDescription>
              Organize projects and insights in collaborative spaces
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Project organization</li>
              <li>• Shared dashboards</li>
              <li>• Team analytics</li>
            </ul>
          </CardContent>
        </Card>

        {/* Advanced Permissions */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle className="text-lg">Advanced Permissions</CardTitle>
            <CardDescription>
              Granular control over who can see and edit what
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Role-based access</li>
              <li>• Data privacy controls</li>
              <li>• Audit logging</li>
            </ul>
          </CardContent>
        </Card>

        {/* Team Analytics */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-3">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle className="text-lg">Team Analytics</CardTitle>
            <CardDescription>
              Track team performance and collaboration metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Team productivity metrics</li>
              <li>• Collaboration insights</li>
              <li>• Performance dashboards</li>
            </ul>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-dashed border-2 border-muted">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-pink-600" />
            </div>
            <CardTitle className="text-lg">Integrations</CardTitle>
            <CardDescription>
              Connect with your favorite team tools and platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Slack integration</li>
              <li>• Microsoft Teams</li>
              <li>• Google Workspace</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Early Access */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
            Get Early Access
          </CardTitle>
          <CardDescription>
            Be among the first to experience our team collaboration features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              We're building powerful team collaboration features that will transform how your team works with AI insights. 
              Sign up for early access to get exclusive updates and beta testing opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button className="flex-1">
                <UserPlus className="h-4 w-4 mr-2" />
                Join Waitlist
              </Button>
              <Button variant="outline" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Request Demo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-green-500" />
            Development Roadmap
          </CardTitle>
          <CardDescription>
            See what's coming and when
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium">Q1 2024</span>
              <span className="text-sm text-muted-foreground">Foundation & Planning</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium">Q2 2024</span>
              <span className="text-sm text-muted-foreground">Beta Release</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="text-sm font-medium">Q3 2024</span>
              <span className="text-sm text-muted-foreground">Public Release</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
              <span className="text-sm font-medium">Q4 2024</span>
              <span className="text-sm text-muted-foreground">Advanced Features</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-purple-500" />
            Have Questions?
          </CardTitle>
          <CardDescription>
            We'd love to hear from you about team collaboration needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Our team is actively working on these features. If you have specific requirements or 
              would like to provide feedback, we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="flex-1">
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Feature Request
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Teams;