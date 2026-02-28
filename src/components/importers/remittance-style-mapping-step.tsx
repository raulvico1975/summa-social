'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BankMappingColumnOption, BankMappingFieldId } from '@/lib/importers/bank/mapping-ui';

type RemittanceStyleFieldDefinition = {
  id: BankMappingFieldId;
  label: string;
  required: boolean;
  allowUnavailable?: boolean;
  dotClassName: string;
  headerClassName: string;
  cellClassName: string;
};

type RemittanceStyleMappingLabels = {
  previewTitle: string;
  fieldMappingTitle: string;
  columnOptionTemplate: string;
  columnHeaderPrefix: string;
  notAvailable: string;
  back: string;
  continue: string;
};

interface RemittanceStyleMappingStepProps {
  fields: RemittanceStyleFieldDefinition[];
  selectedMapping: Record<BankMappingFieldId, number>;
  columns: BankMappingColumnOption[];
  previewRows: string[][];
  previewColumnCount: number;
  previewStartRow: number;
  labels: RemittanceStyleMappingLabels;
  isSubmitting: boolean;
  continueDisabled: boolean;
  onMappingChange: (field: BankMappingFieldId, value: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

const replaceTemplateVars = (template: string, values: Record<string, string>): string => {
  return Object.entries(values).reduce((result, [key, value]) => {
    return result.replace(`{${key}}`, value);
  }, template);
};

export function RemittanceStyleMappingStep({
  fields,
  selectedMapping,
  columns,
  previewRows,
  previewColumnCount,
  previewStartRow,
  labels,
  isSubmitting,
  continueDisabled,
  onMappingChange,
  onBack,
  onContinue,
}: RemittanceStyleMappingStepProps) {
  const selectedFieldByColumn = React.useMemo(() => {
    const map = new Map<number, RemittanceStyleFieldDefinition>();
    for (const field of fields) {
      const selectedColumn = selectedMapping[field.id];
      if (typeof selectedColumn === 'number' && selectedColumn >= 0) {
        map.set(selectedColumn, field);
      }
    }
    return map;
  }, [fields, selectedMapping]);

  const columnByIndex = React.useMemo(() => {
    const map = new Map<number, BankMappingColumnOption>();
    for (const column of columns) {
      map.set(column.index, column);
    }
    return map;
  }, [columns]);

  return (
    <div className="space-y-4 overflow-x-hidden">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          {labels.previewTitle}
        </Label>
        <div className="max-h-[30vh] overflow-auto rounded-md border sm:max-h-[220px]">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-xs">#</TableHead>
                {Array.from({ length: previewColumnCount }, (_, index) => {
                  const selectedField = selectedFieldByColumn.get(index);
                  const column = columnByIndex.get(index);
                  const headerLabel = column?.label
                    ? column.label
                    : `${labels.columnHeaderPrefix}${index}`;
                  return (
                    <TableHead
                      key={`head-${index}`}
                      className={`text-xs min-w-[110px] whitespace-nowrap ${selectedField?.headerClassName ?? ''}`}
                    >
                      {headerLabel}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, rowIndex) => (
                <TableRow key={`row-${rowIndex}`}>
                  <TableCell className="text-xs text-muted-foreground">
                    {previewStartRow + rowIndex}
                  </TableCell>
                  {Array.from({ length: previewColumnCount }, (_, columnIndex) => {
                    const selectedField = selectedFieldByColumn.get(columnIndex);
                    return (
                      <TableCell
                        key={`cell-${rowIndex}-${columnIndex}`}
                        className={`text-xs truncate whitespace-nowrap max-w-[180px] ${selectedField?.cellClassName ?? ''}`}
                      >
                        {row[columnIndex] || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <Label className="font-medium">{labels.fieldMappingTitle}</Label>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id} className="min-w-0 space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <span className={`h-3 w-3 rounded ${field.dotClassName}`}></span>
                {field.label}
              </Label>
              <Select
                value={selectedMapping[field.id] !== -1 ? String(selectedMapping[field.id]) : 'none'}
                onValueChange={(value) => onMappingChange(field.id, value === 'none' ? -1 : Number.parseInt(value, 10))}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(field.allowUnavailable || !field.required) && (
                    <SelectItem value="none">{labels.notAvailable}</SelectItem>
                  )}
                  {columns.map((column) => (
                    <SelectItem key={`${field.id}-${column.index}`} value={String(column.index)}>
                      {column.label
                        ? `${column.label}: ${column.sample || '-'}`
                        : replaceTemplateVars(labels.columnOptionTemplate, {
                          index: String(column.index),
                          example: column.sample || '-',
                        })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex w-full flex-col-reverse gap-2 border-t bg-background/95 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-3 shadow-[0_-8px_16px_-14px_rgba(0,0,0,0.35)] backdrop-blur supports-[backdrop-filter]:bg-background/90 sm:flex-row sm:justify-end">
        <Button className="w-full sm:w-auto" onClick={onContinue} disabled={isSubmitting || continueDisabled}>
          <ArrowRight className="mr-2 h-4 w-4" />
          {labels.continue}
        </Button>
        <Button className="w-full sm:w-auto" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {labels.back}
        </Button>
      </div>
    </div>
  );
}
