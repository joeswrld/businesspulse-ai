import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Filter, Search, Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { FeedbackFilters } from '@/utils/feedbackUtils';

interface FeedbackFiltersProps {
  filters: FeedbackFilters;
  onFiltersChange: (filters: FeedbackFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

export default function FeedbackFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters,
  className 
}: FeedbackFiltersProps) {
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  const handleFilterChange = (key: keyof FeedbackFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const hasActiveFilters = 
    filters.formType !== 'all' ||
    filters.rating !== 'all' ||
    filters.searchQuery ||
    filters.dateRange?.start ||
    filters.dateRange?.end;

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filters</span>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="ml-auto"
            >
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Form Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="form-type">Form Type</Label>
            <Select 
              value={filters.formType || 'all'} 
              onValueChange={(value) => handleFilterChange('formType', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer_satisfaction">Customer Satisfaction</SelectItem>
                <SelectItem value="product_feedback">Product Feedback</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rating Filter */}
          <div className="space-y-2">
            <Label htmlFor="rating">Rating</Label>
            <Select 
              value={filters.rating === 'all' ? 'all' : filters.rating?.toString() || 'all'} 
              onValueChange={(value) => handleFilterChange('rating', value === 'all' ? 'all' : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Ratings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !filters.dateRange?.start && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange?.start ? (
                    filters.dateRange?.end ? (
                      <>
                        {format(filters.dateRange.start, "LLL dd, y")} -{" "}
                        {format(filters.dateRange.end, "LLL dd, y")}
                      </>
                    ) : (
                      format(filters.dateRange.start, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange?.start}
                  selected={filters.dateRange as any}
                  onSelect={(range) => {
                    handleFilterChange('dateRange', range as any);
                    setDatePickerOpen(false);
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Filter */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search messages..."
                value={filters.searchQuery || ''}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 mr-2">Quick filters:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('formType', 'customer_satisfaction')}
              className={filters.formType === 'customer_satisfaction' ? 'bg-blue-50 border-blue-200' : ''}
            >
              Satisfaction Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('formType', 'product_feedback')}
              className={filters.formType === 'product_feedback' ? 'bg-blue-50 border-blue-200' : ''}
            >
              Product Feedback Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('rating', 5)}
              className={filters.rating === 5 ? 'bg-blue-50 border-blue-200' : ''}
            >
              5 Star Ratings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('rating', 1)}
              className={filters.rating === 1 ? 'bg-blue-50 border-blue-200' : ''}
            >
              1 Star Ratings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                handleFilterChange('dateRange', { start: lastWeek, end: new Date() });
              }}
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const lastMonth = new Date();
                lastMonth.setDate(lastMonth.getDate() - 30);
                handleFilterChange('dateRange', { start: lastMonth, end: new Date() });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}