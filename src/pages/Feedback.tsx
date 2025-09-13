import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Search, SlidersHorizontal, Brain } from 'lucide-react';

type FeedbackRow = {
  id: string;
  project_id: string;
  emoji: string | null;
  message: string;
  page_url: string | null;
  browser: string | null;
  created_at: string | null;
};

const PAGE_SIZE = 10;

const Feedback: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [sentiment, setSentiment] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadProject = async () => {
      if (!user) return;
      // Get user's project_id from feedback_settings
      const { data } = await supabase
        .from('feedback_settings')
        .select('project_id')
        .eq('user_id', user.id)
        .maybeSingle();
      const pid = data?.project_id || user.id; // fallback to user.id
      setProjectId(pid);
    };
    loadProject();
  }, [user]);

  useEffect(() => {
    const loadFeedback = async () => {
      if (!projectId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (!error) setRows((data as any) || []);
      setLoading(false);
    };
    loadFeedback();
  }, [projectId]);

  const filtered = useMemo(() => {
    const bySearch = rows.filter(r => r.message.toLowerCase().includes(search.toLowerCase()));
    if (sentiment === 'all') return bySearch;
    const sentimentMap: Record<string, string[]> = {
      angry: ['😡', '😠', '☹️', '🙁'],
      neutral: ['😐', '🙂', '😶'],
      love: ['😍', '❤️', '😊', '😁']
    };
    const allowed = sentimentMap[sentiment] || [];
    return bySearch.filter(r => r.emoji && allowed.includes(r.emoji));
  }, [rows, search, sentiment]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const toggleAll = (checked: boolean) => {
    if (checked) setSelected(new Set(paged.map(r => r.id)));
    else setSelected(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id); else next.delete(id);
    setSelected(next);
  };

  const analyzeSelected = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    navigate(`/insights?ids=${ids}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Feedback Inbox</h1>
          <p className="text-gray-600 mt-1">All feedback collected by your widget</p>
        </div>
        <Button onClick={analyzeSelected} disabled={selected.size === 0} className="bg-blue-600 hover:bg-blue-700">
          <Brain className="h-4 w-4 mr-2" /> Analyze in AI Insight
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center"><MessageSquare className="h-5 w-5 mr-2" /> Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="relative w-full md:max-w-sm">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-gray-400" />
              <Input placeholder="Search messages..." className="pl-8" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-500" />
              <Select value={sentiment} onValueChange={v => { setSentiment(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sentiment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="angry">😡 Angry</SelectItem>
                  <SelectItem value="neutral">😐 Neutral</SelectItem>
                  <SelectItem value="love">😍 Love</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No feedback yet. Share your widget to start collecting!</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox checked={paged.length > 0 && paged.every(r => selected.has(r.id))} onCheckedChange={v => toggleAll(Boolean(v))} />
                    </TableHead>
                    <TableHead>Emoji</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Page URL</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(row => (
                    <TableRow key={row.id} className={selected.has(row.id) ? 'bg-blue-50/50' : ''}>
                      <TableCell>
                        <Checkbox checked={selected.has(row.id)} onCheckedChange={v => toggleOne(row.id, Boolean(v))} />
                      </TableCell>
                      <TableCell>{row.emoji || ''}</TableCell>
                      <TableCell className="max-w-[420px]"><span className="line-clamp-2">{row.message}</span></TableCell>
                      <TableCell>
                        {row.page_url ? (
                          <a href={row.page_url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">{new URL(row.page_url).hostname}</a>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">{row.browser || '-'}</TableCell>
                      <TableCell className="text-gray-600">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">{selected.size} selected</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <Button variant="outline" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Feedback;

