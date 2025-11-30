'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/i18n';

export function PasswordChangeForm() {
  const { t } = useTranslations();
  const { toast } = useToast();
  const { user } = useFirebase();
  const [isLoading, setIsLoading] = React.useState(false);

  const formSchema = z.object({
    currentPassword: z.string().min(1, { message: t.settings.password.errorRequired }),
    newPassword: z.string().min(6, { message: t.settings.password.errorMinLength(6) }),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t.settings.password.errorMismatch,
    path: ['confirmPassword'],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.common.authError,
      });
      return;
    }

    setIsLoading(true);

    try {
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      
      // Re-authenticate user for security
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, values.newPassword);

      toast({
        title: t.settings.password.successTitle,
        description: t.settings.password.successDescription,
      });
      form.reset();

    } catch (error: any) {
      console.error('Password change error:', error);
      let errorMessage = t.settings.password.errorGeneric;
      
      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = t.settings.password.errorWrongCurrent;
          break;
        case 'auth/weak-password':
          errorMessage = t.settings.password.errorWeak;
          break;
        case 'auth/too-many-requests':
           errorMessage = t.login.tooManyRequests;
           break;
      }
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.settings.password.title}</CardTitle>
        <CardDescription>{t.settings.password.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.settings.password.currentPassword}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.settings.password.newPassword}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.settings.password.confirmPassword}</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t.settings.password.saveButton}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
