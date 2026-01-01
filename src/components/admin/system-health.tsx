// src/components/admin/system-health.tsx
// Component de Salut del Sistema amb sentinelles S1-S8 i Semàfor de producció

'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, updateDoc, getDocs, limit, setDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import {
  getOpenIncidents,
  countOpenIncidentsByType,
  acknowledgeIncident,
  resolveIncidentWithDetails,
  updateIncidentImpact,
  reopenIncident,
  INCIDENT_HELP,
  buildIncidentFixPack,
  type SystemIncident,
  type IncidentType,
  type IncidentImpact,
  type IncidentResolution,
} from '@/lib/system-incidents';
import {
  getRecommendedAction,
  getDefaultImpact,
  validateResolution,
  buildResolution,
  IMPACT_LABELS,
  ACTION_LABELS,
  type RecommendedAction,
} from '@/lib/admin/incident-recommendations';
import type { Organization } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  Eye,
  Check,
  RotateCcw,
  HelpCircle,
  MonitorX,
  Lock,
  Upload,
  Download,
  Scale,
  Clock,
  FileText,
  Activity,
  Copy,
  Play,
  Database,
  Globe,
  HardDrive,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';

// ═══════════════════════════════════════════════════════════════════════════
// DEFINICIÓ DE SENTINELLES
// ═══════════════════════════════════════════════════════════════════════════

interface Sentinel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  incidentTypes?: IncidentType[]; // Tipus d'incidents que activen aquesta sentinella
  isQuery?: boolean; // Només consulta, sense incidents automàtics
}

const SENTINELS: Sentinel[] = [
  {
    id: 'S1',
    name: 'Permisos',
    description: 'Errors de permisos Firestore',
    icon: <Lock className="h-4 w-4" />,
    incidentTypes: ['PERMISSIONS'],
  },
  {
    id: 'S2',
    name: 'Moviments',
    description: 'Errors a la pantalla de moviments',
    icon: <MonitorX className="h-4 w-4" />,
    incidentTypes: ['CLIENT_CRASH'], // Filtrem per ruta movimientos
  },
  {
    id: 'S3',
    name: 'Importadors',
    description: "Errors d'importació de dades",
    icon: <Upload className="h-4 w-4" />,
    incidentTypes: ['IMPORT_FAILURE'],
  },
  {
    id: 'S4',
    name: 'Exports',
    description: "Errors d'exportació (Excel, PDF, SEPA)",
    icon: <Download className="h-4 w-4" />,
    incidentTypes: ['EXPORT_FAILURE'],
  },
  {
    id: 'S5',
    name: 'Remeses OUT',
    description: 'Invariants de remeses (deltaCents, isValid)',
    icon: <Scale className="h-4 w-4" />,
    incidentTypes: ['INVARIANT_BROKEN'],
  },
  {
    id: 'S6',
    name: 'Encallaments',
    description: 'Transaccions sense classificar > 30 dies',
    icon: <Clock className="h-4 w-4" />,
    isQuery: true,
  },
  {
    id: 'S7',
    name: 'Fiscal 182',
    description: 'Donants sense dades fiscals completes',
    icon: <FileText className="h-4 w-4" />,
    isQuery: true,
  },
  {
    id: 'S8',
    name: 'Activitat',
    description: 'Organitzacions inactives > 60 dies',
    icon: <Activity className="h-4 w-4" />,
    isQuery: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SEMÀFOR DE PRODUCCIÓ - Tipus i constants
// ═══════════════════════════════════════════════════════════════════════════

type CheckStatus = 'pending' | 'running' | 'ok' | 'warning' | 'error';

interface HealthCheck {
  id: string;
  name: string;
  description: string;
  humanExplanation: string; // Text explicatiu per no-programadors
  status: CheckStatus;
  message?: string;
  requiresOrg?: boolean;
  actionable?: 'documentsEnabled' | 'goToI18n' | 'openRoute' | 'testRealUpload'; // Tipus d'acció
  isNonCritical?: boolean; // Si true, no contribueix al ❌ global del semàfor
}

const INITIAL_CHECKS: HealthCheck[] = [
  {
    id: 'superadmin-status',
    name: 'SuperAdmin',
    description: 'Accés al panell /admin',
    humanExplanation: 'Verifica que el teu usuari té un document a systemSuperAdmins. Sense això, no pots gestionar el sistema.',
    status: 'pending',
  },
  {
    id: 'firestore-i18n',
    name: 'system/i18n',
    description: 'Firestore accessible',
    humanExplanation: 'Activa la "versió de textos" que fa servir tothom. Sense això, pot haver-hi inconsistències.',
    status: 'pending',
    actionable: 'goToI18n',
  },
  {
    id: 'firestore-updates',
    name: 'productUpdates',
    description: 'Novetats del producte',
    humanExplanation: 'Normal si encara no has publicat cap novetat. No afecta el funcionament.',
    status: 'pending',
    isNonCritical: true, // No contribueix al ❌ global
  },
  {
    id: 'storage-ca',
    name: 'i18n/ca.json',
    description: 'Storage accessible',
    humanExplanation: 'Fitxer de traduccions en català. Si falla, els usuaris amb idioma català veuran claus sense traduir.',
    status: 'pending',
    actionable: 'goToI18n',
  },
  {
    id: 'storage-es',
    name: 'i18n/es.json',
    description: 'Storage accessible',
    humanExplanation: 'Fitxer de traduccions en castellà. Si falla, els usuaris amb idioma castellà veuran claus sense traduir.',
    status: 'pending',
    actionable: 'goToI18n',
  },
  {
    id: 'storage-fr',
    name: 'i18n/fr.json',
    description: 'Storage accessible',
    humanExplanation: 'Fitxer de traduccions en francès. Si falla, els usuaris amb idioma francès veuran claus sense traduir.',
    status: 'pending',
    actionable: 'goToI18n',
  },
  {
    id: 'storage-pt',
    name: 'i18n/pt.json',
    description: 'Storage accessible',
    humanExplanation: 'Fitxer de traduccions en portuguès. Si falla, els usuaris amb idioma portuguès veuran claus sense traduir.',
    status: 'pending',
    actionable: 'goToI18n',
  },
  {
    id: 'firestore-transactions',
    name: 'Moviments',
    description: 'Lectura de transaccions',
    humanExplanation: 'Si falla, els usuaris no podran veure els moviments de la seva organització.',
    status: 'pending',
    requiresOrg: true,
  },
  {
    id: 'storage-upload',
    name: 'pendingDocuments',
    description: 'Upload operatiu',
    humanExplanation: 'Permet pujar factures i nòmines. Si no ho actives, les pujades fallaran.',
    status: 'pending',
    requiresOrg: true,
    actionable: 'documentsEnabled', // Quan error: concedir permís. Quan OK: botó test real.
  },
  {
    id: 'legacy-redirect',
    name: 'quick-expense',
    description: 'Redirect legacy OK',
    humanExplanation: 'Comprova que l\'entrada ràpida de despeses funciona per als usuaris.',
    status: 'pending',
    requiresOrg: true,
    actionable: 'openRoute',
  },
];

const SEMAPHORE_STORAGE_KEY = 'systemHealthSemaphore_selectedOrg';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function SystemHealth() {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [incidents, setIncidents] = React.useState<SystemIncident[]>([]);
  const [incidentCounts, setIncidentCounts] = React.useState<Record<IncidentType, number>>({
    CLIENT_CRASH: 0,
    PERMISSIONS: 0,
    IMPORT_FAILURE: 0,
    EXPORT_FAILURE: 0,
    INVARIANT_BROKEN: 0,
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedIncident, setSelectedIncident] = React.useState<SystemIncident | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Modal de resolució d'incidents
  const [resolveDialogOpen, setResolveDialogOpen] = React.useState(false);
  const [incidentToResolve, setIncidentToResolve] = React.useState<SystemIncident | null>(null);
  const [resolveCommit, setResolveCommit] = React.useState('');
  const [resolveNote, setResolveNote] = React.useState('');
  const [resolveNoCommit, setResolveNoCommit] = React.useState(false);
  const [resolveImpact, setResolveImpact] = React.useState<IncidentImpact>('functional');
  const [resolveError, setResolveError] = React.useState<string | null>(null);

  // Semàfor de producció state
  const [healthChecks, setHealthChecks] = React.useState<HealthCheck[]>(INITIAL_CHECKS);
  const [isRunningChecks, setIsRunningChecks] = React.useState(false);
  const [selectedOrgId, setSelectedOrgId] = React.useState<string>('');

  // Modal de confirmació per concedir permís de documents
  const [documentsDialogOpen, setDocumentsDialogOpen] = React.useState(false);
  const [isGrantingDocuments, setIsGrantingDocuments] = React.useState(false);

  // Carregar organitzacions per al selector
  const orgsQuery = useMemoFirebase(
    () => query(collection(firestore, 'organizations'), orderBy('name', 'asc')),
    [firestore]
  );
  const { data: organizations } = useCollection<Organization>(orgsQuery);

  // Carregar org seleccionada de localStorage
  React.useEffect(() => {
    const savedOrg = localStorage.getItem(SEMAPHORE_STORAGE_KEY);
    if (savedOrg) {
      setSelectedOrgId(savedOrg);
    }
  }, []);

  // Guardar org seleccionada a localStorage
  const handleOrgChange = (orgId: string) => {
    setSelectedOrgId(orgId);
    localStorage.setItem(SEMAPHORE_STORAGE_KEY, orgId);
  };

  // Carregar incidents
  const loadIncidents = React.useCallback(async () => {
    if (!firestore) return;
    setIsLoading(true);
    try {
      const [allIncidents, counts] = await Promise.all([
        getOpenIncidents(firestore),
        countOpenIncidentsByType(firestore),
      ]);
      setIncidents(allIncidents);
      setIncidentCounts(counts);
    } catch (err) {
      console.error('Error loading incidents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Determinar estat de cada sentinella
  const getSentinelStatus = (sentinel: Sentinel): 'ok' | 'warning' | 'critical' => {
    if (sentinel.isQuery) return 'ok'; // Les sentinelles de consulta sempre verdes per ara

    if (!sentinel.incidentTypes) return 'ok';

    // Per S2 (Moviments), filtrar incidents CLIENT_CRASH que siguin a ruta movimientos
    if (sentinel.id === 'S2') {
      const movimientosIncidents = incidents.filter(
        (i) =>
          i.type === 'CLIENT_CRASH' &&
          i.status === 'OPEN' &&
          i.route?.includes('movimiento')
      );
      return movimientosIncidents.length > 0 ? 'critical' : 'ok';
    }

    // Per altres sentinelles, comptar incidents del tipus corresponent
    const count = sentinel.incidentTypes.reduce(
      (sum, type) => sum + (incidentCounts[type] || 0),
      0
    );
    return count > 0 ? 'critical' : 'ok';
  };

  // Handler per ACK
  const handleAck = async (incident: SystemIncident) => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
      await acknowledgeIncident(firestore, incident.id);
      await loadIncidents();
    } catch (err) {
      console.error('Error acknowledging incident:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler per obrir modal de resolució
  const handleOpenResolveDialog = (incident: SystemIncident) => {
    setIncidentToResolve(incident);
    setResolveCommit('');
    setResolveNote('');
    setResolveNoCommit(false);
    setResolveImpact(incident.impact || getDefaultImpact(incident));
    setResolveError(null);
    setResolveDialogOpen(true);
  };

  // Handler per confirmar resolució amb dades completes
  const handleConfirmResolve = async () => {
    if (!firestore || !incidentToResolve || !user) return;

    // Validar
    const validation = validateResolution(resolveCommit, resolveNoCommit);
    if (!validation.valid) {
      setResolveError(validation.error || 'Error de validació');
      return;
    }

    setIsProcessing(true);
    setResolveError(null);

    try {
      const resolution = buildResolution(
        user.uid,
        resolveCommit,
        resolveNote,
        resolveNoCommit
      );
      await resolveIncidentWithDetails(firestore, incidentToResolve.id, resolution, resolveImpact);
      await loadIncidents();
      setResolveDialogOpen(false);
      setIncidentToResolve(null);
      toast({
        title: 'Incident tancat',
        description: resolveNoCommit
          ? 'Marcat com resolt sense commit.'
          : `Resolt amb commit: ${resolveCommit}`,
      });
    } catch (err) {
      console.error('Error resolving incident:', err);
      setResolveError('No s\'ha pogut tancar l\'incident.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler per canviar impacte sense tancar
  const handleChangeImpact = async (incident: SystemIncident, newImpact: IncidentImpact) => {
    if (!firestore) return;
    try {
      await updateIncidentImpact(firestore, incident.id, newImpact);
      await loadIncidents();
    } catch (err) {
      console.error('Error updating impact:', err);
    }
  };

  // Handler per reobrir
  const handleReopen = async (incident: SystemIncident) => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
      await reopenIncident(firestore, incident.id);
      await loadIncidents();
    } catch (err) {
      console.error('Error reopening incident:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler per copiar prompt de reparació
  const handleCopyPrompt = async (incident: SystemIncident) => {
    const { promptText } = buildIncidentFixPack(incident);
    try {
      await navigator.clipboard.writeText(promptText);
      toast({
        title: 'Prompt copiat',
        description: 'Enganxa el text a Claude Code per reparar l\'error.',
      });
    } catch (err) {
      console.error('Error copying prompt:', err);
      toast({
        title: 'Error copiant',
        description: 'No s\'ha pogut copiar al portapapers.',
        variant: 'destructive',
      });
    }
  };

  const totalOpenIncidents = incidents.filter((i) => i.status === 'OPEN').length;

  // ─────────────────────────────────────────────────────────────────────────
  // ACCIÓ: Concedir permís de documents
  // ─────────────────────────────────────────────────────────────────────────

  const handleGrantDocumentsPermission = async () => {
    if (!firestore || !selectedOrgId) return;

    setIsGrantingDocuments(true);
    try {
      const orgRef = doc(firestore, 'organizations', selectedOrgId);
      await updateDoc(orgRef, { documentsEnabled: true });
      setDocumentsDialogOpen(false);

      // Re-executar checks i esperar per verificar si ara funciona
      await runHealthChecks();

      // Esperar un moment perquè el state s'actualitzi
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Verificar si el check ara passa
      // Nota: healthChecks s'actualitza async, així que fem una prova directa
      const storage = getStorage();
      const selectedOrg = organizations?.find((o) => o.id === selectedOrgId);
      if (selectedOrg) {
        try {
          const testFileName = `_verify_${Date.now()}.txt`;
          const testRef = ref(storage, `organizations/${selectedOrgId}/pendingDocuments/${testFileName}`);
          const testContent = new Blob(['verify'], { type: 'text/plain' });
          await uploadBytes(testRef, testContent);
          await deleteObject(testRef);
          // Si arriba aquí, ha funcionat
          toast({
            title: 'Fet ✅',
            description: 'Ara la pujada de documents funciona per aquesta organització.',
          });
        } catch {
          // Encara falla
          toast({
            title: 'No s\'ha pogut completar',
            description: 'El permís s\'ha concedit però la pujada encara falla. Comprova les regles de Storage.',
            variant: 'destructive',
          });
        }
      }
    } catch (err) {
      console.error('Error granting documents permission:', err);
      toast({
        title: 'Error',
        description: 'No s\'ha pogut concedir el permís.',
        variant: 'destructive',
      });
    } finally {
      setIsGrantingDocuments(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SEMÀFOR DE PRODUCCIÓ - Executar checks
  // ─────────────────────────────────────────────────────────────────────────

  const updateCheck = (id: string, updates: Partial<HealthCheck>) => {
    setHealthChecks((prev) =>
      prev.map((check) => (check.id === id ? { ...check, ...updates } : check))
    );
  };

  const runHealthChecks = async () => {
    if (!firestore) return;

    setIsRunningChecks(true);
    // Reset all checks to running
    setHealthChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: 'running' as CheckStatus })));

    const storage = getStorage();
    const selectedOrg = organizations?.find((o) => o.id === selectedOrgId);

    // 0. Check SuperAdmin status (nou check prioritari)
    if (user) {
      try {
        const superAdminDoc = await getDoc(doc(firestore, 'systemSuperAdmins', user.uid));
        if (superAdminDoc.exists()) {
          const data = superAdminDoc.data();
          updateCheck('superadmin-status', {
            status: 'ok',
            message: data?.email ? `✓ ${data.email}` : '✓ Registrat',
          });
        } else {
          updateCheck('superadmin-status', {
            status: 'error',
            message: 'No ets SuperAdmin',
          });
        }
      } catch (err) {
        // Si permission-denied, vol dir que no tenim accés (probablement no som superadmin)
        const error = err as { code?: string };
        if (error.code === 'permission-denied') {
          updateCheck('superadmin-status', {
            status: 'error',
            message: 'Sense permisos (no ets SuperAdmin)',
          });
        } else {
          updateCheck('superadmin-status', { status: 'error', message: (err as Error).message });
        }
      }
    } else {
      updateCheck('superadmin-status', { status: 'warning', message: 'No autenticat' });
    }

    // 1. Check system/i18n (Firestore)
    try {
      const i18nDoc = await getDoc(doc(firestore, 'system', 'i18n'));
      if (i18nDoc.exists()) {
        updateCheck('firestore-i18n', { status: 'ok', message: `v${i18nDoc.data()?.version || '?'}` });
      } else {
        updateCheck('firestore-i18n', { status: 'warning', message: 'No existeix' });
      }
    } catch (err) {
      updateCheck('firestore-i18n', { status: 'error', message: (err as Error).message });
    }

    // 2. Check productUpdates (Firestore) - no és crític si està buit
    try {
      const updatesDoc = await getDoc(doc(firestore, 'system', 'productUpdates'));
      if (updatesDoc.exists()) {
        updateCheck('firestore-updates', { status: 'ok', message: 'Configurat' });
      } else {
        // No existeix és normal si no s'han publicat novetats
        updateCheck('firestore-updates', { status: 'ok', message: 'Normal (cap novetat publicada)' });
      }
    } catch (err) {
      // Error d'accés sí que és problema
      updateCheck('firestore-updates', { status: 'warning', message: (err as Error).message });
    }

    // 3-6. Check i18n Storage files
    const languages = ['ca', 'es', 'fr', 'pt'] as const;
    for (const lang of languages) {
      try {
        const fileRef = ref(storage, `i18n/${lang}.json`);
        await getDownloadURL(fileRef);
        updateCheck(`storage-${lang}`, { status: 'ok', message: 'Existeix' });
      } catch (err) {
        const error = err as { code?: string };
        if (error.code === 'storage/object-not-found') {
          updateCheck(`storage-${lang}`, { status: 'error', message: 'No existeix' });
        } else if (error.code === 'storage/unauthorized') {
          updateCheck(`storage-${lang}`, { status: 'error', message: 'Sense permisos' });
        } else {
          updateCheck(`storage-${lang}`, { status: 'error', message: (err as Error).message });
        }
      }
    }

    // 7. Check moviments accessibles (Firestore read tècnic)
    if (selectedOrg) {
      try {
        const txQuery = query(
          collection(firestore, `organizations/${selectedOrgId}/transactions`),
          limit(1)
        );
        await getDocs(txQuery);
        updateCheck('firestore-transactions', { status: 'ok', message: 'Accessible' });
      } catch (err) {
        const error = err as { code?: string };
        if (error.code === 'permission-denied') {
          updateCheck('firestore-transactions', { status: 'error', message: 'Sense permisos' });
        } else {
          updateCheck('firestore-transactions', { status: 'error', message: (err as Error).message });
        }
      }
    } else {
      updateCheck('firestore-transactions', { status: 'warning', message: 'Cal seleccionar org' });
    }

    // 8. Check pendingDocuments upload (requires org) — AMB DIAGNÒSTIC HUMÀ
    if (selectedOrg && user) {
      const testFileName = `_healthcheck/${Date.now()}.txt`;
      const testPath = `organizations/${selectedOrgId}/pendingDocuments/${testFileName}`;
      const testRef = ref(storage, testPath);
      const testContent = new Blob(['health check'], { type: 'text/plain' });

      try {
        await uploadBytes(testRef, testContent);
        // Cleanup: delete the test file
        await deleteObject(testRef);
        updateCheck('storage-upload', { status: 'ok', message: 'Upload OK' });
      } catch (err) {
        const error = err as { code?: string };
        if (error.code === 'storage/unauthorized') {
          // Diagnòstic humà: determinar la causa exacta
          let diagnosis = '';
          let diagnosisDetails = `Path: ${testPath} | UID: ${user.uid} | OrgId: ${selectedOrgId}`;

          try {
            // 1. Comprovar documentsEnabled
            const orgDoc = await getDoc(doc(firestore, 'organizations', selectedOrgId));
            const orgData = orgDoc.data();
            const documentsEnabled = orgData?.documentsEnabled === true;

            // 2. Comprovar si és membre
            const memberDoc = await getDoc(doc(firestore, `organizations/${selectedOrgId}/members/${user.uid}`));
            const isMember = memberDoc.exists();
            const memberRole = isMember ? memberDoc.data()?.role : null;

            if (!documentsEnabled) {
              diagnosis = 'documentsEnabled=false';
              diagnosisDetails = `L'org no té activat el permís de documents. Activa'l amb el botó.`;
            } else if (!isMember) {
              diagnosis = 'no-member';
              diagnosisDetails = `L'usuari ${user.uid} no és membre de l'org ${selectedOrgId}.`;
            } else if (memberRole && !['admin', 'user'].includes(memberRole)) {
              diagnosis = 'wrong-role';
              diagnosisDetails = `Rol "${memberRole}" no té permisos d'escriptura (cal admin o user).`;
            } else {
              // Tot sembla correcte però Storage denegat → problema a les regles
              diagnosis = 'rules-mismatch';
              diagnosisDetails = `documentsEnabled=true, membre=${memberRole}, però Storage denegat. Revisar storage.rules.`;
            }
          } catch (diagErr) {
            // Si no podem llegir l'org o membre, probablement permisos de Firestore
            diagnosis = 'firestore-denied';
            diagnosisDetails = `No s'ha pogut diagnosticar: ${(diagErr as Error).message}`;
          }

          updateCheck('storage-upload', {
            status: 'error',
            message: diagnosis === 'documentsEnabled=false'
              ? 'Falta activar documents'
              : diagnosis === 'no-member'
                ? 'No ets membre de l\'org'
                : diagnosis === 'wrong-role'
                  ? 'Rol sense permisos'
                  : diagnosis === 'rules-mismatch'
                    ? 'Rules Storage incorrectes'
                    : `Diagnòstic: ${diagnosisDetails}`,
          });

          // Log detallat per debug
          console.log('[Semàfor] pendingDocuments diagnòstic:', { diagnosis, diagnosisDetails, testPath, uid: user.uid, orgId: selectedOrgId });
        } else {
          updateCheck('storage-upload', { status: 'error', message: (err as Error).message });
        }
      }
    } else if (!user) {
      updateCheck('storage-upload', { status: 'warning', message: 'No autenticat' });
    } else {
      updateCheck('storage-upload', { status: 'warning', message: 'Cal seleccionar org' });
    }

    // 9. Check legacy quick-expense redirect
    if (selectedOrg) {
      try {
        const response = await fetch(`/${selectedOrg.slug}/quick-expense`, {
          method: 'HEAD',
          redirect: 'manual',
        });
        // 308 o 200 = OK (redirect o pàgina existent)
        if (response.status === 200 || response.status === 308 || response.type === 'opaqueredirect') {
          updateCheck('legacy-redirect', { status: 'ok', message: 'Ruta operativa' });
        } else if (response.status === 404) {
          updateCheck('legacy-redirect', { status: 'error', message: '404 Not Found' });
        } else {
          updateCheck('legacy-redirect', { status: 'warning', message: `Status ${response.status}` });
        }
      } catch {
        // fetch error usually means CORS or network issue, but route likely exists
        updateCheck('legacy-redirect', { status: 'ok', message: 'Ruta existeix (CORS)' });
      }
    } else {
      updateCheck('legacy-redirect', { status: 'warning', message: 'Cal seleccionar org' });
    }

    setIsRunningChecks(false);
  };

  // Generar informe per copiar
  const generateReport = () => {
    const selectedOrg = organizations?.find((o) => o.id === selectedOrgId);
    const timestamp = new Date().toISOString();
    const lines = [
      `# Informe Semàfor de Producció`,
      `Data: ${timestamp}`,
      selectedOrg ? `Org: ${selectedOrg.name} (${selectedOrg.slug})` : 'Org: No seleccionada',
      '',
      '## Checks',
      ...healthChecks.map((check) => {
        const icon = check.status === 'ok' ? '✅' : check.status === 'warning' ? '⚠️' : check.status === 'error' ? '❌' : '⏳';
        return `${icon} ${check.name}: ${check.message || check.status}`;
      }),
      '',
      `## Resum`,
      `- OK: ${healthChecks.filter((c) => c.status === 'ok').length}`,
      `- Warning: ${healthChecks.filter((c) => c.status === 'warning').length}`,
      `- Error: ${healthChecks.filter((c) => c.status === 'error').length}`,
    ];
    return lines.join('\n');
  };

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(generateReport());
      toast({
        title: 'Informe copiat',
        description: 'Pots enganxar-lo on vulguis.',
      });
    } catch (err) {
      console.error('Error copying report:', err);
      toast({
        title: 'Error copiant',
        description: 'No s\'ha pogut copiar al portapapers.',
        variant: 'destructive',
      });
    }
  };

  // Calcular estat global del semàfor
  // Només errors crítics (no isNonCritical) contribueixen al ❌ global
  // Els warnings de "Cal seleccionar org" no penalitzen
  const semaphoreStatus = React.useMemo(() => {
    const hasPending = healthChecks.some((c) => c.status === 'pending' || c.status === 'running');
    if (hasPending) return 'pending';

    // Filtrar errors crítics (exclou isNonCritical)
    const criticalChecks = healthChecks.filter((c) => !c.isNonCritical);
    const hasCriticalError = criticalChecks.some((c) => c.status === 'error');

    // Filtrar warnings que NO són "Cal seleccionar org" (aquests no penalitzen)
    const hasRealWarning = healthChecks.some(
      (c) => c.status === 'warning' && c.message !== 'Cal seleccionar org'
    );

    if (hasCriticalError) return 'error';
    if (hasRealWarning) return 'warning';

    // Si tots els checks crítics estan OK (o són non-critical OK/warning)
    const allCriticalOk = criticalChecks.every((c) => c.status === 'ok' || c.status === 'warning');
    if (allCriticalOk) return 'ok';

    return 'pending';
  }, [healthChecks]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Salut del sistema
          </CardTitle>
          <CardDescription>
            Sentinelles que detecten problemes abans que els usuaris els reportin.
            <span className="flex items-center gap-1 text-xs mt-1 opacity-70">
              <Mail className="h-3 w-3" />
              Contacte/suport: <span className="font-mono">{SUPPORT_EMAIL}</span>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregant...
            </div>
          ) : (
            <>
              {/* Resum */}
              {totalOpenIncidents > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="text-sm text-red-800 font-medium">
                    {totalOpenIncidents} incident{totalOpenIncidents > 1 ? 's' : ''} obert{totalOpenIncidents > 1 ? 's' : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setDialogOpen(true)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Veure
                  </Button>
                </div>
              )}

              {/* Grid de sentinelles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SENTINELS.map((sentinel) => {
                  const status = getSentinelStatus(sentinel);
                  return (
                    <TooltipProvider key={sentinel.id} delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-default transition-colors ${
                              status === 'critical'
                                ? 'bg-red-50 border-red-200'
                                : status === 'warning'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-green-50 border-green-200'
                            }`}
                          >
                            {status === 'critical' ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : status === 'warning' ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate">
                                {sentinel.id} {sentinel.name}
                              </div>
                            </div>
                            {sentinel.icon}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px]">
                          <p className="text-xs">{sentinel.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* SEMÀFOR DE PRODUCCIÓ */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div className="pt-4 mt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Semàfor de producció</h4>
                    {/* Indicador global */}
                    {semaphoreStatus === 'ok' && (
                      <span className="text-lg" title="Tot OK">✅</span>
                    )}
                    {semaphoreStatus === 'warning' && (
                      <span className="text-lg" title="Alguns warnings">⚠️</span>
                    )}
                    {semaphoreStatus === 'error' && (
                      <span className="text-lg" title="Errors detectats">❌</span>
                    )}
                    {semaphoreStatus === 'pending' && (
                      <span className="text-lg" title="Pendent d'executar">⏳</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Selector d'organització */}
                    <Select value={selectedOrgId} onValueChange={handleOrgChange}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder="Selecciona org..." />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id} className="text-xs">
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Botó executar */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runHealthChecks}
                      disabled={isRunningChecks}
                    >
                      {isRunningChecks ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Executar
                    </Button>
                    {/* Botó copiar informe */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyReport}
                      disabled={semaphoreStatus === 'pending'}
                      title="Copiar informe"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Grid de checks */}
                <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                  {healthChecks.map((check) => {
                    // Detectar si aquest check té una acció disponible
                    const canGrantDocuments =
                      check.id === 'storage-upload' &&
                      check.status === 'error' &&
                      check.message === 'storage/unauthorized' &&
                      check.actionable === 'documentsEnabled';

                    const canGoToI18n =
                      check.actionable === 'goToI18n' &&
                      (check.status === 'error' || check.status === 'warning');

                    const canOpenRoute =
                      check.actionable === 'openRoute' &&
                      check.status === 'error' &&
                      selectedOrgId;

                    const selectedOrg = organizations?.find((o) => o.id === selectedOrgId);

                    return (
                      <TooltipProvider key={check.id} delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex flex-col p-2 rounded border text-xs ${
                                check.status === 'ok'
                                  ? 'bg-green-50 border-green-200'
                                  : check.status === 'warning'
                                    ? 'bg-yellow-50 border-yellow-200'
                                    : check.status === 'error'
                                      ? 'bg-red-50 border-red-200'
                                      : check.status === 'running'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-muted border-border'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {check.status === 'ok' && <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />}
                                {check.status === 'warning' && <AlertTriangle className="h-3 w-3 text-yellow-600 flex-shrink-0" />}
                                {check.status === 'error' && <XCircle className="h-3 w-3 text-red-600 flex-shrink-0" />}
                                {check.status === 'running' && <Loader2 className="h-3 w-3 text-blue-600 animate-spin flex-shrink-0" />}
                                {check.status === 'pending' && <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{check.name}</div>
                                  {check.message && (
                                    <div className="text-[10px] text-muted-foreground truncate">{check.message}</div>
                                  )}
                                </div>
                                {check.requiresOrg && (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Database className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Requereix org</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>

                              {/* Botons d'acció segons el tipus */}
                              {canGrantDocuments && (
                                <div className="mt-2 space-y-1">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 text-[10px] w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDocumentsDialogOpen(true);
                                    }}
                                  >
                                    Concedir permís de documents
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground leading-tight">
                                    Permet pujar factures i nòmines. Si no ho actives, les pujades fallaran.
                                  </p>
                                </div>
                              )}

                              {canGoToI18n && (
                                <div className="mt-2 space-y-1">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 text-[10px] w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navegar a la secció de traduccions (SuperAdmin)
                                      const superAdminSection = document.querySelector('[data-section="i18n"]');
                                      if (superAdminSection) {
                                        superAdminSection.scrollIntoView({ behavior: 'smooth' });
                                      } else {
                                        toast({
                                          title: 'Traduccions',
                                          description: 'Ves a la secció SuperAdmin → Traduccions per inicialitzar.',
                                        });
                                      }
                                    }}
                                  >
                                    Anar a Traduccions
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground leading-tight">
                                    Això arregla els textos i elimina els errors de traducció.
                                  </p>
                                </div>
                              )}

                              {canOpenRoute && selectedOrg && (
                                <div className="mt-2 space-y-1">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-6 text-[10px] w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/${selectedOrg.slug}/quick-expense`, '_blank');
                                    }}
                                  >
                                    Obrir ruta
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground leading-tight">
                                    Comprova que l&apos;entrada ràpida de despeses funciona.
                                  </p>
                                </div>
                              )}

                              {/* Botó "Provar pujada real" quan pendingDocuments OK */}
                              {check.id === 'storage-upload' && check.status === 'ok' && selectedOrg && (
                                <div className="mt-2 space-y-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-6 text-[10px] w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navegar a la pantalla real de documents pendents
                                      window.open(`/${selectedOrg.slug}/dashboard/pending-documents`, '_blank');
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Provar pujada real
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground leading-tight">
                                    Obre la pantalla real de pujada per confirmar que funciona.
                                  </p>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[250px]">
                            <p className="text-xs">{check.humanExplanation}</p>
                            {check.message && <p className="text-xs font-mono mt-1 text-muted-foreground">{check.message}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal d'incidents */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Incidents del sistema
            </DialogTitle>
            <DialogDescription>
              Incidències detectades automàticament. Revisa i actua segons les indicacions.
            </DialogDescription>
          </DialogHeader>

          {incidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <p>Tot correcte! No hi ha incidents oberts.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Impacte</TableHead>
                  <TableHead className="w-[100px]">Tipus</TableHead>
                  <TableHead>Què passa</TableHead>
                  <TableHead className="w-[120px]">Ruta / Org</TableHead>
                  <TableHead className="w-[60px]">Cops</TableHead>
                  <TableHead className="w-[100px]">Últim</TableHead>
                  <TableHead className="w-[180px]">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    className={incident.status === 'ACK' ? 'opacity-60' : ''}
                  >
                    <TableCell>
                      {(() => {
                        const currentImpact = incident.impact || getDefaultImpact(incident);
                        const impactConfig = IMPACT_LABELS[currentImpact];
                        return (
                          <Select
                            value={currentImpact}
                            onValueChange={(val) => handleChangeImpact(incident, val as IncidentImpact)}
                          >
                            <SelectTrigger className={`h-7 w-[90px] text-xs border-0 ${impactConfig.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(Object.keys(IMPACT_LABELS) as IncidentImpact[]).map((key) => (
                                <SelectItem key={key} value={key} className="text-xs">
                                  <span className={IMPACT_LABELS[key].color}>{IMPACT_LABELS[key].short}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">{incident.type}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium line-clamp-2">
                          {incident.message}
                        </p>
                        {incident.topStack && (
                          <p className="text-xs text-muted-foreground font-mono line-clamp-1">
                            {incident.topStack}
                          </p>
                        )}
                        {/* Acció recomanada */}
                        {(() => {
                          const action = getRecommendedAction(incident);
                          const actionConfig = ACTION_LABELS[action];
                          return (
                            <div className="mt-2 p-2 bg-muted rounded-md">
                              <div className="text-[10px] text-muted-foreground mb-1">Què fer ara?</div>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => {
                                  if (action === 'permissions') {
                                    window.open('https://console.firebase.google.com/project/summa-social/firestore/rules', '_blank');
                                  } else if (action === 'storage') {
                                    window.open('https://console.firebase.google.com/project/summa-social/storage/rules', '_blank');
                                  } else if (action === 'reload') {
                                    toast({
                                      title: 'Chunk error',
                                      description: 'Demana a l\'usuari que recarregui la pàgina en mode incògnit.',
                                    });
                                  } else {
                                    handleCopyPrompt(incident);
                                  }
                                }}
                              >
                                {actionConfig.label}
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {incident.route && (
                          <span className="font-mono text-muted-foreground block truncate max-w-[100px]">
                            {incident.route}
                          </span>
                        )}
                        {incident.orgSlug && (
                          <span className="text-muted-foreground">{incident.orgSlug}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{incident.count}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {incident.lastSeenAt?.toDate?.()?.toLocaleDateString('ca-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Botó copiar prompt */}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleCopyPrompt(incident)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copiar prompt de reparació</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Botó ajuda */}
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setSelectedIncident(incident)}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Què fer?</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {/* Accions segons estat */}
                        {incident.status === 'OPEN' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleAck(incident)}
                              disabled={isProcessing}
                            >
                              ACK
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => handleOpenResolveDialog(incident)}
                              disabled={isProcessing}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Tancar
                            </Button>
                          </>
                        )}
                        {incident.status === 'ACK' && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleOpenResolveDialog(incident)}
                            disabled={isProcessing}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Tancar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal d'ajuda per incident */}
      <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Què fer amb aquest incident?
            </DialogTitle>
          </DialogHeader>

          {selectedIncident && INCIDENT_HELP[selectedIncident.type] && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-1">Què vol dir</h4>
                <p className="text-sm text-muted-foreground">
                  {INCIDENT_HELP[selectedIncident.type].whatItMeans}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Per què és important</h4>
                <p className="text-sm text-muted-foreground">
                  {INCIDENT_HELP[selectedIncident.type].whyCritical}
                </p>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-1">Primers passos</h4>
                <p className="text-sm text-muted-foreground">
                  {INCIDENT_HELP[selectedIncident.type].nextSteps}
                </p>
              </div>

              {/* Botó copiar prompt */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleCopyPrompt(selectedIncident)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar prompt de reparació per Claude Code
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Detalls tècnics</h4>
                <div className="bg-muted p-3 rounded text-xs font-mono space-y-1">
                  <div>
                    <span className="text-muted-foreground">Signatura:</span>{' '}
                    {selectedIncident.signature}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ruta:</span>{' '}
                    {selectedIncident.route || '-'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Org:</span>{' '}
                    {selectedIncident.orgSlug || selectedIncident.orgId || '-'}
                  </div>
                  <div className="pt-2">
                    <span className="text-muted-foreground">Missatge:</span>
                    <pre className="whitespace-pre-wrap mt-1">{selectedIncident.message}</pre>
                  </div>
                  {selectedIncident.topStack && (
                    <div className="pt-2">
                      <span className="text-muted-foreground">Stack:</span>
                      <pre className="whitespace-pre-wrap mt-1">{selectedIncident.topStack}</pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de resolució d'incident */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              Tancar incident
            </DialogTitle>
            <DialogDescription>
              Indica com s&apos;ha resolt per futurs incidents similars.
            </DialogDescription>
          </DialogHeader>

          {incidentToResolve && (
            <div className="space-y-4">
              {/* Resum de l'incident */}
              <div className="p-3 bg-muted rounded text-sm">
                <div className="font-medium line-clamp-2">{incidentToResolve.message}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {incidentToResolve.type} · {incidentToResolve.count} cop{incidentToResolve.count > 1 ? 's' : ''}
                </div>
              </div>

              {/* Selector d'impacte */}
              <div className="space-y-2">
                <Label htmlFor="resolve-impact">Impacte real</Label>
                <Select
                  value={resolveImpact}
                  onValueChange={(val) => setResolveImpact(val as IncidentImpact)}
                >
                  <SelectTrigger id="resolve-impact">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(IMPACT_LABELS) as IncidentImpact[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {IMPACT_LABELS[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Commit */}
              <div className="space-y-2">
                <Label htmlFor="resolve-commit">Commit que ho ha arreglat</Label>
                <Input
                  id="resolve-commit"
                  placeholder="abc1234 o URL del commit"
                  value={resolveCommit}
                  onChange={(e) => setResolveCommit(e.target.value)}
                  disabled={resolveNoCommit}
                />
              </div>

              {/* Checkbox "no hi ha commit" */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resolve-no-commit"
                  checked={resolveNoCommit}
                  onCheckedChange={(checked) => {
                    setResolveNoCommit(!!checked);
                    if (checked) setResolveCommit('');
                  }}
                />
                <Label htmlFor="resolve-no-commit" className="text-sm font-normal">
                  No hi ha commit (configuració, permisos, etc.)
                </Label>
              </div>

              {/* Nota opcional */}
              <div className="space-y-2">
                <Label htmlFor="resolve-note">Nota (opcional)</Label>
                <Input
                  id="resolve-note"
                  placeholder="Descripció breu del fix..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                />
              </div>

              {/* Error de validació */}
              {resolveError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {resolveError}
                </div>
              )}

              {/* Botons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setResolveDialogOpen(false)}
                  disabled={isProcessing}
                >
                  Cancel·lar
                </Button>
                <Button
                  onClick={handleConfirmResolve}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Tancar incident
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmació per concedir permís de documents */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Concedir permís de documents
            </DialogTitle>
            <DialogDescription>
              Aquesta acció activarà la pujada de documents per a l&apos;organització seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resum de l'acció */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-medium text-blue-900">
                Organització: {organizations?.find((o) => o.id === selectedOrgId)?.name || '-'}
              </p>
              <p className="text-blue-700 text-xs mt-1">
                S&apos;establirà <code className="bg-blue-100 px-1 rounded">documentsEnabled: true</code> al document de l&apos;organització.
              </p>
            </div>

            {/* Advertència */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <p className="font-medium">Què passarà:</p>
              <ul className="list-disc list-inside mt-1 text-xs space-y-1">
                <li>Els usuaris podran pujar factures i nòmines</li>
                <li>Les regles de Storage permetran escriptura a pendingDocuments</li>
                <li>El check es re-executarà automàticament</li>
              </ul>
            </div>

            {/* Botons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDocumentsDialogOpen(false)}
                disabled={isGrantingDocuments}
              >
                Cancel·lar
              </Button>
              <Button
                onClick={handleGrantDocumentsPermission}
                disabled={isGrantingDocuments}
              >
                {isGrantingDocuments ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Concedir permís
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
