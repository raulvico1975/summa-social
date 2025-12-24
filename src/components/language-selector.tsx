'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslations, Language } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { Globe } from 'lucide-react';

export function LanguageSelector() {
  const { language, setLanguage, t } = useTranslations();
  const { toast } = useToast();

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);

    const languageName =
      newLanguage === 'ca' ? t.settings.catalan :
      newLanguage === 'es' ? t.settings.spanish :
      'Français';

    toast({
      title: t.settings.languageSaved,
      description: t.settings.languageSavedDescription(languageName),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {t.settings.language}
        </CardTitle>
        <CardDescription>
          {t.settings.languageDescription}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="language-select">{t.settings.languageSelector}</Label>
          <Select value={language} onValueChange={(value) => handleLanguageChange(value as Language)}>
            <SelectTrigger id="language-select" className="w-full">
              <SelectValue placeholder={t.settings.languageSelector} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ca">{t.settings.catalan}</SelectItem>
              <SelectItem value="es">{t.settings.spanish}</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
