'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ca, es } from 'date-fns/locale';
import { useTranslations } from '@/i18n';

export type FilterType = 'all' | 'year' | 'quarter' | 'month' | 'custom';

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

export type DateFilterValue = {
  type: FilterType;
  year?: number;
  quarter?: 1 | 2 | 3 | 4;
  month?: number;
  customRange?: DateRange;
};

type DateFilterProps = {
  value: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
};

export function DateFilter({ value, onChange }: DateFilterProps) {
  const { t, tr, language } = useTranslations();
  const dateLocale = language === 'ca' ? ca : es;

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const handleTypeChange = (type: FilterType) => {
    if (type === 'all') {
      onChange({ type: 'all' });
    } else if (type === 'year') {
      onChange({ type: 'year', year: currentYear });
    } else if (type === 'quarter') {
      onChange({ type: 'quarter', year: currentYear, quarter: 1 });
    } else if (type === 'month') {
      onChange({ type: 'month', year: currentYear, month: 1 });
    } else if (type === 'custom') {
      onChange({ type: 'custom', customRange: { from: null, to: null } });
    }
  };

  const handleYearChange = (year: number) => {
    onChange({ ...value, year });
  };

  const handleQuarterChange = (quarter: 1 | 2 | 3 | 4) => {
    onChange({ ...value, quarter });
  };

  const handleMonthChange = (month: number) => {
    onChange({ ...value, month });
  };

  const handleCustomRangeChange = (range: DateRange) => {
    onChange({ ...value, customRange: range });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={value.type} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{tr("dashboard.filterAll")}</SelectItem>
          <SelectItem value="year">{tr("dashboard.filterYear")}</SelectItem>
          <SelectItem value="quarter">{tr("dashboard.filterQuarter")}</SelectItem>
          <SelectItem value="month">{tr("dashboard.filterMonth")}</SelectItem>
          <SelectItem value="custom">{tr("dashboard.filterCustom")}</SelectItem>
        </SelectContent>
      </Select>

      {value.type === 'year' && (
        <Select
          value={value.year?.toString()}
          onValueChange={(v) => handleYearChange(parseInt(v))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.type === 'quarter' && (
        <>
          <Select
            value={value.year?.toString()}
            onValueChange={(v) => handleYearChange(parseInt(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.quarter?.toString()}
            onValueChange={(v) => handleQuarterChange(parseInt(v) as 1 | 2 | 3 | 4)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Q1</SelectItem>
              <SelectItem value="2">Q2</SelectItem>
              <SelectItem value="3">Q3</SelectItem>
              <SelectItem value="4">Q4</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}

      {value.type === 'month' && (
        <>
          <Select
            value={value.year?.toString()}
            onValueChange={(v) => handleYearChange(parseInt(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={value.month?.toString()}
            onValueChange={(v) => handleMonthChange(parseInt(v))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month.toString()}>
                  {format(new Date(2024, month - 1), 'MMMM', { locale: dateLocale })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {value.type === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !value.customRange?.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.customRange?.from ? (
                  format(value.customRange.from, 'dd/MM/yyyy')
                ) : (
                  <span>{tr("dashboard.filterFrom")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.customRange?.from || undefined}
                onSelect={(date) =>
                  handleCustomRangeChange({
                    from: date || null,
                    to: value.customRange?.to || null,
                  })
                }
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground">-</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[140px] justify-start text-left font-normal',
                  !value.customRange?.to && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value.customRange?.to ? (
                  format(value.customRange.to, 'dd/MM/yyyy')
                ) : (
                  <span>{tr("dashboard.filterTo")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.customRange?.to || undefined}
                onSelect={(date) =>
                  handleCustomRangeChange({
                    from: value.customRange?.from || null,
                    to: date || null,
                  })
                }
                initialFocus
                locale={dateLocale}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
