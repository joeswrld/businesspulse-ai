import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useUsageTracking } from '@/hooks/useUsageTracking';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import CustomBarChart from "@/components/BarChart";

import {
  BarChart3,
  Brain,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Target,
  ArrowUpRight,
  Users,
  Activity,
  Zap,
  Clock,
  Database,
  BarChart as BarChartIcon,   // ✅ renamed the lucide-react icon
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  DollarSign,
  Building,
  Globe,
  Rocket,
  Shield,
  Award,
  PieChart as PieChartIcon
} from 'lucide-react';

import {
  BarChart as RechartsBarChart, // ✅ renamed the recharts component
  Bar,
  PieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
