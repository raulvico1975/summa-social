'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { useOrgUrl } from '@/hooks/organization-provider';
import type { OnboardingCheckResult } from '@/lib/onboarding';

interface OnboardingChecklistProps {
  checks: OnboardingCheckResult[];
  progress: number;
}

export function OnboardingChecklist({ checks, progress }: OnboardingChecklistProps) {
  const { t } = useTranslations();
  const { buildUrl } = useOrgUrl();

  return (
    <Card className="border-blue-200/60 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {t.onboarding?.setupTitle ?? 'Configuració inicial'}
          </CardTitle>
          <span className="text-sm text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.step}>
              <Link
                href={buildUrl(check.href)}
                className="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-blue-100/50 transition-colors group"
              >
                {check.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${check.isComplete ? 'text-muted-foreground line-through' : ''}`}>
                    {check.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {check.description}
                  </p>
                </div>
                {!check.isComplete && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
