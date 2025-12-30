'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Transaction, Contact, OrganizationMember, Category } from '@/lib/data';
import { SUPER_ADMIN_UID } from '@/lib/data';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  Shield,
  Users,
  FileText,
  Download,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Clock,
  UserCheck,
  FileDown,
  RefreshCw,
  SearchCheck,
  Copy,
  Unlink,
  Link2Off,
  Trash2,
  Languages,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { I18nManager } from '@/components/super-admin/i18n-manager';

// ════════════════════════════════════════════════════════════════════════════
// TIPUS
// ════════════════════════════════════════════════════════════════════════════

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'TRANSACTION' | 'CONTACT' | 'MEMBER' | 'CATEGORY' | 'ORGANIZATION';
  entityId: string;
  entityName?: string;
  changes?: Array<{ field: string; before: string; after: string }>;
  description: string;
}

interface SystemHealth {
  uncategorizedTx: number;
  incompleteContacts: number;
  pendingReturns: number;
  riskyDonors: number;
}

interface ExportOption {
  id: string;
  labelKey: string;
  collection: string;
  count: number;
  selected: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export default function SuperAdminOrgPage() {
  const router = useRouter();
  const { user, firestore, isUserLoading } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { t, language } = useTranslations();
  const locale = language === 'es' ? 'es-ES' : 'ca-ES';
  const { toast } = useToast();

  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  // ══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ══════════════════════════════════════════════════════════════════════════

  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: transactions, isLoading: txLoading } = useCollection<Transaction>(transactionsQuery);

  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts, isLoading: contactsLoading } = useCollection<Contact>(contactsQuery);

  const membersQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'members') : null,
    [firestore, organizationId]
  );
  const { data: members, isLoading: membersLoading } = useCollection<OrganizationMember>(membersQuery);

  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // Audit logs query - pot fallar si no hi ha permisos, ho gestionem amb try/catch
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = React.useState(true);
  const [auditError, setAuditError] = React.useState(false);

  React.useEffect(() => {
    if (!organizationId || !isSuperAdmin) {
      setAuditLoading(false);
      return;
    }

    const auditRef = collection(firestore, 'organizations', organizationId, 'audit_logs');
    const auditQuery = query(auditRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      auditQuery,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
        setAuditLogs(logs);
        setAuditLoading(false);
        setAuditError(false);
      },
      (error) => {
        console.warn('Audit logs not available:', error.message);
        setAuditLoading(false);
        setAuditError(true);
      }
    );

    return () => unsubscribe();
  }, [firestore, organizationId, isSuperAdmin]);

  // ══════════════════════════════════════════════════════════════════════════
  // ESTATS
  // ══════════════════════════════════════════════════════════════════════════

  const [exportOptions, setExportOptions] = React.useState<ExportOption[]>([]);
  const [isExporting, setIsExporting] = React.useState(false);
  const [auditFilter, setAuditFilter] = React.useState<string>('all');

  // Inicialitzar opcions d'exportació
  React.useEffect(() => {
    setExportOptions([
      { id: 'transactions', labelKey: 'transactions', collection: 'transactions', count: transactions?.length || 0, selected: true },
      { id: 'contacts', labelKey: 'contacts', collection: 'contacts', count: contacts?.length || 0, selected: true },
      { id: 'members', labelKey: 'members', collection: 'members', count: members?.length || 0, selected: true },
      { id: 'categories', labelKey: 'categories', collection: 'categories', count: categories?.length || 0, selected: true },
    ]);
  }, [transactions, contacts, members, categories]);

  // ══════════════════════════════════════════════════════════════════════════
  // CÀLCULS
  // ══════════════════════════════════════════════════════════════════════════

  // Estadístiques generals
  const stats = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentTx = transactions?.filter(tx => new Date(tx.date) >= thirtyDaysAgo).length || 0;
    const lastUpdate = transactions?.reduce((latest, tx) => {
      const txDate = new Date(tx.date);
      return txDate > latest ? txDate : latest;
    }, new Date(0));

    return {
      totalMembers: members?.length || 0,
      totalTransactions: transactions?.length || 0,
      totalContacts: contacts?.length || 0,
      recentActivity: recentTx,
      lastUpdate: lastUpdate && lastUpdate.getTime() > 0 ? lastUpdate : null,
    };
  }, [transactions, contacts, members]);

  // Salut del sistema
  const systemHealth = React.useMemo((): SystemHealth => {
    const uncategorizedTx = transactions?.filter(tx =>
      tx.category === null || tx.category === 'Revisar'
    ).length || 0;

    const incompleteContacts = contacts?.filter(c =>
      !c.taxId || !c.zipCode
    ).length || 0;

    const pendingReturns = transactions?.filter(tx =>
      tx.donationStatus === 'returned' || tx.transactionType === 'return'
    ).length || 0;

    // Donants amb 3 o més devolucions
    const donorReturnCounts = new Map<string, number>();
    transactions?.forEach(tx => {
      if (tx.transactionType === 'return' && tx.contactId) {
        donorReturnCounts.set(tx.contactId, (donorReturnCounts.get(tx.contactId) || 0) + 1);
      }
    });
    const riskyDonors = Array.from(donorReturnCounts.values()).filter(count => count >= 3).length;

    return { uncategorizedTx, incompleteContacts, pendingReturns, riskyDonors };
  }, [transactions, contacts]);

  // Qualitat de dades
  const dataQuality = React.useMemo(() => {
    const totalTx = transactions?.length || 0;
    const categorizedTx = transactions?.filter(tx => tx.category && tx.category !== 'Revisar').length || 0;
    const txWithContact = transactions?.filter(tx => tx.contactId).length || 0;

    const totalContacts = contacts?.length || 0;
    const completeContacts = contacts?.filter(c => c.taxId && c.zipCode).length || 0;

    return {
      categorizedPercent: totalTx > 0 ? Math.round((categorizedTx / totalTx) * 100) : 100,
      withContactPercent: totalTx > 0 ? Math.round((txWithContact / totalTx) * 100) : 100,
      completeContactsPercent: totalContacts > 0 ? Math.round((completeContacts / totalContacts) * 100) : 100,
    };
  }, [transactions, contacts]);

  // Filtrar logs d'auditoria
  const filteredAuditLogs = React.useMemo(() => {
    if (!auditLogs) return [];
    if (auditFilter === 'all') return auditLogs.slice(0, 50); // Limitar a 50
    return auditLogs.filter(log => log.entityType === auditFilter).slice(0, 50);
  }, [auditLogs, auditFilter]);

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDACIÓ DE DADES
  // ══════════════════════════════════════════════════════════════════════════

  // Contactes duplicats (mateix NIF)
  const duplicateContacts = React.useMemo(() => {
    if (!contacts) return [];
    const nifMap = new Map<string, Contact[]>();

    contacts.forEach(contact => {
      if (contact.taxId && contact.taxId.trim()) {
        const normalizedNif = contact.taxId.trim().toUpperCase();
        const existing = nifMap.get(normalizedNif) || [];
        existing.push(contact);
        nifMap.set(normalizedNif, existing);
      }
    });

    // Retornar només els que tenen duplicats
    const duplicates: { nif: string; contacts: Contact[] }[] = [];
    nifMap.forEach((contactList, nif) => {
      if (contactList.length > 1) {
        duplicates.push({ nif, contacts: contactList });
      }
    });

    return duplicates;
  }, [contacts]);

  // Contactes sense transaccions (orfes)
  const orphanContacts = React.useMemo(() => {
    if (!contacts || !transactions) return [];

    const contactIdsWithTx = new Set<string>();
    transactions.forEach(tx => {
      if (tx.contactId) contactIdsWithTx.add(tx.contactId);
    });

    return contacts.filter(contact => !contactIdsWithTx.has(contact.id));
  }, [contacts, transactions]);

  // Transaccions amb contactId invàlid
  const invalidContactTx = React.useMemo(() => {
    if (!transactions || !contacts) return [];

    const validContactIds = new Set(contacts.map(c => c.id));

    return transactions.filter(tx =>
      tx.contactId && !validContactIds.has(tx.contactId)
    );
  }, [transactions, contacts]);

  // Resum de validacions
  const validationSummary = React.useMemo(() => ({
    duplicatesCount: duplicateContacts.reduce((sum, d) => sum + d.contacts.length, 0),
    orphansCount: orphanContacts.length,
    invalidTxCount: invalidContactTx.length,
    hasIssues: duplicateContacts.length > 0 || orphanContacts.length > 0 || invalidContactTx.length > 0,
  }), [duplicateContacts, orphanContacts, invalidContactTx]);

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const toggleExportOption = (id: string) => {
    setExportOptions(prev => prev.map(opt =>
      opt.id === id ? { ...opt, selected: !opt.selected } : opt
    ));
  };

  const handleExport = async () => {
    const selectedOptions = exportOptions.filter(opt => opt.selected);
    if (selectedOptions.length === 0) {
      toast({ variant: 'destructive', title: t.superAdminOrg.export.noSelection });
      return;
    }

    setIsExporting(true);
    try {
      const exportData: Record<string, unknown[]> = {};

      for (const opt of selectedOptions) {
        if (opt.id === 'transactions') exportData.transactions = transactions || [];
        if (opt.id === 'contacts') exportData.contacts = contacts || [];
        if (opt.id === 'members') exportData.members = members || [];
        if (opt.id === 'categories') exportData.categories = categories || [];
      }

      // Crear i descarregar JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const jsonFileName = t.superAdminOrg.export.fileNames.json({
        organizationSlug: organization?.slug || 'org',
        date: new Date().toISOString().split('T')[0],
      });
      a.download = jsonFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: t.superAdminOrg.export.success });
    } catch (error) {
      console.error('Export error:', error);
      toast({ variant: 'destructive', title: t.superAdminOrg.export.error });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async (type: 'transactions' | 'contacts' | 'members') => {
    setIsExporting(true);
    try {
      let csvContent = '';
      let filename = '';
      const csvHeaders = t.superAdminOrg.export.csvHeaders;
      const fileNames = t.superAdminOrg.export.fileNames;
      const organizationSlug = organization?.slug || 'org';

      if (type === 'transactions' && transactions) {
        csvContent = [
          csvHeaders.transactions.date,
          csvHeaders.transactions.description,
          csvHeaders.transactions.amount,
          csvHeaders.transactions.category,
          csvHeaders.transactions.contact,
          csvHeaders.transactions.project,
        ].join(',') + '\n';
        csvContent += transactions.map(tx =>
          `"${tx.date}","${tx.description?.replace(/"/g, '""') || ''}",${tx.amount},"${tx.category || ''}","${tx.contactId || ''}","${tx.projectId || ''}"`
        ).join('\n');
        filename = fileNames.transactions({ organizationSlug });
      } else if (type === 'contacts' && contacts) {
        csvContent = [
          csvHeaders.contacts.name,
          csvHeaders.contacts.type,
          csvHeaders.contacts.taxId,
          csvHeaders.contacts.zipCode,
          csvHeaders.contacts.createdAt,
        ].join(',') + '\n';
        csvContent += contacts.map(c =>
          `"${c.name?.replace(/"/g, '""') || ''}","${c.type}","${c.taxId || ''}","${c.zipCode || ''}","${c.createdAt || ''}"`
        ).join('\n');
        filename = fileNames.contacts({ organizationSlug });
      } else if (type === 'members' && members) {
        csvContent = [
          csvHeaders.members.name,
          csvHeaders.members.email,
          csvHeaders.members.role,
          csvHeaders.members.joinedAt,
        ].join(',') + '\n';
        csvContent += members.map(m =>
          `"${m.displayName?.replace(/"/g, '""') || ''}","${m.email}","${m.role}","${m.joinedAt || ''}"`
        ).join('\n');
        filename = fileNames.members({ organizationSlug });
      }

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: t.superAdminOrg.export.success });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({ variant: 'destructive', title: t.superAdminOrg.export.error });
    } finally {
      setIsExporting(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'CREATE':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Crear</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Editar</Badge>;
      case 'DELETE':
        return <Badge variant="destructive">Eliminar</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getEntityIcon = (entityType: AuditLog['entityType']) => {
    switch (entityType) {
      case 'TRANSACTION':
        return <FileText className="h-4 w-4" />;
      case 'CONTACT':
        return <Users className="h-4 w-4" />;
      case 'MEMBER':
        return <UserCheck className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // LOADING & ACCESS CHECK
  // ══════════════════════════════════════════════════════════════════════════

  React.useEffect(() => {
    if (!isUserLoading && !isSuperAdmin) {
      router.push('/dashboard');
    }
  }, [isUserLoading, isSuperAdmin, router]);

  const isLoading = isUserLoading || txLoading || contactsLoading || membersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">{t.superAdminOrg.accessDenied}</h1>
        <p className="text-muted-foreground">{t.superAdminOrg.accessDeniedDescription}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.common.back}
        </Button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-500" />
          {t.superAdminOrg.title}
        </h1>
        <p className="text-muted-foreground">
          {t.superAdminOrg.description} — <span className="font-medium">{organization?.name}</span>
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t.superAdminOrg.tabs.stats}
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-2">
            <SearchCheck className="h-4 w-4" />
            {t.superAdminOrg.tabs.validation}
            {validationSummary.hasIssues && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                !
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Activity className="h-4 w-4" />
            {t.superAdminOrg.tabs.audit}
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="h-4 w-4" />
            {t.superAdminOrg.tabs.export}
          </TabsTrigger>
          <TabsTrigger value="i18n" className="gap-2">
            <Languages className="h-4 w-4" />
            Traduccions
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: ESTADÍSTIQUES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="stats" className="space-y-4">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.stats.members}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.stats.transactions}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.stats.contacts}</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalContacts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.stats.recentActivity}</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.recentActivity}</div>
                <p className="text-xs text-muted-foreground">{t.superAdminOrg.stats.last30Days}</p>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {t.superAdminOrg.health.title}
              </CardTitle>
              <CardDescription>{t.superAdminOrg.health.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {systemHealth.uncategorizedTx === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.superAdminOrg.health.uncategorized}</p>
                    <p className="text-2xl font-bold">{systemHealth.uncategorizedTx}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {systemHealth.incompleteContacts === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.superAdminOrg.health.incomplete}</p>
                    <p className="text-2xl font-bold">{systemHealth.incompleteContacts}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {systemHealth.pendingReturns === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.superAdminOrg.health.returns}</p>
                    <p className="text-2xl font-bold">{systemHealth.pendingReturns}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  {systemHealth.riskyDonors === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.superAdminOrg.health.riskyDonors}</p>
                    <p className="text-2xl font-bold">{systemHealth.riskyDonors}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Quality */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                {t.superAdminOrg.quality.title}
              </CardTitle>
              <CardDescription>{t.superAdminOrg.quality.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t.superAdminOrg.quality.categorized}</span>
                  <span className="font-medium">{dataQuality.categorizedPercent}%</span>
                </div>
                <Progress value={dataQuality.categorizedPercent} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t.superAdminOrg.quality.withContact}</span>
                  <span className="font-medium">{dataQuality.withContactPercent}%</span>
                </div>
                <Progress value={dataQuality.withContactPercent} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t.superAdminOrg.quality.completeContacts}</span>
                  <span className="font-medium">{dataQuality.completeContactsPercent}%</span>
                </div>
                <Progress value={dataQuality.completeContactsPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: VALIDACIÓ DE DADES */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="validation" className="space-y-4">
          {/* Resum de validacions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className={duplicateContacts.length > 0 ? 'border-amber-300 bg-amber-50/50' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.validation.duplicates}</CardTitle>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{duplicateContacts.length}</div>
                <p className="text-xs text-muted-foreground">{t.superAdminOrg.validation.duplicatesHint}</p>
              </CardContent>
            </Card>

            <Card className={orphanContacts.length > 0 ? 'border-blue-300 bg-blue-50/50' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.validation.orphans}</CardTitle>
                <Unlink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orphanContacts.length}</div>
                <p className="text-xs text-muted-foreground">{t.superAdminOrg.validation.orphansHint}</p>
              </CardContent>
            </Card>

            <Card className={invalidContactTx.length > 0 ? 'border-red-300 bg-red-50/50' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t.superAdminOrg.validation.invalidRefs}</CardTitle>
                <Link2Off className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invalidContactTx.length}</div>
                <p className="text-xs text-muted-foreground">{t.superAdminOrg.validation.invalidRefsHint}</p>
              </CardContent>
            </Card>
          </div>

          {/* Contactes duplicats */}
          {duplicateContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5 text-amber-500" />
                  {t.superAdminOrg.validation.duplicatesTitle}
                </CardTitle>
                <CardDescription>{t.superAdminOrg.validation.duplicatesDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {duplicateContacts.map(({ nif, contacts: dupes }) => (
                    <div key={nif} className="p-3 rounded-lg border bg-amber-50/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="font-mono">{nif}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {dupes.length} {t.superAdminOrg.validation.contactsWithSameNif}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {dupes.map(contact => (
                          <div key={contact.id} className="flex items-center justify-between text-sm">
                            <span>{contact.name}</span>
                            <Badge variant="secondary">{contact.type}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contactes sense transaccions */}
          {orphanContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Unlink className="h-5 w-5 text-blue-500" />
                  {t.superAdminOrg.validation.orphansTitle}
                </CardTitle>
                <CardDescription>{t.superAdminOrg.validation.orphansDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.superAdminOrg.validation.name}</TableHead>
                      <TableHead>{t.superAdminOrg.validation.type}</TableHead>
                      <TableHead>{t.superAdminOrg.validation.nif}</TableHead>
                      <TableHead>{t.superAdminOrg.validation.created}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orphanContacts.slice(0, 20).map(contact => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell><Badge variant="outline">{contact.type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{contact.taxId || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString('ca-ES') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {orphanContacts.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {t.superAdminOrg.validation.andMore({ count: orphanContacts.length - 20 })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transaccions amb referències invàlides */}
          {invalidContactTx.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2Off className="h-5 w-5 text-red-500" />
                  {t.superAdminOrg.validation.invalidRefsTitle}
                </CardTitle>
                <CardDescription>{t.superAdminOrg.validation.invalidRefsDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.superAdminOrg.validation.date}</TableHead>
                      <TableHead>{t.superAdminOrg.validation.description}</TableHead>
                      <TableHead>{t.superAdminOrg.validation.amount}</TableHead>
                      <TableHead>{t.superAdminOrg.validation.invalidContactId}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invalidContactTx.slice(0, 20).map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{tx.date}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                        <TableCell className={tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {tx.amount.toFixed(2)} €
                        </TableCell>
                        <TableCell className="font-mono text-xs text-red-500">{tx.contactId}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Tot correcte */}
          {!validationSummary.hasIssues && (
            <Card className="border-green-300 bg-green-50/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-green-700">{t.superAdminOrg.validation.allGood}</h3>
                <p className="text-muted-foreground">{t.superAdminOrg.validation.allGoodHint}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: AUDITORIA */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    {t.superAdminOrg.audit.title}
                  </CardTitle>
                  <CardDescription>{t.superAdminOrg.audit.description}</CardDescription>
                </div>
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.superAdminOrg.audit.filterAll}</SelectItem>
                    <SelectItem value="TRANSACTION">{t.superAdminOrg.audit.filterTransactions}</SelectItem>
                    <SelectItem value="CONTACT">{t.superAdminOrg.audit.filterContacts}</SelectItem>
                    <SelectItem value="MEMBER">{t.superAdminOrg.audit.filterMembers}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : auditError ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mb-2 text-amber-500" />
                  <p>{t.superAdminOrg.audit.permissionError}</p>
                  <p className="text-sm">{t.superAdminOrg.audit.permissionErrorHint}</p>
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mb-2" />
                  <p>{t.superAdminOrg.audit.noLogs}</p>
                  <p className="text-sm">{t.superAdminOrg.audit.noLogsHint}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">{t.superAdminOrg.audit.timestamp}</TableHead>
                      <TableHead>{t.superAdminOrg.audit.user}</TableHead>
                      <TableHead>{t.superAdminOrg.audit.action}</TableHead>
                      <TableHead>{t.superAdminOrg.audit.entity}</TableHead>
                      <TableHead>{t.superAdminOrg.audit.details}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAuditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEntityIcon(log.entityType)}
                            <span className="text-sm">{log.entityName || log.entityId}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: EXPORTACIÓ */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Export JSON complet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileDown className="h-5 w-5 text-green-500" />
                  {t.superAdminOrg.export.jsonTitle}
                </CardTitle>
                <CardDescription>{t.superAdminOrg.export.jsonDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {exportOptions.map((opt) => (
                    <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={opt.selected}
                          onCheckedChange={() => toggleExportOption(opt.id)}
                        />
                        <span className="font-medium">{t.superAdminOrg.export[opt.labelKey as keyof typeof t.superAdminOrg.export] as string}</span>
                      </div>
                      <Badge variant="secondary">{opt.count}</Badge>
                    </div>
                  ))}
                </div>
                <Separator />
                <Button
                  onClick={handleExport}
                  disabled={isExporting || exportOptions.every(opt => !opt.selected)}
                  className="w-full"
                >
                  {isExporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  {t.superAdminOrg.export.downloadJson}
                </Button>
              </CardContent>
            </Card>

            {/* Export CSV individual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  {t.superAdminOrg.export.csvTitle}
                </CardTitle>
                <CardDescription>{t.superAdminOrg.export.csvDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleExportCSV('transactions')}
                  disabled={isExporting}
                >
                  <span>{t.superAdminOrg.export.transactions}</span>
                  <Badge variant="secondary">{transactions?.length || 0}</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleExportCSV('contacts')}
                  disabled={isExporting}
                >
                  <span>{t.superAdminOrg.export.contacts}</span>
                  <Badge variant="secondary">{contacts?.length || 0}</Badge>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleExportCSV('members')}
                  disabled={isExporting}
                >
                  <span>{t.superAdminOrg.export.members}</span>
                  <Badge variant="secondary">{members?.length || 0}</Badge>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TAB: TRADUCCIONS (i18n) */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="i18n" className="space-y-4">
          <I18nManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
