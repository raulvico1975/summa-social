'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Donor, Category } from '@/lib/data';
import { collection, query, where, getDocs, writeBatch, doc, limit } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import {
  isOfficialTemplate,
  getOfficialTemplateMapping,
  downloadDonorsTemplate,
  DONORS_TEMPLATE_HEADERS,
} from '@/lib/donors/donors-template';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

type ColumnMapping = {
  name: string | null;
  taxId: string | null;
  zipCode: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  donorType: string | null;
  membershipType: string | null;
  monthlyAmount: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
  defaultCategory: string | null;
  status: string | null;
  memberSince: string | null;
};

type ImportRow = {
  rowIndex: number;
  data: Record<string, any>;
  parsed: Partial<Donor>;
  status: 'new' | 'update' | 'duplicate' | 'invalid';
  error?: string;
};

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_FIELDS = ['name', 'taxId', 'zipCode'] as const;

const emptyMapping: ColumnMapping = {
  name: null,
  taxId: null,
  zipCode: null,
  address: null,
  city: null,
  province: null,
  donorType: null,
  membershipType: null,
  monthlyAmount: null,
  iban: null,
  email: null,
  phone: null,
  defaultCategory: null,
  status: null,
  memberSince: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      // Mantenir preposicions en minúscula (de, del, la, los, etc.)
      const prepositions = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'i'];
      if (prepositions.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim()
    .replace(/\s+/g, ' '); // Eliminar espais duplicats
}

function autoDetectColumn(header: string): keyof ColumnMapping | null {
  const normalized = normalizeText(header);
  
  const patterns: Record<keyof ColumnMapping, string[]> = {
    name: ['nom', 'nombre', 'name', 'raosocial', 'denominacio'],
    taxId: ['dni', 'nif', 'cif', 'taxid', 'documento', 'identificacio'],
    zipCode: ['cp', 'codipostal', 'codigopostal', 'zipcode', 'postal'],
    address: ['direccion', 'adreça', 'address', 'domicilio', 'calle', 'via', 'carrer'],
    city: ['ciudad', 'ciutat', 'city', 'localidad', 'poblacion', 'municipio'],
    province: ['provincia', 'province', 'comunidad', 'region', 'estado'],
    donorType: ['tipus', 'tipo', 'type', 'persona'],
    membershipType: ['modalitat', 'modalidad', 'membership', 'soci', 'socio'],
    monthlyAmount: ['import', 'importe', 'quota', 'cuota', 'amount', 'mensual'],
    iban: ['iban', 'compte', 'cuenta', 'banc', 'banco'],
    email: ['email', 'correu', 'correo', 'mail'],
    phone: ['telefon', 'telefono', 'phone', 'mobil', 'movil'],
    defaultCategory: ['categoria', 'category', 'categoría'],
    status: ['estado', 'estat', 'status', 'activo', 'actiu', 'baja', 'baixa'],
    memberSince: ['membersince', 'dataalta', 'fechaalta', 'dateadhesion', 'socides', 'sociodesde', 'dataadesao'],
  };

  for (const [field, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return field as keyof ColumnMapping;
    }
  }
  return null;
}

function parseDonorType(value: any): 'individual' | 'company' {
  if (!value) return 'individual';
  const normalized = normalizeText(String(value));
  if (['empresa', 'company', 'juridica', 'entitat'].some(k => normalized.includes(k))) {
    return 'company';
  }
  return 'individual';
}

function parseMembershipType(value: any): 'one-time' | 'recurring' {
  if (!value) return 'one-time';
  const normalized = normalizeText(String(value));
  if (['soci', 'socio', 'recurrent', 'recurring', 'mensual', 'periodico'].some(k => normalized.includes(k))) {
    return 'recurring';
  }
  return 'one-time';
}

function parseStatus(value: any): 'active' | 'inactive' {
  if (!value) return 'active';
  const normalized = normalizeText(String(value));
  if (['baja', 'baixa', 'inactive', 'inactivo', 'inactiu', 'no'].some(k => normalized.includes(k))) {
    return 'inactive';
  }
  return 'active';
}

function parseAmount(value: any): number | undefined {
  if (!value) return undefined;
  const str = String(value).replace(/[€$,\s]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function cleanTaxId(value: any): string {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function cleanIban(value: any): string {
  if (!value) return '';
  return String(value).toUpperCase().replace(/\s/g, '');
}

function parseDateToISO(value: unknown): string | null {
  if (!value) return null;

  const str = String(value).trim();
  if (!str) return null;

  // Excel serial date (número)
  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // Format DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const euMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (euMatch) {
    const day = euMatch[1].padStart(2, '0');
    const month = euMatch[2].padStart(2, '0');
    const year = euMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface DonorImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
  existingTaxIds?: string[];
}

export function DonorImporter({
  open,
  onOpenChange,
  onImportComplete,
  existingTaxIds = []
}: DonorImporterProps) {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
    name: t.importers.donor.fields.name,
    taxId: t.importers.donor.fields.taxId,
    zipCode: t.importers.donor.fields.zipCode,
    address: t.importers.donor.fields.address,
    city: t.importers.donor.fields.city,
    province: t.importers.donor.fields.province,
    donorType: t.importers.donor.fields.type,
    membershipType: t.importers.donor.fields.modality,
    monthlyAmount: t.importers.donor.fields.monthlyAmount,
    iban: t.importers.donor.fields.iban,
    email: t.importers.donor.fields.email,
    phone: t.importers.donor.fields.phone,
    defaultCategory: t.importers.donor.fields.defaultCategory,
    status: t.importers.donor.fields.status,
    memberSince: t.importers.donor.fields.memberSince,
  };

  // Carregar categories d'ingrés
  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: allCategories } = useCollection<Category>(categoriesQuery);
  const incomeCategories = React.useMemo(
    () => allCategories?.filter(c => c.type === 'income') || [],
    [allCategories]
  );
  const categoryTranslations = t.categories as Record<string, string>;

  // Selector global de categoria per defecte: '__auto__' = automàtic segons tipus
  const [globalDefaultCategory, setGlobalDefaultCategory] = React.useState<string>('__auto__');

  // Estat del procés
  const [step, setStep] = React.useState<ImportStep>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawData, setRawData] = React.useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>(emptyMapping);
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importedCount, setImportedCount] = React.useState(0);
  const [updatedCount, setUpdatedCount] = React.useState(0);
  // Map de taxId -> docId per poder fer updates
  const [existingDonorIds, setExistingDonorIds] = React.useState<Map<string, string>>(new Map());
  // Checkbox per actualitzar existents
  const [updateExisting, setUpdateExisting] = React.useState(false);
  // Detectar si el fitxer és la plantilla oficial
  const [isOfficial, setIsOfficial] = React.useState(false);
  const [templateError, setTemplateError] = React.useState<string | null>(null);

  // Actualitzar l'estat de les files quan canvia updateExisting
  React.useEffect(() => {
    if (importRows.length === 0) return;

    setImportRows(prev => prev.map(row => {
      // Només afecta files amb taxId que existeix a la BBDD
      if (!row.parsed.taxId || !existingDonorIds.has(row.parsed.taxId)) {
        return row;
      }
      // Si estava duplicate i ara volem actualitzar → update
      if (row.status === 'duplicate' && updateExisting && !row.error?.includes(t.importers.common.duplicateInFile)) {
        return { ...row, status: 'update', error: undefined };
      }
      // Si estava update i ara NO volem actualitzar → duplicate
      if (row.status === 'update' && !updateExisting) {
        return { ...row, status: 'duplicate', error: t.importers.common.alreadyExists };
      }
      return row;
    }));
  }, [updateExisting]);

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setHeaders([]);
        setRawData([]);
        setMapping(emptyMapping);
        setImportRows([]);
        setImportProgress(0);
        setImportedCount(0);
        setUpdatedCount(0);
        setGlobalDefaultCategory('__auto__');
        setUpdateExisting(false);
        setIsOfficial(false);
        setTemplateError(null);
      }, 300);
    }
  }, [open]);

  // Funció per determinar la categoria segons membershipType
  const getCategoryIdForMembershipType = React.useCallback((membershipType: 'one-time' | 'recurring'): string | null => {
    if (!incomeCategories || incomeCategories.length === 0) return null;

    if (membershipType === 'recurring') {
      // Buscar categoria de quotes socis
      const memberFeesCategory = incomeCategories.find(c =>
        c.name.toLowerCase().includes('quota') ||
        c.name.toLowerCase().includes('soci') ||
        c.name === 'memberFees'
      );
      return memberFeesCategory?.id || null;
    } else {
      // Buscar categoria de donacions
      const donationsCategory = incomeCategories.find(c =>
        c.name.toLowerCase().includes('donaci') ||
        c.name === 'donations'
      );
      return donationsCategory?.id || null;
    }
  }, [incomeCategories]);

  // Funció per buscar categoria per nom (del CSV)
  const getCategoryIdByName = React.useCallback((categoryName: string): string | null => {
    if (!categoryName || !incomeCategories || incomeCategories.length === 0) return null;

    const normalized = categoryName.toLowerCase().trim();
    const category = incomeCategories.find(c =>
      c.name.toLowerCase() === normalized ||
      (categoryTranslations[c.name] || '').toLowerCase() === normalized
    );
    return category?.id || null;
  }, [incomeCategories, categoryTranslations]);

  // Carregar DNIs existents quan s'obre
  React.useEffect(() => {
    if (open && organizationId && firestore) {
      loadExistingTaxIds();
    }
  }, [open, organizationId, firestore]);

  const loadExistingTaxIds = async () => {
    if (!organizationId || !firestore) return;
    try {
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
      // Limitar a 5000 per rendiment - suficient per detectar duplicats
      const q = query(contactsRef, where('type', '==', 'donor'), limit(5000));
      const snapshot = await getDocs(q);
      const ids = new Map<string, string>();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.taxId) {
          ids.set(cleanTaxId(data.taxId), docSnap.id);
        }
      });
      setExistingDonorIds(ids);
    } catch (error) {
      console.error('Error carregant DNIs existents:', error);
      toast({ variant: 'destructive', title: t.common?.error || 'Error' });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setTemplateError(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      if (jsonData.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: t.importers.common.emptyFile });
        return;
      }

      const detectedHeaders = Object.keys(jsonData[0]);
      setHeaders(detectedHeaders);
      setRawData(jsonData);

      // Comprovar si és la plantilla oficial de Summa
      const official = isOfficialTemplate(detectedHeaders);
      setIsOfficial(official);

      if (official) {
        // Plantilla oficial: mapatge automàtic i saltar a preview
        const officialMapping = getOfficialTemplateMapping(detectedHeaders);
        const autoMapping: ColumnMapping = { ...emptyMapping };

        // Convertir índexs a noms de capçalera
        for (const [field, idx] of Object.entries(officialMapping)) {
          if (idx !== undefined && idx >= 0 && idx < detectedHeaders.length) {
            autoMapping[field as keyof ColumnMapping] = detectedHeaders[idx];
          }
        }

        setMapping(autoMapping);
        // Processar directament sense passar per mapping
        processDataWithMapping(autoMapping, jsonData);
      } else {
        // NO és plantilla oficial: mostrar error
        setTemplateError('Fes servir la plantilla oficial de Summa per importar donants.');
      }
    } catch (error) {
      console.error('Error llegint fitxer:', error);
      toast({ variant: 'destructive', title: 'Error', description: t.importers.common.cannotReadFile });
    }
  };

  // Processar dades amb un mapping específic (per plantilla oficial)
  const processDataWithMapping = (currentMapping: ColumnMapping, data: Record<string, any>[]) => {
    const rows: ImportRow[] = data.map((row, index) => {
      const parsed: Partial<Donor> = {
        type: 'donor',
        name: currentMapping.name ? toTitleCase(String(row[currentMapping.name] || '')) : '',
        taxId: currentMapping.taxId ? cleanTaxId(row[currentMapping.taxId]) : '',
        zipCode: currentMapping.zipCode ? String(row[currentMapping.zipCode] || '').trim() : '',
        address: currentMapping.address ? String(row[currentMapping.address] || '').trim() : undefined,
        city: currentMapping.city ? String(row[currentMapping.city] || '').trim() : undefined,
        province: currentMapping.province ? String(row[currentMapping.province] || '').trim() : undefined,
        donorType: currentMapping.donorType ? parseDonorType(row[currentMapping.donorType]) : 'individual',
        membershipType: currentMapping.membershipType ? parseMembershipType(row[currentMapping.membershipType]) : 'one-time',
        monthlyAmount: currentMapping.monthlyAmount ? parseAmount(row[currentMapping.monthlyAmount]) : undefined,
        iban: currentMapping.iban ? cleanIban(row[currentMapping.iban]) : undefined,
        email: currentMapping.email ? String(row[currentMapping.email] || '').trim() : undefined,
        phone: currentMapping.phone ? String(row[currentMapping.phone] || '').trim() : undefined,
        status: currentMapping.status ? parseStatus(row[currentMapping.status]) : 'active',
      };

      // Parsejar memberSince si la columna està mapejada
      const memberSinceRaw = currentMapping.memberSince ? row[currentMapping.memberSince] : undefined;
      if (memberSinceRaw && String(memberSinceRaw).trim()) {
        const memberSinceISO = parseDateToISO(memberSinceRaw);
        if (memberSinceISO) {
          parsed.memberSince = memberSinceISO;
        } else {
          // Marcar com invàlid més avall
          parsed.memberSince = '__invalid__' as any;
        }
      }

      let status: ImportRow['status'] = 'new';
      let error: string | undefined;

      if (!parsed.name) {
        status = 'invalid';
        error = t.importers.donor.errors.missingName;
      } else if (!parsed.taxId) {
        status = 'invalid';
        error = t.importers.donor.errors.missingTaxId;
      } else if (!parsed.zipCode) {
        status = 'invalid';
        error = t.importers.donor.errors.missingZipCode;
      } else if (parsed.memberSince === '__invalid__') {
        status = 'invalid';
        error = t.importers.donor.errors.memberSinceInvalid;
        parsed.memberSince = undefined;
      } else if (existingDonorIds.has(parsed.taxId)) {
        if (updateExisting) {
          status = 'update';
        } else {
          status = 'duplicate';
          error = t.importers.common.alreadyExists;
        }
      }

      return { rowIndex: index + 2, data: row, parsed, status, error };
    });

    // Detectar duplicats interns
    const seenTaxIds = new Set<string>();
    for (const row of rows) {
      if ((row.status === 'new' || row.status === 'update') && row.parsed.taxId) {
        if (seenTaxIds.has(row.parsed.taxId)) {
          row.status = 'duplicate';
          row.error = t.importers.common.duplicateInFile;
        } else {
          seenTaxIds.add(row.parsed.taxId);
        }
      }
    }

    setImportRows(rows);
    setStep('preview');
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string | null) => {
    setMapping(prev => ({ ...prev, [field]: value === '__none__' ? null : value }));
  };

  const processData = () => {
    const rows: ImportRow[] = rawData.map((row, index) => {
      const parsed: Partial<Donor> = {
        type: 'donor',
        name: mapping.name ? toTitleCase(String(row[mapping.name] || '')) : '',
        taxId: mapping.taxId ? cleanTaxId(row[mapping.taxId]) : '',
        zipCode: mapping.zipCode ? String(row[mapping.zipCode] || '').trim() : '',
        address: mapping.address ? String(row[mapping.address] || '').trim() : undefined,
        city: mapping.city ? String(row[mapping.city] || '').trim() : undefined,
        province: mapping.province ? String(row[mapping.province] || '').trim() : undefined,
        donorType: mapping.donorType ? parseDonorType(row[mapping.donorType]) : 'individual',
        membershipType: mapping.membershipType ? parseMembershipType(row[mapping.membershipType]) : 'one-time',
        monthlyAmount: mapping.monthlyAmount ? parseAmount(row[mapping.monthlyAmount]) : undefined,
        iban: mapping.iban ? cleanIban(row[mapping.iban]) : undefined,
        email: mapping.email ? String(row[mapping.email] || '').trim() : undefined,
        phone: mapping.phone ? String(row[mapping.phone] || '').trim() : undefined,
        status: mapping.status ? parseStatus(row[mapping.status]) : 'active',
      };

      // Parsejar memberSince si la columna està mapejada
      const memberSinceRaw = mapping.memberSince ? row[mapping.memberSince] : undefined;
      if (memberSinceRaw && String(memberSinceRaw).trim()) {
        const memberSinceISO = parseDateToISO(memberSinceRaw);
        if (memberSinceISO) {
          parsed.memberSince = memberSinceISO;
        } else {
          parsed.memberSince = '__invalid__' as any;
        }
      }

      let status: ImportRow['status'] = 'new';
      let error: string | undefined;

      if (!parsed.name) {
        status = 'invalid';
        error = t.importers.donor.errors.missingName;
      } else if (!parsed.taxId) {
        status = 'invalid';
        error = t.importers.donor.errors.missingTaxId;
      } else if (!parsed.zipCode) {
        status = 'invalid';
        error = t.importers.donor.errors.missingZipCode;
      } else if (parsed.memberSince === '__invalid__') {
        status = 'invalid';
        error = t.importers.donor.errors.memberSinceInvalid;
        parsed.memberSince = undefined;
      } else if (existingDonorIds.has(parsed.taxId)) {
        // Si existeix, decidir si actualitzar o marcar com duplicat
        if (updateExisting) {
          status = 'update';
        } else {
          status = 'duplicate';
          error = t.importers.common.alreadyExists;
        }
      }

      return { rowIndex: index + 2, data: row, parsed, status, error };
    });

    // Detectar duplicats interns
    const seenTaxIds = new Set<string>();
    for (const row of rows) {
      if ((row.status === 'new' || row.status === 'update') && row.parsed.taxId) {
        if (seenTaxIds.has(row.parsed.taxId)) {
          row.status = 'duplicate';
          row.error = t.importers.common.duplicateInFile;
        } else {
          seenTaxIds.add(row.parsed.taxId);
        }
      }
    }

    setImportRows(rows);
    setStep('preview');
  };

const executeImport = async () => {
  if (!organizationId || !firestore) return;

  setStep('importing');
  setImportProgress(0);

  // Filtrar files noves i a actualitzar
  const newRows = importRows.filter(r => r.status === 'new');
  const updateRows = importRows.filter(r => r.status === 'update');
  const totalRows = [...newRows, ...updateRows];

  const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
  const now = new Date().toISOString();

  let imported = 0;
  let updated = 0;
  const batchSize = 50;
  const batches = Math.ceil(totalRows.length / batchSize);

  try {
    for (let i = 0; i < batches; i++) {
      const batch = writeBatch(firestore);
      const start = i * batchSize;
      const end = Math.min(start + batchSize, totalRows.length);

      for (let j = start; j < end; j++) {
        const row = totalRows[j];
        const isUpdate = row.status === 'update';

        if (isUpdate && row.parsed.taxId) {
          // ACTUALITZAR donant existent
          const existingDocId = existingDonorIds.get(row.parsed.taxId);
          if (existingDocId) {
            const existingDocRef = doc(contactsRef, existingDocId);

            // Només actualitzar camps que tenen valor al CSV (no sobreescriure amb buits)
            const updateData: Record<string, any> = {
              updatedAt: now,
            };

            // Camps a actualitzar si tenen valor
            if (row.parsed.zipCode) updateData.zipCode = row.parsed.zipCode;
            if (row.parsed.address) updateData.address = row.parsed.address;
            if (row.parsed.email) updateData.email = row.parsed.email;
            if (row.parsed.phone) updateData.phone = row.parsed.phone;
            if (row.parsed.iban) updateData.iban = row.parsed.iban;
            if (row.parsed.membershipType) updateData.membershipType = row.parsed.membershipType;
            if (row.parsed.donorType) updateData.donorType = row.parsed.donorType;
            if (row.parsed.monthlyAmount) updateData.monthlyAmount = row.parsed.monthlyAmount;
            if (row.parsed.city) updateData.city = row.parsed.city;
            if (row.parsed.province) updateData.province = row.parsed.province;
            if (row.parsed.status) {
              updateData.status = row.parsed.status;
              if (row.parsed.status === 'inactive') {
                updateData.inactiveSince = now;
              }
            }
            if (row.parsed.memberSince) updateData.memberSince = row.parsed.memberSince;

            batch.set(existingDocRef, updateData, { merge: true });
            updated++;
          }
        } else {
          // CREAR nou donant
          const newDocRef = doc(contactsRef);

          // Netejar undefined abans de guardar (Firestore no accepta undefined)
          const cleanData: Record<string, any> = {
            id: newDocRef.id,
            type: 'donor',
            name: row.parsed.name || '',
            taxId: row.parsed.taxId || '',
            zipCode: row.parsed.zipCode || '',
            donorType: row.parsed.donorType || 'individual',
            membershipType: row.parsed.membershipType || 'one-time',
            createdAt: now,
            updatedAt: now,
          };

          // Afegir camps opcionals només si tenen valor
          if (row.parsed.address) cleanData.address = row.parsed.address;
          if (row.parsed.city) cleanData.city = row.parsed.city;
          if (row.parsed.province) cleanData.province = row.parsed.province;
          if (row.parsed.monthlyAmount) cleanData.monthlyAmount = row.parsed.monthlyAmount;
          if (row.parsed.iban) cleanData.iban = row.parsed.iban;
          if (row.parsed.email) cleanData.email = row.parsed.email;
          if (row.parsed.phone) cleanData.phone = row.parsed.phone;
          if (row.parsed.status) {
            cleanData.status = row.parsed.status;
            if (row.parsed.status === 'inactive') {
              cleanData.inactiveSince = now;
            }
          }
          if (row.parsed.memberSince) cleanData.memberSince = row.parsed.memberSince;

          // Determinar defaultCategoryId
          let defaultCategoryId: string | null = null;

          // 1. Prioritat: categoria del CSV (si s'ha mapejat la columna)
          if (mapping.defaultCategory && row.data[mapping.defaultCategory]) {
            defaultCategoryId = getCategoryIdByName(String(row.data[mapping.defaultCategory]));
          }

          // 2. Si no hi ha del CSV, usar selector global
          if (!defaultCategoryId) {
            if (globalDefaultCategory === '__auto__') {
              // Automàtic segons membershipType
              defaultCategoryId = getCategoryIdForMembershipType(row.parsed.membershipType || 'one-time');
            } else if (globalDefaultCategory !== '__none__') {
              // Categoria específica seleccionada
              defaultCategoryId = globalDefaultCategory;
            }
          }

          if (defaultCategoryId) {
            cleanData.defaultCategoryId = defaultCategoryId;
          }

          batch.set(newDocRef, cleanData);
          imported++;
        }
      }

      await batch.commit();
      setImportProgress(Math.round(((imported + updated) / totalRows.length) * 100));
    }

    setImportedCount(imported);
    setUpdatedCount(updated);
    setStep('complete');
    onImportComplete?.(imported + updated);

    toast({
      title: t.importers.donor.importSuccess,
      description: t.importers.donor.importSuccessDescription(imported + updated),
    });
  } catch (error: any) {
    console.error('Error important:', error);
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error?.message || t.importers.common.importError,
    });
    setStep('preview');
  } finally {
    // Assegurar que el progress indicator no queda bloquejat
    // El progress es reseteja al useEffect quan el dialog es tanca
  }
};

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const newCount = importRows.filter(r => r.status === 'new').length;
  const updateCount = importRows.filter(r => r.status === 'update').length;
  const duplicateCount = importRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = importRows.filter(r => r.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t.importers.donor.title}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && t.importers.donor.uploadDescription}
            {step === 'mapping' && t.importers.donor.mappingDescription}
            {step === 'preview' && t.importers.donor.previewDescription}
            {step === 'importing' && t.importers.donor.importingDescription}
            {step === 'complete' && t.importers.donor.completeDescription}
          </DialogDescription>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <div className="py-6 space-y-6">
            {/* Error de plantilla no oficial */}
            {templateError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium">{templateError}</p>
                    <p className="text-red-600">
                      {t.importers.donor.templateErrorHint || 'Descarrega la plantilla oficial i copia les teves dades en ella.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">{t.importers.common.dragOrClick}</p>
              <p className="text-sm text-muted-foreground">{t.importers.common.acceptedFormats}</p>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadDonorsTemplate}>
                <Download className="h-4 w-4 mr-2" />
                {t.importers.common.downloadTemplate}
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <p className="font-medium">{t.importers.donor.officialTemplateRequired || 'Fes servir la plantilla oficial de Summa per importar donants.'}</p>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>{t.importers.common.requiredColumns}</strong> {t.importers.donor.requiredColumnsText}</p>
                <p><strong>{t.importers.common.optionalColumns}</strong> {t.importers.donor.optionalColumnsText}</p>
              </div>
              <div className="pt-2 border-t border-muted space-y-1 text-muted-foreground">
                <p>💡 {t.importers.donor.modalityTip}</p>
                <p>📁 {t.importers.donor.categoryTip}</p>
                <p>📅 {t.importers.donor.memberSinceTip}</p>
                <p>📝 {t.importers.donor.updateFlowTip}</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: MAPPING */}
        {step === 'mapping' && (
          <div className="py-4 space-y-4">
            {file && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded p-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({rawData.length} {t.importers.common.rows})</span>
              </div>
            )}

            <div className="grid gap-3">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                <div key={field} className="grid grid-cols-5 items-center gap-4">
                  <Label className={cn(
                    "text-right text-sm col-span-2",
                    REQUIRED_FIELDS.includes(field as any) && "font-medium"
                  )}>
                    {FIELD_LABELS[field]}
                  </Label>
                  <Select
                    value={mapping[field] || '__none__'}
                    onValueChange={(v) => handleMappingChange(field, v)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t.importers.common.doNotImport} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t.importers.common.doNotImport}</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.importers.common.back}
              </Button>
              <Button
                onClick={processData}
                disabled={!mapping.name || !mapping.taxId || !mapping.zipCode}
              >
                {t.importers.common.continue}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === 'preview' && (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium text-sm">{t.importers.common.valid}</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{newCount}</p>
              </div>
              {updateCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-blue-700 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium text-sm">{t.importers.donor.toUpdate}</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{updateCount}</p>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-700 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">{t.importers.common.duplicates}</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{duplicateCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-red-700 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium text-sm">{t.importers.common.invalid}</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
              </div>
            </div>

            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t.importers.common.row}</TableHead>
                    <TableHead>{t.importers.common.name}</TableHead>
                    <TableHead>{t.importers.donor.fields.taxId}</TableHead>
                    <TableHead>{t.importers.donor.tableHeaders.zipCode}</TableHead>
                    <TableHead>{t.importers.donor.tableHeaders.modality}</TableHead>
                    <TableHead className="w-24">{t.importers.common.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.slice(0, 50).map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={cn(
                        row.status === 'update' && 'bg-blue-50',
                        row.status === 'duplicate' && 'bg-yellow-50',
                        row.status === 'invalid' && 'bg-red-50'
                      )}
                    >
                      <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                      <TableCell className="font-medium">{row.parsed.name || '-'}</TableCell>
                      <TableCell>{row.parsed.taxId || '-'}</TableCell>
                      <TableCell>{row.parsed.zipCode || '-'}</TableCell>
                      <TableCell>
                        {row.parsed.membershipType === 'recurring' ? (
                          <Badge variant="outline" className="text-green-700">{t.importers.donor.modality.member}</Badge>
                        ) : (
                          <Badge variant="secondary">{t.importers.donor.modality.oneTime}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.status === 'new' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                        {row.status === 'update' && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t.importers.donor.updateBadge}
                          </Badge>
                        )}
                        {row.status === 'duplicate' && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t.importers.common.duplicate}
                          </Badge>
                        )}
                        {row.status === 'invalid' && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {row.error}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {importRows.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                  {t.importers.common.showing(50, importRows.length)}
                </div>
              )}
            </div>

            {duplicateCount > 0 && !updateExisting && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {t.importers.common.duplicatesWillNotImport(duplicateCount)}
              </div>
            )}

            {/* Checkbox per actualitzar existents */}
            {existingDonorIds.size > 0 && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted/30">
                <Checkbox
                  id="updateExisting"
                  checked={updateExisting}
                  onCheckedChange={(checked) => setUpdateExisting(checked === true)}
                />
                <Label htmlFor="updateExisting" className="text-sm cursor-pointer">
                  {t.importers.donor.updateExisting}
                </Label>
              </div>
            )}

            {/* Selector de categoria per defecte */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">{t.importers.donor.defaultCategoryLabel}</Label>
              <Select
                value={globalDefaultCategory}
                onValueChange={setGlobalDefaultCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">
                    <div className="flex flex-col">
                      <span>{t.importers.donor.defaultCategoryAuto}</span>
                      <span className="text-xs text-muted-foreground">{t.importers.donor.defaultCategoryAutoDescription}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="__none__">{t.importers.common.doNotImport}</SelectItem>
                  {incomeCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {categoryTranslations[cat.name] || cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.importers.common.back}
              </Button>
              <Button
                onClick={executeImport}
                disabled={newCount + updateCount === 0}
              >
                {t.importers.donor.importButton(newCount + updateCount)}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: IMPORTING */}
        {step === 'importing' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{t.importers.common.importing}</p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-muted-foreground">
              {t.importers.common.percentComplete(importProgress)}
            </p>
          </div>
        )}

        {/* STEP: COMPLETE */}
        {step === 'complete' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{t.importers.common.importComplete}</p>
                <p className="text-muted-foreground mt-1">
                  {t.importers.donor.importedCount(importedCount)}
                </p>
              </div>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={() => onOpenChange(false)}>
                {t.importers.common.close}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}