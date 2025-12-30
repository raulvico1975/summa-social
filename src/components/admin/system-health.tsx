// src/components/admin/system-health.tsx
// Component de Salut del Sistema amb sentinelles S1-S8

'use client';

import * as React from 'react';
import { useFirebase } from '@/firebase';
import {
  getOpenIncidents,
  countOpenIncidentsByType,
  acknowledgeIncident,
  resolveIncident,
  reopenIncident,
  INCIDENT_HELP,
  type SystemIncident,
  type IncidentType,
} from '@/lib/system-incidents';
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
} from 'lucide-react';

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
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export function SystemHealth() {
  const { firestore } = useFirebase();
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

  // Handler per RESOLVED
  const handleResolve = async (incident: SystemIncident) => {
    if (!firestore) return;
    setIsProcessing(true);
    try {
      await resolveIncident(firestore, incident.id);
      await loadIncidents();
    } catch (err) {
      console.error('Error resolving incident:', err);
    } finally {
      setIsProcessing(false);
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

  const totalOpenIncidents = incidents.filter((i) => i.status === 'OPEN').length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Salut del sistema
          </CardTitle>
          <CardDescription>
            Sentinelles que detecten problemes abans que els usuaris els reportin
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
                  <TableHead className="w-[80px]">Severitat</TableHead>
                  <TableHead className="w-[100px]">Tipus</TableHead>
                  <TableHead>Què passa</TableHead>
                  <TableHead className="w-[120px]">Ruta / Org</TableHead>
                  <TableHead className="w-[60px]">Cops</TableHead>
                  <TableHead className="w-[100px]">Últim</TableHead>
                  <TableHead className="w-[150px]">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((incident) => (
                  <TableRow
                    key={incident.id}
                    className={incident.status === 'ACK' ? 'opacity-60' : ''}
                  >
                    <TableCell>
                      <Badge
                        variant={incident.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                      >
                        {incident.severity === 'CRITICAL' ? 'CRÍTIC' : 'AVÍS'}
                      </Badge>
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
                              onClick={() => handleResolve(incident)}
                              disabled={isProcessing}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Resolt
                            </Button>
                          </>
                        )}
                        {incident.status === 'ACK' && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleResolve(incident)}
                            disabled={isProcessing}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Resolt
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
    </>
  );
}
