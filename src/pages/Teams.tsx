import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Sparkles, Rocket, Lightbulb, Globe, MessageSquare, BarChart3, Shield } from 'lucide-react';

const Teams: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Collaborate with your team in real-time
          </p>
        </div>
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
          <Sparkles className="h-3 w-3 mr-1" />
          Coming Soon
        </Badge>
      </div>

      {/* Coming Soon Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Team Collaboration */}
        <Card className="border-2 border-dashed border-muted-foreground/20">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Collaboration</CardTitle>
                <CardDescription>Real-time collaboration features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                <span>Team chat and messaging</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>Shared analytics dashboards</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Role-based permissions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Management */}
        <Card className="border-2 border-dashed border-muted-foreground/20">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Management</CardTitle>
                <CardDescription>Create and manage teams</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Invite team members</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>Public and private teams</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Advanced security controls</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Analytics */}
        <Card className="border-2 border-dashed border-muted-foreground/20">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Team Analytics</CardTitle>
                <CardDescription>Insights and performance tracking</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span>Team performance metrics</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                <span>AI-powered insights</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Rocket className="h-4 w-4" />
                <span>Productivity optimization</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Message */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center py-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Teams Feature Coming Soon!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We're working hard to bring you powerful team collaboration features. 
            Get ready for real-time collaboration, team analytics, and seamless project management.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="outline" className="bg-white">
              <Rocket className="h-3 w-3 mr-1" />
              Q1 2024
            </Badge>
            <Badge variant="outline" className="bg-white">
              <Users className="h-3 w-3 mr-1" />
              Beta Access
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Real-time Communication</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Built-in chat, video calls, and screen sharing for seamless team collaboration.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Team Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Track team performance, productivity metrics, and collaboration insights.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Advanced Security</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enterprise-grade security with role-based access control and audit logs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Global Collaboration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Connect with teams worldwide with multi-language support and timezone management.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Teams;