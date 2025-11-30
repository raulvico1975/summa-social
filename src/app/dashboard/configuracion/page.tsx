'use client';

import * as React from 'react';
import { CategoryManager } from '@/components/category-manager';
import { useTranslations } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Language } from '@/i18n';

function LanguageSelector() {
  const { t, language, setLanguage } = useTranslations();
  const [selectedLanguage, setSelectedLanguage] = React.useState<Language>(language);
  const { toast } = useToast();

  React.useEffect(() => {
    setSelectedLanguage(language);
  }, [language]);

  const handleSave = () => {
    setLanguage(selectedLanguage);
    toast({
      title: "Idioma guardat",
      description: `L'idioma de l'aplicació s'ha canviat a ${selectedLanguage === 'ca' ? 'Català' : 'Español'}.`
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.language}</CardTitle>
        <CardDescription>{t.settings.languageDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-auto sm:min-w-64">
          <Label htmlFor="language-select">{t.settings.languageSelector}</Label>
          <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
            <SelectTrigger id="language-select">
              <SelectValue placeholder={t.settings.languageSelector} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ca">{t.settings.catalan}</SelectItem>
              <SelectItem value="es">{t.settings.spanish}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleSave}>{t.settings.saveSettings}</Button>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.description}</p>
      </div>
      <LanguageSelector />
      <CategoryManager />
    </div>
  );
}
