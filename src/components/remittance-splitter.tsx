'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import type { Transaction, Donor, Supplier, Employee } from '@/lib/data';
import { formatCurrencyEU, isValidSpanishTaxId, getSpanishTaxIdType, normalizeTaxId } from '@/lib/normalize';
import type { SpanishTaxIdType } from '@/lib/normalize';
import {
  FileUp,
  Loader2,
  Info,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  Settings2,
  Save,
  Trash2,
  Eye,
  RotateCcw,
  Download,
  FileCode,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase } from '@/firebase';
import { collection, writeBatch, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { parsePain001, isPain001File, downloadPain001 } from '@/lib/sepa';
import { filterMatchableContacts, isNumericLikeName, maskMatchValue } from '@/lib/contacts/filterActiveContacts';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface RemittanceSplitterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  existingDonors: Donor[];
  existingSuppliers?: Supplier[];
  existingEmployees?: Employee[];
  onSplitDone: () => void;
}

// Tipus de remesa: IN (donacions) o OUT (pagaments)
type RemittanceDirection = 'IN' | 'OUT';

// Configuració guardada per a un format de banc
interface SavedMapping {
  id: string;
  name: string;
  delimiter: string;
  startRow: number;
  amountColumn: number;
  nameColumn: number | null;
  taxIdColumn: number | null;
  ibanColumn: number | null;
  createdAt: string;
}

// Tipus de matching per traçabilitat
type MatchMethod = 'taxId' | 'iban' | 'name' | null;

// Resultat de l'anàlisi de cada fila del CSV
// Nota: Usem "matchedDonor" i "Donor" per compatibilitat, però pot ser proveïdor/treballador
interface ParsedDonation {
  rowIndex: number;
  name: string;
  taxId: string;                    // Valor original de la columna (pot ser ref bancària)
  taxIdValid: boolean;              // true només si isValidSpanishTaxId() passa
  taxIdType: SpanishTaxIdType;      // 'DNI' | 'NIE' | 'CIF' | null
  idCandidate: string;              // Valor cru abans de normalitzar (per mostrar)
  iban: string;
  amount: number;
  status: 'found' | 'found_inactive' | 'new_with_taxid' | 'new_without_taxid';
  matchedDonor: Donor | null;
  matchedContactType?: 'donor' | 'supplier' | 'employee';
  matchMethod?: MatchMethod;        // Com s'ha trobat el match (per traçabilitat)
  matchValueMasked?: string;        // Valor emmascarament per mostrar a la UI (últims 4 IBAN, etc.)
  shouldCreate: boolean;
  zipCode: string;
}

type Step = 'upload' | 'mapping' | 'preview' | 'processing';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Detecta el delimitador més probable
const detectDelimiter = (text: string): string => {
  const firstLines = text.split('\n').slice(0, 10).join('\n');
  const counts = {
    ';': (firstLines.match(/;/g) || []).length,
    ',': (firstLines.match(/,/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
  };
  
  // Retorna el delimitador més freqüent
  return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
};

// Parseja un valor d'import (15,00 EUR -> 15.00)
const parseAmount = (value: string): number => {
  if (!value) return 0;
  // Elimina tot excepte números, comes i punts
  let cleaned = value.replace(/[^\d,.-]/g, '');
  // Si té format europeu (1.234,56), converteix a format americà
  if (cleaned.includes(',')) {
    // Si hi ha punt abans de la coma, és separador de milers
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }
  return parseFloat(cleaned) || 0;
};

// Detecta automàticament la fila on comencen les dades
// Utilitza consistència entre files i prioritza IBAN/DNI com a indicadors forts
const detectStartRow = (rows: string[][]): number => {
  const ibanPattern = /^(IBAN\s*)?[A-Z]{2}[0-9]{2}[A-Z0-9\s]{10,30}$/i;
  const taxIdPattern = /^[0-9]{7,8}[A-Z]$|^[A-Z][0-9]{7,8}$|^[XYZ][0-9]{7}[A-Z]$/i;

  const isDataRow = (row: string[]): { score: number; hasIban: boolean; hasTaxId: boolean } => {
    if (!row || row.length < 2) return { score: 0, hasIban: false, hasTaxId: false };

    const hasIban = row.some(cell => {
      const cleaned = (cell || '').toString().trim().replace(/\s/g, '');
      return ibanPattern.test(cleaned);
    });
    const hasTaxId = row.some(cell => {
      const cleaned = (cell || '').toString().trim();
      return taxIdPattern.test(cleaned);
    });
    const hasAmount = row.some(cell => {
      const amt = parseAmount((cell || '').toString());
      return amt > 0 && amt < 50000;
    });
    const hasText = row.some(cell => {
      const text = (cell || '').toString();
      return /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]{3,}/.test(text) &&
             !text.includes('EUR') &&
             !/^(fecha|socio|importe|estado|total|subtotal)/i.test(text);
    });

    let score = 0;
    if (hasIban) score += 3;
    if (hasTaxId) score += 2;
    if (hasAmount) score += 1;
    if (hasText) score += 1;

    return { score, hasIban, hasTaxId };
  };

  const maxSearch = Math.min(rows.length, 50);

  // Primera passada: busca files amb IBAN o DNI (indicadors forts)
  for (let i = 0; i < maxSearch; i++) {
    const current = isDataRow(rows[i]);
    if ((current.hasIban || current.hasTaxId) && current.score >= 3) {
      return i;
    }
  }

  // Segona passada: busca 3 files consecutives amb estructura consistent
  for (let i = 0; i < maxSearch - 2; i++) {
    const current = isDataRow(rows[i]);
    const next1 = isDataRow(rows[i + 1]);
    const next2 = isDataRow(rows[i + 2]);

    if (current.score >= 2 && next1.score >= 2 && next2.score >= 2) {
      return i;
    }
  }

  // Fallback: 2 files consecutives
  for (let i = 0; i < maxSearch - 1; i++) {
    const current = isDataRow(rows[i]);
    const next = isDataRow(rows[i + 1]);

    if (current.score >= 2 && next.score >= 2) {
      return i;
    }
  }

  return 0;
};

// Detecta automàticament les columnes
const detectColumns = (rows: string[][], startRow: number): { amount: number, name: number | null, taxId: number | null, iban: number | null } => {
  const sampleRows = rows.slice(startRow, startRow + 10);
  let amountCol = -1;
  let nameCol: number | null = null;
  let taxIdCol: number | null = null;
  let ibanCol: number | null = null;

  if (sampleRows.length === 0 || sampleRows[0].length === 0) {
    return { amount: 0, name: null, taxId: null, iban: null };
  }

  const numCols = sampleRows[0].length;

  for (let col = 0; col < numCols; col++) {
    const values = sampleRows.map(row => row[col] || '');

    // Detecta columna d'import (números amb format monetari)
    const amountScores = values.filter(v => {
      const amount = parseAmount(v);
      return amount > 0 && amount < 100000;
    }).length;
    if (amountScores > sampleRows.length * 0.7 && amountCol === -1) {
      amountCol = col;
      continue;
    }

    // Detecta columna d'IBAN (format ES + 22 dígits o similar)
    // Suporta formats: "ES1234567890123456789012", "IBAN ES12 3456 7890...", "ES12 3456 7890..."
    const ibanScores = values.filter(v => {
      // Elimina prefix "IBAN " i espais per normalitzar
      const cleaned = v.trim().replace(/^IBAN\s*/i, '').replace(/\s/g, '').toUpperCase();
      // IBAN espanyol: ES + 22 dígits, o altres països: 2 lletres + fins a 32 caràcters
      return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleaned);
    }).length;
    if (ibanScores > sampleRows.length * 0.5 && ibanCol === null) {
      ibanCol = col;
      continue;
    }

    // Detecta columna de DNI/CIF (8-9 dígits + lletra, o CIF)
    const taxIdScores = values.filter(v =>
      /^[0-9]{7,8}[A-Za-z]$/.test(v.trim()) || // DNI
      /^[A-Za-z][0-9]{7,8}$/.test(v.trim()) || // CIF
      /^[XYZ][0-9]{7}[A-Za-z]$/.test(v.trim()) // NIE
    ).length;
    if (taxIdScores > sampleRows.length * 0.5) {
      taxIdCol = col;
      continue;
    }

    // Detecta columna de nom (text amb espais, sense números)
    const nameScores = values.filter(v => {
      const cleaned = v.trim();
      return cleaned.length > 5 &&
             /[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{5,}/.test(cleaned) &&
             !/^[0-9]+$/.test(cleaned) &&
             !cleaned.includes('EUR') &&
             !/^[A-Z]{2}[0-9]{2}/.test(cleaned); // No és IBAN
    }).length;
    if (nameScores > sampleRows.length * 0.5 && nameCol === null) {
      nameCol = col;
    }
  }

  return {
    amount: amountCol >= 0 ? amountCol : 0,
    name: nameCol,
    taxId: taxIdCol,
    iban: ibanCol
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function RemittanceSplitter({
  open,
  onOpenChange,
  transaction,
  existingDonors,
  existingSuppliers = [],
  existingEmployees = [],
  onSplitDone,
}: RemittanceSplitterProps) {
  // Detectar direcció: IN (donacions, amount > 0) o OUT (pagaments, amount < 0)
  const direction: RemittanceDirection = transaction.amount >= 0 ? 'IN' : 'OUT';
  const isPaymentRemittance = direction === 'OUT';

  // Estats de navegació
  const [step, setStep] = React.useState<Step>('upload');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Estats de l'arxiu
  const [rawText, setRawText] = React.useState('');
  const [delimiter, setDelimiter] = React.useState(';');
  const [allRows, setAllRows] = React.useState<string[][]>([]);
  
  // Estats de mapejat
  const [startRow, setStartRow] = React.useState(0);
  const [amountColumn, setAmountColumn] = React.useState<number>(0);
  const [nameColumn, setNameColumn] = React.useState<number | null>(null);
  const [taxIdColumn, setTaxIdColumn] = React.useState<number | null>(null);
  const [ibanColumn, setIbanColumn] = React.useState<number | null>(null);
  const [newMappingName, setNewMappingName] = React.useState('');

  // Estats de preview
  const [parsedDonations, setParsedDonations] = React.useState<ParsedDonation[]>([]);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [defaultZipCode, setDefaultZipCode] = React.useState('08001');

  // Refs i hooks
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore, user } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  // Carregar configuracions guardades
  const mappingsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'remittanceMappings') : null,
    [firestore, organizationId]
  );
  const { data: savedMappings } = useCollection<SavedMapping>(mappingsQuery);

  // Carregar comptes bancaris (per exportar SEPA amb l'IBAN del deutor)
  const bankAccountsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'bankAccounts') : null,
    [firestore, organizationId]
  );
  const { data: bankAccounts } = useCollection<{ id: string; name: string; iban: string }>(bankAccountsQuery);

  // Obtenir l'IBAN del compte bancari de la transacció
  const debtorBankAccount = React.useMemo(() => {
    if (!transaction.bankAccountId || !bankAccounts) return null;
    return bankAccounts.find(ba => ba.id === transaction.bankAccountId) ?? null;
  }, [transaction.bankAccountId, bankAccounts]);

  // Reset quan es tanca el diàleg
  React.useEffect(() => {
    if (!open) {
      setStep('upload');
      setIsProcessing(false);
      setRawText('');
      setAllRows([]);
      setParsedDonations([]);
      setTotalAmount(0);
      setNewMappingName('');
    }
  }, [open]);

  // Estadístiques
  const stats = React.useMemo(() => {
    const found = parsedDonations.filter(d => d.status === 'found').length;
    const foundInactive = parsedDonations.filter(d => d.status === 'found_inactive').length;
    const newWithTaxId = parsedDonations.filter(d => d.status === 'new_with_taxid').length;
    const newWithoutTaxId = parsedDonations.filter(d => d.status === 'new_without_taxid').length;
    const toCreate = parsedDonations.filter(d => d.status !== 'found' && d.status !== 'found_inactive' && d.shouldCreate).length;
    return { found, foundInactive, newWithTaxId, newWithoutTaxId, toCreate };
  }, [parsedDonations]);

  // Càlcul del delta en cèntims per validació i observabilitat
  const validationDetails = React.useMemo(() => {
    const parentAbsAmount = Math.abs(transaction.amount);
    const deltaCents = Math.round((parentAbsAmount - totalAmount) * 100);
    const invalidAmounts = parsedDonations.filter(d => !d.amount || d.amount <= 0);
    const missingIbans = isPaymentRemittance
      ? parsedDonations.filter(d => !d.matchedDonor?.iban && !d.iban)
      : [];

    return {
      deltaCents,
      parentAmount: parentAbsAmount,
      totalItems: totalAmount,
      itemCount: parsedDonations.length,
      invalidAmounts: invalidAmounts.length,
      missingIbans: missingIbans.length,
    };
  }, [parsedDonations, totalAmount, transaction.amount, isPaymentRemittance]);

  // Validació per permetre processar: imports quadren i hi ha dades
  const canProcess = React.useMemo(() => {
    if (parsedDonations.length === 0) return false;
    // Verificar que tots els imports són vàlids (> 0)
    if (validationDetails.invalidAmounts > 0) return false;
    // Verificar que el total quadra amb el pare (±2 cèntims)
    if (Math.abs(validationDetails.deltaCents) > 2) return false;
    return true;
  }, [parsedDonations.length, validationDetails]);

  // Motiu de bloqueig per mostrar a l'usuari
  const blockReason = React.useMemo((): string | null => {
    if (parsedDonations.length === 0) return 'No hi ha dades per processar';
    if (validationDetails.invalidAmounts > 0) {
      return `${validationDetails.invalidAmounts} element(s) amb import invàlid (≤0)`;
    }
    if (Math.abs(validationDetails.deltaCents) > 2) {
      const deltaCentsAbs = Math.abs(validationDetails.deltaCents);
      return `Delta ${deltaCentsAbs > 0 ? '+' : ''}${validationDetails.deltaCents / 100}€ (màx ±0.02€)`;
    }
    return null;
  }, [parsedDonations.length, validationDetails]);

  // Files visibles per al preview del mapejat
  const previewRows = React.useMemo(() => {
    return allRows.slice(startRow, startRow + 8);
  }, [allRows, startRow]);

  // Número de columnes
  const numColumns = React.useMemo(() => {
    return Math.max(...allRows.map(r => r.length), 0);
  }, [allRows]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
      const isXml = fileName.endsWith('.xml');

      if (isExcel) {
        parseExcelFile(file);
      } else if (isXml) {
        // Potser és un fitxer SEPA pain.001
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          if (isPain001File(text)) {
            parseSepaFile(text);
          } else {
            toast({ variant: 'destructive', title: 'Format no reconegut', description: 'El fitxer XML no és un pain.001 vàlid' });
          }
        };
        reader.readAsText(file, 'UTF-8');
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          // Comprovar si és pain.001 encara que no tingui extensió .xml
          if (isPain001File(text)) {
            parseSepaFile(text);
          } else {
            processRawText(text);
          }
        };
        reader.readAsText(file, 'UTF-8');
      }
    }
    event.target.value = '';
  };

  // Parser per fitxers SEPA pain.001 (només mode OUT)
  const parseSepaFile = (xmlContent: string) => {
    if (!isPaymentRemittance) {
      toast({ variant: 'destructive', title: 'Error', description: 'Els fitxers SEPA només es poden importar per remeses de pagaments' });
      return;
    }

    try {
      const result = parsePain001(xmlContent);

      if (result.payments.length === 0) {
        toast({ variant: 'destructive', title: 'Fitxer buit', description: 'No s\'han trobat pagaments al fitxer SEPA' });
        return;
      }

      // Validar import total vs pare
      const parentAbsAmount = Math.abs(transaction.amount);
      if (Math.abs(parentAbsAmount - result.totalAmount) > 0.02) {
        toast({
          variant: 'destructive',
          title: 'Import no coincideix',
          description: `El total del fitxer (${result.totalAmount.toFixed(2)} €) no coincideix amb la transacció (${parentAbsAmount.toFixed(2)} €)`,
          duration: 9000,
        });
        return;
      }

      // Convertir pagaments SEPA a ParsedDonation (reutilitzem l'estructura)
      const donations: ParsedDonation[] = result.payments.map((payment, index) => {
        // Intentar trobar proveïdor existent per IBAN
        const matchedDonor = existingDonors.find(d =>
          d.iban && d.iban.replace(/\s/g, '').toUpperCase() === payment.creditorIban
        ) || existingDonors.find(d =>
          d.name && d.name.toLowerCase() === payment.creditorName.toLowerCase()
        );

        return {
          rowIndex: index + 1,
          name: payment.creditorName,
          taxId: '',
          taxIdValid: false,
          taxIdType: null as SpanishTaxIdType,
          idCandidate: '',
          iban: payment.creditorIban,
          amount: payment.amount,
          status: matchedDonor ? 'found' : 'new_without_taxid' as const,
          matchedDonor: matchedDonor ?? null,
          shouldCreate: !matchedDonor,
          zipCode: '',
        };
      });

      // Mostrar avisos si n'hi ha
      if (result.warnings.length > 0) {
        log(`[Splitter] Avisos SEPA: ${result.warnings.join(', ')}`);
      }

      setParsedDonations(donations);
      setTotalAmount(result.totalAmount);
      setStep('preview');

      toast({
        title: 'Fitxer SEPA importat',
        description: `${result.payments.length} pagaments carregats`,
      });

      log(`[Splitter] SEPA pain.001 carregat: ${result.payments.length} pagaments, total ${result.totalAmount.toFixed(2)} €`);
    } catch (error: any) {
      console.error('Error parsing SEPA:', error);
      toast({ variant: 'destructive', title: 'Error llegint SEPA', description: error.message });
    }
  };

  // Exportar a SEPA pain.001 (només mode OUT)
  const handleExportSepa = () => {
    if (!isPaymentRemittance || parsedDonations.length === 0) return;

    // Validar que tenim IBAN del deutor
    if (!debtorBankAccount?.iban) {
      toast({
        variant: 'destructive',
        title: 'IBAN no configurat',
        description: 'Cal configurar l\'IBAN del compte bancari per exportar el fitxer SEPA',
      });
      return;
    }

    // Validar imports invàlids
    const invalidAmounts = parsedDonations.filter(d => !d.amount || d.amount <= 0);
    if (invalidAmounts.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Imports invàlids',
        description: `${invalidAmounts.length} element(s) tenen import ≤ 0`,
      });
      return;
    }

    // Validar que el total quadra (±2 cèntims)
    if (Math.abs(validationDetails.deltaCents) > 2) {
      toast({
        variant: 'destructive',
        title: 'Import no quadra',
        description: `Delta: ${validationDetails.deltaCents / 100}€ (màx ±0.02€)`,
      });
      return;
    }

    try {
      // Preparar pagaments
      const payments = parsedDonations.map((d, index) => ({
        amount: d.amount,
        creditorName: d.name || d.matchedDonor?.name || `Beneficiari ${index + 1}`,
        creditorIban: d.iban || d.matchedDonor?.iban || '',
        concept: d.name ? `Pagament a ${d.name}` : `Pagament ${index + 1}`,
      }));

      // Validar que tots tenen IBAN
      const missingIban = payments.filter(p => !p.creditorIban);
      if (missingIban.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Falten IBANs',
          description: `${missingIban.length} pagaments no tenen IBAN configurat`,
        });
        return;
      }

      // Generar i descarregar
      downloadPain001({
        debtorName: debtorBankAccount.name || 'Organització',
        debtorIban: debtorBankAccount.iban,
        executionDate: new Date().toISOString().split('T')[0],
        payments,
      }, `pain001_${transaction.date}_${Date.now()}.xml`);

      toast({
        title: 'Fitxer SEPA generat',
        description: `S'ha descarregat el fitxer pain.001 amb ${payments.length} pagaments`,
      });

      log(`[Splitter] SEPA pain.001 exportat: ${payments.length} pagaments`);
    } catch (error: any) {
      console.error('Error generating SEPA:', error);
      toast({ variant: 'destructive', title: 'Error generant SEPA', description: error.message });
    }
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });

        // Agafa la primera fulla
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Converteix a matriu de files (totes les cel·les com a string)
        const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false
        });

        // Filtra files completament buides
        const filteredRows = rows.filter(row =>
          row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
        ).map(row =>
          row.map(cell => String(cell ?? '').trim())
        );

        if (filteredRows.length === 0) {
          toast({ variant: 'destructive', title: t.movements.splitter.error, description: 'El fitxer Excel està buit' });
          return;
        }

        setAllRows(filteredRows);
        setRawText(''); // No tenim text raw per Excel
        setDelimiter(''); // No aplica per Excel

        // Detecta fila inicial i columnes
        const detectedStartRow = detectStartRow(filteredRows);
        setStartRow(detectedStartRow);

        const detected = detectColumns(filteredRows, detectedStartRow);
        setAmountColumn(detected.amount);
        setNameColumn(detected.name);
        setTaxIdColumn(detected.taxId);
        setIbanColumn(detected.iban);

        log(`[Splitter] Excel carregat: ${filteredRows.length} files`);
        log(`[Splitter] Detecció automàtica - Fila inicial: ${detectedStartRow}, Import: col ${detected.amount}, Nom: col ${detected.name}, DNI: col ${detected.taxId}, IBAN: col ${detected.iban}`);

        setStep('mapping');
      } catch (error: any) {
        console.error('Error parsing Excel:', error);
        toast({ variant: 'destructive', title: t.movements.splitter.error, description: `Error llegint Excel: ${error.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processRawText = (text: string) => {
    setRawText(text);
    
    // Detecta delimitador
    const detectedDelimiter = detectDelimiter(text);
    setDelimiter(detectedDelimiter);
    
    // Parseja totes les files
    const lines = text.split('\n').filter(line => line.trim());
    const rows = lines.map(line => 
      line.split(detectedDelimiter).map(cell => cell.trim())
    );
    setAllRows(rows);

    // Detecta fila inicial i columnes
    const detectedStartRow = detectStartRow(rows);
    setStartRow(detectedStartRow);

    const detected = detectColumns(rows, detectedStartRow);
    setAmountColumn(detected.amount);
    setNameColumn(detected.name);
    setTaxIdColumn(detected.taxId);
    setIbanColumn(detected.iban);

    log(`[Splitter] Arxiu carregat: ${rows.length} files, delimitador: "${detectedDelimiter}"`);
    log(`[Splitter] Detecció automàtica - Fila inicial: ${detectedStartRow}, Import: col ${detected.amount}, Nom: col ${detected.name}, DNI: col ${detected.taxId}, IBAN: col ${detected.iban}`);

    setStep('mapping');
  };

  const handleApplySavedMapping = (mapping: SavedMapping) => {
    setDelimiter(mapping.delimiter);
    setStartRow(mapping.startRow);
    setAmountColumn(mapping.amountColumn);
    setNameColumn(mapping.nameColumn);
    setTaxIdColumn(mapping.taxIdColumn);
    setIbanColumn(mapping.ibanColumn ?? null);

    // Re-parseja amb el nou delimitador si cal
    if (mapping.delimiter !== delimiter) {
      const lines = rawText.split('\n').filter(line => line.trim());
      const rows = lines.map(line =>
        line.split(mapping.delimiter).map(cell => cell.trim())
      );
      setAllRows(rows);
    }

    toast({ title: t.movements.splitter.configurationApplied, description: t.movements.splitter.configurationAppliedDescription(mapping.name) });
  };

  const handleSaveMapping = async () => {
    if (!organizationId || !newMappingName.trim()) return;

    try {
      const mappingRef = doc(collection(firestore, 'organizations', organizationId, 'remittanceMappings'));
      const mapping: SavedMapping = {
        id: mappingRef.id,
        name: newMappingName.trim(),
        delimiter,
        startRow,
        amountColumn,
        nameColumn,
        taxIdColumn,
        ibanColumn,
        createdAt: new Date().toISOString(),
      };
      await setDoc(mappingRef, mapping);
      setNewMappingName('');
      toast({ title: t.movements.splitter.configurationSaved, description: t.movements.splitter.configurationSavedDescription(mapping.name) });
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast({ variant: 'destructive', title: t.movements.splitter.error, description: t.movements.splitter.errorSavingConfiguration });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!organizationId) return;
    try {
      await deleteDoc(doc(firestore, 'organizations', organizationId, 'remittanceMappings', mappingId));
      toast({ title: t.movements.splitter.configurationDeleted });
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  // Normalitza IBAN eliminant prefix "IBAN ", espais i passant a majúscules
  const normalizeIban = (iban: string): string => {
    if (!iban) return '';
    return iban
      .replace(/^IBAN\s*/i, '') // Elimina prefix "IBAN " (Santander i altres)
      .replace(/\s/g, '')       // Elimina tots els espais
      .toUpperCase();
  };

  // Retorna el donant trobat, el mètode de matching i el valor usat per traçabilitat
  const findDonor = (
    name: string,
    taxId: string,
    iban: string,
    donors: Donor[]
  ): { donor: Donor | undefined; method: MatchMethod; matchedValue: string } => {
    const normalizedCsvName = normalizeString(name);
    const csvNameTokens = new Set(normalizedCsvName.split(' ').filter(Boolean));

    // 1. Buscar per DNI/CIF (màxima prioritat)
    if (taxId) {
      const normalizedTaxId = normalizeString(taxId);
      const foundByTaxId = donors.find(d => normalizeString(d.taxId) === normalizedTaxId);
      if (foundByTaxId) return { donor: foundByTaxId, method: 'taxId', matchedValue: foundByTaxId.taxId || taxId };
    }

    // 2. Buscar per IBAN (molt fiable si coincideix)
    if (iban) {
      const normalizedCsvIban = normalizeIban(iban);
      const foundByIban = donors.find(d => d.iban && normalizeIban(d.iban) === normalizedCsvIban);
      if (foundByIban) return { donor: foundByIban, method: 'iban', matchedValue: foundByIban.iban || iban };
    }

    // 3. Buscar per nom (menys fiable)
    // GUARD: Bloquejar noms purament numèrics (poden fer falsos positius)
    if (normalizedCsvName && !isNumericLikeName(normalizedCsvName)) {
      const potentialMatches = donors.filter(d => {
        const normalizedDonorName = normalizeString(d.name);
        if (!normalizedDonorName) return false;
        // Bloquejar també donants amb noms numèrics
        if (isNumericLikeName(normalizedDonorName)) return false;
        const donorNameTokens = normalizedDonorName.split(' ').filter(Boolean);
        return [...csvNameTokens].every(token => donorNameTokens.includes(token));
      });
      if (potentialMatches.length === 1) {
        return { donor: potentialMatches[0], method: 'name', matchedValue: potentialMatches[0].name };
      }
    }

    return { donor: undefined, method: null, matchedValue: '' };
  };

  // Buscar beneficiari per mode OUT (treballadors i proveïdors)
  // ORDRE IMPORTANT: Treballadors PRIMER (nòmines), Proveïdors DESPRÉS
  // Criteri: 1) IBAN, 2) NIF/CIF, 3) Nom exacte (normalitzat)
  // NO fuzzy matching, NO codi postal
  const findBeneficiary = (
    name: string,
    taxId: string,
    iban: string
  ): { contact: Donor | null; contactType: 'supplier' | 'employee' | null } => {
    const normalizedCsvName = normalizeString(name);

    // 1. Buscar per IBAN (màxima prioritat per pagaments)
    if (iban) {
      const normalizedCsvIban = normalizeIban(iban);

      // Buscar a TREBALLADORS PRIMER (nòmines tenen prioritat)
      const foundEmployee = existingEmployees.find(e => e.iban && normalizeIban(e.iban) === normalizedCsvIban);
      if (foundEmployee) return { contact: foundEmployee as unknown as Donor, contactType: 'employee' };

      // Després buscar a proveïdors
      const foundSupplier = existingSuppliers.find(s => s.iban && normalizeIban(s.iban) === normalizedCsvIban);
      if (foundSupplier) return { contact: foundSupplier as unknown as Donor, contactType: 'supplier' };
    }

    // 2. Buscar per NIF/CIF
    if (taxId) {
      const normalizedTaxId = normalizeString(taxId);

      // Buscar a TREBALLADORS PRIMER
      const foundEmployee = existingEmployees.find(e => normalizeString(e.taxId) === normalizedTaxId);
      if (foundEmployee) return { contact: foundEmployee as unknown as Donor, contactType: 'employee' };

      // Després buscar a proveïdors
      const foundSupplier = existingSuppliers.find(s => normalizeString(s.taxId) === normalizedTaxId);
      if (foundSupplier) return { contact: foundSupplier as unknown as Donor, contactType: 'supplier' };
    }

    // 3. Buscar per nom exacte (normalitzat)
    if (normalizedCsvName) {
      // Buscar a TREBALLADORS PRIMER
      const foundEmployee = existingEmployees.find(e => normalizeString(e.name) === normalizedCsvName);
      if (foundEmployee) return { contact: foundEmployee as unknown as Donor, contactType: 'employee' };

      // Després buscar a proveïdors
      const foundSupplier = existingSuppliers.find(s => normalizeString(s.name) === normalizedCsvName);
      if (foundSupplier) return { contact: foundSupplier as unknown as Donor, contactType: 'supplier' };
    }

    return { contact: null, contactType: null };
  };

  const handleContinueToPreview = () => {
    // Permetre matching si hi ha almenys una columna d'identificació (nom, DNI o IBAN)
    if (nameColumn === null && taxIdColumn === null && ibanColumn === null) {
      toast({
        variant: 'destructive',
        title: t.movements.splitter.missingInfo,
        description: t.movements.splitter.missingInfoDescription
      });
      return;
    }

    setIsProcessing(true);

    try {
      const donations: ParsedDonation[] = [];
      let total = 0;

      const dataRows = allRows.slice(startRow);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        const amount = parseAmount(row[amountColumn] || '');
        const name = nameColumn !== null ? (row[nameColumn] || '').trim() : '';

        // Obtenir taxId - pot venir de la columna taxId o ser detectat a "Referencia externa"
        let taxId = taxIdColumn !== null ? (row[taxIdColumn] || '').trim().toUpperCase() : '';

        // Si no tenim taxId directament, mirar si algun altre camp conté un DNI
        // Format Santander: la columna "Referencia externa" pot contenir el DNI
        if (!taxId) {
          for (let col = 0; col < row.length; col++) {
            if (col === amountColumn || col === nameColumn || col === ibanColumn) continue;
            const cellValue = (row[col] || '').trim().toUpperCase();
            // Detecta format DNI: 7-8 dígits + lletra, o NIE: XYZ + 7 dígits + lletra
            if (/^[0-9]{7,8}[A-Z]$/.test(cellValue) || /^[XYZ][0-9]{7}[A-Z]$/.test(cellValue)) {
              taxId = cellValue;
              break;
            }
          }
        }

        // Normalitzar IBAN (elimina prefix "IBAN " i espais)
        const rawIban = ibanColumn !== null ? (row[ibanColumn] || '').trim() : '';
        const iban = rawIban.replace(/^IBAN\s*/i, '').replace(/\s/g, '').toUpperCase();

        // Saltar files sense import o sense identificació
        if (amount <= 0 || (!name && !taxId && !iban)) continue;

        // Saltar files que semblen subtotals
        if (name.toLowerCase().includes('subtotal') || name.toLowerCase().includes('total')) continue;

        total += amount;

        // Guardem el valor cru per mostrar (referència bancària, etc.)
        const idCandidate = taxId;

        // Validació fiscal REAL: només és taxId vàlid si passa isValidSpanishTaxId()
        const taxIdValid = isValidSpanishTaxId(taxId);
        const taxIdType = getSpanishTaxIdType(taxId);

        // Normalitzar el taxId NOMÉS si és vàlid, sinó buidar-lo
        const normalizedTaxId = taxIdValid ? normalizeTaxId(taxId) : '';

        // Matching diferent segons mode IN (donants) o OUT (proveïdors/treballadors)
        let matchedDonor: Donor | null = null;
        let matchedContactType: 'donor' | 'supplier' | 'employee' | undefined;
        let matchMethod: MatchMethod = null;
        let matchValueMasked: string | undefined;
        let status: ParsedDonation['status'];

        if (isPaymentRemittance) {
          // Mode OUT: buscar a proveïdors i treballadors
          // Usem el taxId original per matching (pot haver-hi coincidència per altres camps)
          const result = findBeneficiary(name, taxId, iban);
          matchedDonor = result.contact;
          matchedContactType = result.contactType ?? undefined;
          // findBeneficiary no retorna method, però segueix l'ordre: IBAN > taxId > nom
          // Podríem expandir-ho en el futur si cal

          if (matchedDonor) {
            status = 'found';
          } else if (taxIdValid) {
            // NOMÉS és new_with_taxid si és un DNI/NIE/CIF vàlid
            status = 'new_with_taxid';
          } else {
            // Tot el que no passa validació fiscal → new_without_taxid (inclou refs bancàries)
            status = 'new_without_taxid';
          }
        } else {
          // Mode IN: buscar a donants (comportament original)
          // IMPORTANT: Usar filterMatchableContacts per INCLOURE donants de baixa
          // Això garanteix que no es creïn duplicats amb el mateix DNI
          // INVARIANT: Mai crear donant nou si existeix taxId (actiu O baixa)
          const matchableDonors = filterMatchableContacts(existingDonors);
          const result = findDonor(name, taxId, iban, matchableDonors);
          matchedDonor = result.donor ?? null;
          matchedContactType = result.donor ? 'donor' : undefined;
          matchMethod = result.method;
          // Generar valor emmascarament per mostrar a la UI
          if (result.method && result.matchedValue) {
            matchValueMasked = maskMatchValue(result.method, result.matchedValue);
          }

          if (matchedDonor) {
            // Si el donant està inactiu (baixa), marcar com found_inactive
            // Això permet oferir reactivació sense crear duplicats
            status = matchedDonor.status === 'inactive' ? 'found_inactive' : 'found';
          } else if (taxIdValid) {
            // NOMÉS és new_with_taxid si és un DNI/NIE/CIF vàlid
            // I no existeix cap donant amb aquest taxId (ni actiu ni baixa)
            status = 'new_with_taxid';
          } else {
            // Tot el que no passa validació fiscal → new_without_taxid (inclou refs bancàries)
            status = 'new_without_taxid';
          }
        }

        donations.push({
          rowIndex: startRow + i + 1,
          name,
          taxId: normalizedTaxId,          // Només guardem taxId si és vàlid
          taxIdValid,
          taxIdType,
          idCandidate,                     // Valor original (ref bancària, etc.)
          iban,
          amount,
          status,
          matchedDonor,
          matchedContactType,
          matchMethod,                     // Traçabilitat: com s'ha trobat el match
          matchValueMasked,                // Valor emmascarament per mostrar a la UI
          shouldCreate: status !== 'found' && status !== 'found_inactive',
          zipCode: defaultZipCode,
        });
      }

      // Validar import total (comparar valors absoluts, tolerància ±0.02€)
      const parentAbsAmount = Math.abs(transaction.amount);
      if (Math.abs(parentAbsAmount - total) > 0.02) {
        toast({
          variant: 'destructive',
          title: t.movements.splitter.amountMismatch,
          description: t.movements.splitter.amountMismatchDescription(`${total.toFixed(2)} €`, `${parentAbsAmount.toFixed(2)} €`),
          duration: 9000,
        });
        setIsProcessing(false);
        return;
      }

      setParsedDonations(donations);
      setTotalAmount(total);
      setStep('preview');
      log(`[Splitter] Anàlisi completada. ${donations.length} donacions processades.`);

    } catch (error: any) {
      console.error('Error processing data:', error);
      toast({ variant: 'destructive', title: t.movements.splitter.error, description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleCreate = (index: number) => {
    setParsedDonations(prev => prev.map((d, i) => 
      i === index ? { ...d, shouldCreate: !d.shouldCreate } : d
    ));
  };

  const handleToggleAllNewWithTaxId = (checked: boolean) => {
    setParsedDonations(prev => prev.map(d => 
      d.status === 'new_with_taxid' ? { ...d, shouldCreate: checked } : d
    ));
  };

  const handleToggleAllNewWithoutTaxId = (checked: boolean) => {
    setParsedDonations(prev => prev.map(d => 
      d.status === 'new_without_taxid' ? { ...d, shouldCreate: checked } : d
    ));
  };

  const handleZipCodeChange = (index: number, zipCode: string) => {
    setParsedDonations(prev => prev.map((d, i) => 
      i === index ? { ...d, zipCode } : d
    ));
  };

  const handleApplyDefaultZipCode = () => {
    setParsedDonations(prev => prev.map(d =>
      d.status !== 'found' ? { ...d, zipCode: defaultZipCode } : d
    ));
  };

  // Reactivar un donant individual
  const handleReactivateDonor = async (index: number) => {
    const donation = parsedDonations[index];
    if (!donation.matchedDonor || !organizationId) return;

    try {
      const contactRef = doc(firestore, 'organizations', organizationId, 'contacts', donation.matchedDonor.id);
      await updateDoc(contactRef, {
        status: 'active',
        inactiveSince: null,
      });

      // Actualitzar l'estat local: canviar status a 'found' i actualitzar matchedDonor
      setParsedDonations(prev => prev.map((d, i) => {
        if (i === index && d.matchedDonor) {
          return {
            ...d,
            status: 'found',
            matchedDonor: { ...d.matchedDonor, status: 'active', inactiveSince: undefined },
          };
        }
        return d;
      }));

      toast({
        title: t.movements.splitter.donorReactivated,
        description: t.movements.splitter.donorReactivatedDescription(donation.matchedDonor.name),
      });

      log(`[Splitter] Donant reactivat: ${donation.matchedDonor.name}`);
    } catch (error: any) {
      console.error('Error reactivating donor:', error);
      toast({ variant: 'destructive', title: t.movements.splitter.error, description: error.message });
    }
  };

  // Reactivar tots els donants inactius
  const handleReactivateAllInactive = async () => {
    if (!organizationId) return;

    const inactiveDonations = parsedDonations.filter(d => d.status === 'found_inactive' && d.matchedDonor);
    if (inactiveDonations.length === 0) return;

    setIsProcessing(true);

    try {
      // Processar en chunks per evitar límit de 500 operacions de Firestore
      const BATCH_SIZE = 50;

      for (let i = 0; i < inactiveDonations.length; i += BATCH_SIZE) {
        const chunk = inactiveDonations.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(firestore);

        for (const donation of chunk) {
          if (donation.matchedDonor) {
            const contactRef = doc(firestore, 'organizations', organizationId, 'contacts', donation.matchedDonor.id);
            batch.update(contactRef, {
              status: 'active',
              inactiveSince: null,
            });
          }
        }

        await batch.commit();
        // Delay per permetre que la UI es repinti (augmentat per evitar bloquejos)
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Actualitzar l'estat local
      setParsedDonations(prev => prev.map(d => {
        if (d.status === 'found_inactive' && d.matchedDonor) {
          return {
            ...d,
            status: 'found',
            matchedDonor: { ...d.matchedDonor, status: 'active', inactiveSince: undefined },
          };
        }
        return d;
      }));

      toast({
        title: t.movements.splitter.allDonorsReactivated,
        description: t.movements.splitter.allDonorsReactivatedDescription(inactiveDonations.length),
      });

      log(`[Splitter] ${inactiveDonations.length} donants reactivats`);
    } catch (error: any) {
      console.error('Error reactivating donors:', error);
      toast({ variant: 'destructive', title: t.movements.splitter.error, description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async () => {
    if (!organizationId) return;

    // Guardrail: no processar si no es compleixen les condicions
    if (!canProcess) {
      toast({
        variant: 'destructive',
        title: 'No es pot processar',
        description: blockReason || 'Validació fallida',
      });
      return;
    }

    setStep('processing');
    setIsProcessing(true);
    log(`[Splitter] Iniciant processament...`);

    try {
      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
      const remittancesRef = collection(firestore, 'organizations', organizationId, 'remittances');

      const newDonorIds: Map<number, string> = new Map();
      const CHUNK_SIZE = 50;

      // 0. Crear document de remesa
      const remittanceRef = doc(remittancesRef);
      const remittanceId = remittanceRef.id;
      const now = new Date().toISOString();

      log(`[Splitter] Creant document de remesa ${remittanceId}...`);

      // ═══════════════════════════════════════════════════════════════════════
      // REGLA FIXA: Separar resoluble vs pendent
      // - Resoluble: match O (new_with_taxid amb name i amount > 0)
      // - Pendent: new_without_taxid O dades invàlides
      // ═══════════════════════════════════════════════════════════════════════
      const resolvableDonations = parsedDonations.filter(d =>
        d.status === 'found' ||
        d.status === 'found_inactive' ||
        (d.status === 'new_with_taxid' && d.name && d.amount > 0)
      );
      const pendingDonations = parsedDonations.filter(d =>
        d.status === 'new_without_taxid' ||
        (d.status === 'new_with_taxid' && (!d.name || d.amount <= 0))
      );

      log(`[Splitter] Resoluble: ${resolvableDonations.length}, Pendents: ${pendingDonations.length}`);

      // 1. Crear nous contactes NOMÉS per resoluble amb new_with_taxid
      const contactsToCreate = resolvableDonations.filter(d => d.status === 'new_with_taxid');
      const contactTypeName = isPaymentRemittance ? 'proveïdors' : 'donants';
      log(`[Splitter] Creant ${contactsToCreate.length} nous ${contactTypeName}...`);

      for (let i = 0; i < contactsToCreate.length; i += CHUNK_SIZE) {
        const chunk = contactsToCreate.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(firestore);

        for (const item of chunk) {
          const newContactRef = doc(contactsRef);
          const newContactData = isPaymentRemittance
            ? {
                type: 'supplier' as const,
                name: item.name || `Proveïdor ${item.taxId}`,
                taxId: item.taxId,
                zipCode: '',
                createdAt: now,
              }
            : {
                type: 'donor' as const,
                name: item.name || `Donant ${item.taxId}`,
                taxId: item.taxId,
                zipCode: item.zipCode,
                donorType: 'individual' as const,
                membershipType: 'recurring' as const,
                createdAt: now,
              };

          batch.set(newContactRef, newContactData);
          newDonorIds.set(item.rowIndex, newContactRef.id);
        }

        await batch.commit();
        await new Promise(resolve => setTimeout(resolve, 100));
        log(`[Splitter] ${contactTypeName} creats: ${Math.min(i + CHUNK_SIZE, contactsToCreate.length)}/${contactsToCreate.length}`);
      }

      // 2. Crear transaccions filles NOMÉS per resoluble
      const childTransactionIds: string[] = [];
      let resolvedTotalCents = 0;
      log(`[Splitter] Creant ${resolvableDonations.length} transaccions...`);

      for (let i = 0; i < resolvableDonations.length; i += CHUNK_SIZE) {
        const chunk = resolvableDonations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(firestore);

        for (const item of chunk) {
          const newTxRef = doc(transactionsRef);
          childTransactionIds.push(newTxRef.id);

          let contactId: string | null = null;
          if (item.matchedDonor) {
            contactId = item.matchedDonor.id;
          } else if (item.status === 'new_with_taxid') {
            contactId = newDonorIds.get(item.rowIndex) || null;
          }

          const displayName = item.name || item.taxId || 'Anònim';

          let category: string;
          let finalAmount: number;
          let description: string;

          if (isPaymentRemittance) {
            category = transaction.category || 'supplierPayments';
            finalAmount = -Math.abs(item.amount);
            description = `Pagament: ${displayName}`;
          } else {
            const membershipType = item.matchedDonor?.membershipType ?? 'recurring';
            category = membershipType === 'recurring' ? 'memberFees' : 'donations';
            finalAmount = Math.abs(item.amount);
            description = `${t.movements.splitter.donationDescription}: ${displayName}`;
          }

          resolvedTotalCents += Math.round(Math.abs(item.amount) * 100);

          const newTxData: Omit<Transaction, 'id'> & { id: string } = {
            id: newTxRef.id,
            date: transaction.date,
            description,
            amount: finalAmount,
            category,
            document: null,
            contactId,
            projectId: transaction.projectId ?? null,
            source: 'remittance',
            parentTransactionId: transaction.id,
            bankAccountId: transaction.bankAccountId ?? null,
            isRemittanceItem: true,
            remittanceId,
          };
          if (contactId) {
            (newTxData as any).contactType = isPaymentRemittance ? 'supplier' : 'donor';
          }

          batch.set(newTxRef, newTxData);
        }

        await batch.commit();
        await new Promise(resolve => setTimeout(resolve, 100));
        log(`[Splitter] Transaccions creades: ${Math.min(i + CHUNK_SIZE, resolvableDonations.length)}/${resolvableDonations.length}`);
      }

      // 3. Guardar pendents a subcol·lecció
      let pendingTotalCents = 0;
      if (pendingDonations.length > 0) {
        log(`[Splitter] Guardant ${pendingDonations.length} pendents...`);
        const pendingRef = collection(firestore, 'organizations', organizationId, 'remittances', remittanceId, 'pending');

        for (let i = 0; i < pendingDonations.length; i += CHUNK_SIZE) {
          const chunk = pendingDonations.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(firestore);

          for (const item of chunk) {
            const pendingDocRef = doc(pendingRef);
            const reason: import('@/lib/data').RemittancePendingReason =
              !item.taxId ? 'NO_TAXID' :
              !item.name || item.amount <= 0 ? 'INVALID_DATA' :
              'NO_MATCH';

            pendingTotalCents += Math.round(Math.abs(item.amount) * 100);

            batch.set(pendingDocRef, {
              id: pendingDocRef.id,
              nameRaw: item.name || '',
              taxId: item.taxId || null,
              iban: item.iban || null,
              amountCents: Math.round(Math.abs(item.amount) * 100),
              reason,
              sourceRowIndex: item.rowIndex,
              createdAt: now,
            });
          }

          await batch.commit();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        log(`[Splitter] Pendents guardats: ${pendingDonations.length}`);
      }

      // Calcular totals en cèntims
      const expectedTotalCents = Math.round(parsedDonations.reduce((sum, d) => sum + Math.abs(d.amount), 0) * 100);
      const remittanceStatus = pendingDonations.length > 0 ? 'partial' : 'complete';

      // 4. Crear document de remesa amb totals
      const remittanceType = isPaymentRemittance ? 'payments' : 'donations';
      await setDoc(remittanceRef, {
        direction: direction.toLowerCase(),
        type: remittanceType,
        parentTransactionId: transaction.id,
        transactionIds: childTransactionIds,
        totalAmount: Math.abs(totalAmount),
        itemCount: parsedDonations.length,
        createdAt: now,
        createdBy: user?.uid ?? null,
        bankAccountId: transaction.bankAccountId ?? null,
        // Nous camps per traçabilitat
        resolvedCount: resolvableDonations.length,
        pendingCount: pendingDonations.length,
        expectedTotalCents,
        resolvedTotalCents,
        pendingTotalCents,
        validation: {
          deltaCents: validationDetails.deltaCents,
          parentAmount: validationDetails.parentAmount,
          totalItems: validationDetails.totalItems,
          validatedAt: now,
          validatedByUid: user?.uid ?? null,
        },
      });
      log(`[Splitter] Document de remesa creat: ${remittanceId} (status: ${remittanceStatus}, resolved: ${resolvableDonations.length}, pending: ${pendingDonations.length})`);

      // 5. Marcar transacció pare amb estat correcte
      const updateBatch = writeBatch(firestore);
      const remittanceCategory = isPaymentRemittance
        ? (transaction.category || 'supplierPayments')
        : 'memberFees';
      updateBatch.update(doc(transactionsRef, transaction.id), {
        isRemittance: true,
        remittanceItemCount: parsedDonations.length,
        remittanceDirection: direction,
        remittanceType,
        remittanceId,
        remittanceStatus,
        remittanceResolvedCount: resolvableDonations.length,
        remittancePendingCount: pendingDonations.length,
        remittanceExpectedTotalCents: expectedTotalCents,
        remittanceResolvedTotalCents: resolvedTotalCents,
        remittancePendingTotalCents: pendingTotalCents,
        category: remittanceCategory,
        contactId: null,
        contactType: null,
      });
      await updateBatch.commit();

      log(`[Splitter] ✅ Processament completat!`);

      // Toast diferent segons si hi ha pendents
      if (pendingDonations.length > 0) {
        toast({
          title: t.movements.splitter.remittancePartial ?? 'Remesa parcial',
          description: typeof t.movements.splitter.remittancePartialDescription === 'function'
            ? t.movements.splitter.remittancePartialDescription(pendingDonations.length)
            : `S'han creat ${resolvableDonations.length} quotes. ${pendingDonations.length} han quedat pendents.`,
          variant: 'default',
        });
      } else {
        toast({
          title: isPaymentRemittance
            ? t.movements.splitter.paymentsRemittanceProcessed
            : t.movements.splitter.remittanceProcessed,
          description: isPaymentRemittance
            ? t.movements.splitter.paymentsRemittanceProcessedDescription(parsedDonations.length, contactsToCreate.length)
            : t.movements.splitter.remittanceProcessedDescription(parsedDonations.length, contactsToCreate.length),
        });
      }

      setIsProcessing(false);
      setStep('upload');
      await new Promise(resolve => setTimeout(resolve, 100));
      onSplitDone();

    } catch (error: any) {
      console.error("Error processing remittance:", error);
      log(`[Splitter] ERROR: ${error.message}`);
      toast({ variant: 'destructive', title: t.movements.splitter.error, description: error.message, duration: 9000 });
      setStep('preview');
      setIsProcessing(false);
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERITZACIÓ
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={
        step === 'mapping' ? "sm:max-w-5xl max-h-[90vh]" :
        step === 'preview' ? "w-[95vw] max-w-[1400px] h-[90vh] max-h-[90vh] flex flex-col" :
        "sm:max-w-md"
      }>
        
        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1: UPLOAD
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>
                {isPaymentRemittance
                  ? t.movements.splitter.paymentsTitle
                  : t.movements.splitter.title}
              </DialogTitle>
              <DialogDescription>
                {isPaymentRemittance
                  ? t.movements.splitter.paymentsUploadDescription
                  : t.movements.splitter.uploadDescription}
              </DialogDescription>
            </DialogHeader>

            <Alert variant={isPaymentRemittance ? 'default' : undefined}>
              <Info className="h-4 w-4" />
              <AlertTitle>{t.movements.splitter.compatibleBanks}</AlertTitle>
              <AlertDescription>
                {t.movements.splitter.compatibleBanksDescription}
              </AlertDescription>
            </Alert>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.txt,.xlsx,.xls,.xml"
              className="hidden"
              disabled={isProcessing}
            />

            <div className="flex flex-col gap-2">
              <Button onClick={handleFileClick} disabled={isProcessing} className="w-full">
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="mr-2 h-4 w-4" />
                )}
                {t.movements.splitter.selectCsvFile}
              </Button>

              {/* Botó SEPA només per mode OUT */}
              {isPaymentRemittance && (
                <Button onClick={handleFileClick} disabled={isProcessing} variant="outline" className="w-full">
                  <FileCode className="mr-2 h-4 w-4" />
                  Importar SEPA (pain.001)
                </Button>
              )}
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t.movements.splitter.cancel}
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2: MAPPING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'mapping' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                {t.movements.splitter.configureMappingTitle}
              </DialogTitle>
              <DialogDescription>
                {t.movements.splitter.configureMappingDescription}
              </DialogDescription>
            </DialogHeader>

            {/* Configuracions guardades */}
            {savedMappings && savedMappings.length > 0 && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <Label className="text-sm font-medium">{t.movements.splitter.savedConfigurations}</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {savedMappings.map(mapping => (
                    <div key={mapping.id} className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleApplySavedMapping(mapping)}
                      >
                        {mapping.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDeleteMapping(mapping.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuració de parsing */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Delimitador només visible per CSV/TXT (quan tenim rawText) */}
              {rawText && (
                <div className="space-y-1">
                  <Label className="text-xs">{t.movements.splitter.delimiter}</Label>
                  <Select value={delimiter} onValueChange={(v) => {
                    setDelimiter(v);
                    const lines = rawText.split('\n').filter(line => line.trim());
                    const rows = lines.map(line => line.split(v).map(cell => cell.trim()));
                    setAllRows(rows);
                  }}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=";">{t.movements.splitter.semicolon}</SelectItem>
                      <SelectItem value=",">{t.movements.splitter.comma}</SelectItem>
                      <SelectItem value={"\t"}>{t.movements.splitter.tab}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1">
                <Label className="text-xs">{t.movements.splitter.startRow}</Label>
                <Input
                  type="number"
                  min={0}
                  max={allRows.length - 1}
                  value={startRow}
                  onChange={(e) => setStartRow(parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t.movements.splitter.totalRows}</Label>
                <div className="h-8 flex items-center text-sm text-muted-foreground">
                  {t.movements.splitter.totalRowsCount(allRows.length, allRows.length - startRow)}
                </div>
              </div>
            </div>

            {/* Previsualització de les dades */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t.movements.splitter.preview(previewRows.length)}
              </Label>
              <ScrollArea className="h-[180px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-xs">#</TableHead>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <TableHead key={i} className="text-xs min-w-[100px]">
                          {t.movements.splitter.columnPrefix(i)}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {startRow + rowIdx + 1}
                        </TableCell>
                        {Array.from({ length: numColumns }, (_, colIdx) => (
                          <TableCell
                            key={colIdx}
                            className={`text-xs truncate max-w-[150px] ${
                              colIdx === amountColumn ? 'bg-green-100 dark:bg-green-900/30' :
                              colIdx === nameColumn ? 'bg-blue-100 dark:bg-blue-900/30' :
                              colIdx === taxIdColumn ? 'bg-purple-100 dark:bg-purple-900/30' :
                              colIdx === ibanColumn ? 'bg-cyan-100 dark:bg-cyan-900/30' :
                              ''
                            }`}
                          >
                            {row[colIdx] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Mapejat de columnes */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="font-medium">{t.movements.splitter.fieldMapping}</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    {t.movements.splitter.amountMandatory}
                  </Label>
                  <Select
                    value={String(amountColumn)}
                    onValueChange={(v) => setAmountColumn(parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    {t.movements.splitter.name}
                  </Label>
                  <Select
                    value={nameColumn !== null ? String(nameColumn) : 'none'}
                    onValueChange={(v) => setNameColumn(v === 'none' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.movements.splitter.notAvailable}</SelectItem>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-purple-500"></span>
                    {t.movements.splitter.taxId}
                  </Label>
                  <Select
                    value={taxIdColumn !== null ? String(taxIdColumn) : 'none'}
                    onValueChange={(v) => setTaxIdColumn(v === 'none' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.movements.splitter.notAvailable}</SelectItem>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-cyan-500"></span>
                    {t.movements.splitter.iban}
                  </Label>
                  <Select
                    value={ibanColumn !== null ? String(ibanColumn) : 'none'}
                    onValueChange={(v) => setIbanColumn(v === 'none' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t.movements.splitter.notAvailable}</SelectItem>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Guardar configuració */}
            <div className="flex items-center gap-2">
              <Input
                placeholder={t.movements.splitter.configName}
                value={newMappingName}
                onChange={(e) => setNewMappingName(e.target.value)}
                className="flex-1 h-8"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveMapping}
                disabled={!newMappingName.trim()}
              >
                <Save className="mr-1 h-3 w-3" />
                {t.movements.splitter.save}
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.movements.splitter.back}
              </Button>
              <Button onClick={handleContinueToPreview} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {t.movements.splitter.continue}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3: PREVIEW - Wide modal with fixed header/footer
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <>
            {/* ─────────────────────────────────────────────────────────────────
                HEADER FIX: Títol + Resum compacte + Alertes
                ───────────────────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 space-y-3 pb-3 border-b">
              {/* Títol i descripció */}
              <DialogHeader className="pb-0">
                <DialogTitle>
                  {isPaymentRemittance
                    ? t.movements.splitter.paymentsReviewTitle
                    : t.movements.splitter.reviewTitle}
                </DialogTitle>
                <DialogDescription>
                  {isPaymentRemittance
                    ? t.movements.splitter.paymentsReviewDescription
                    : t.movements.splitter.reviewDescription}
                </DialogDescription>
              </DialogHeader>

              {/* Resum compacte en línia */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Stats compactes com a badges */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm">
                  <span className="font-semibold">{parsedDonations.length}</span>
                  <span className="text-muted-foreground">
                    {isPaymentRemittance ? t.movements.splitter.payments : t.movements.splitter.donations}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 border border-green-200 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="font-semibold text-green-700">{stats.found}</span>
                  <span className="text-green-600">{t.movements.splitter.found}</span>
                </div>
                {stats.foundInactive > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-sm">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-semibold text-amber-700">{stats.foundInactive}</span>
                    <span className="text-amber-600">{t.movements.splitter.foundInactiveBadge}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReactivateAllInactive}
                      disabled={isProcessing}
                      className="h-5 px-1.5 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100 ml-1"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                {stats.newWithTaxId > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-sm">
                    <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                    <span className="font-semibold text-blue-700">{stats.newWithTaxId}</span>
                    <span className="text-blue-600">{t.movements.splitter.newWithTaxId}</span>
                  </div>
                )}
                {stats.newWithoutTaxId > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-sm">
                    <AlertCircle className="h-3.5 w-3.5 text-orange-600" />
                    <span className="font-semibold text-orange-700">{stats.newWithoutTaxId}</span>
                    <span className="text-orange-600">{t.movements.splitter.newWithoutTaxId}</span>
                  </div>
                )}

                {/* Separador visual */}
                <div className="h-5 w-px bg-border mx-1" />

                {/* Import total compacte - comparem valors absoluts per suportar IN i OUT */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm ${
                  Math.abs(validationDetails.deltaCents) <= 2
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <CheckCircle2 className={`h-3.5 w-3.5 ${
                    Math.abs(validationDetails.deltaCents) <= 2 ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <span className="font-semibold">{formatCurrencyEU(totalAmount)}</span>
                  <span className="text-muted-foreground">/ {formatCurrencyEU(Math.abs(transaction.amount))}</span>
                  {validationDetails.deltaCents !== 0 && (
                    <span className={`text-xs ml-1 ${Math.abs(validationDetails.deltaCents) <= 2 ? 'text-green-600' : 'text-red-600'}`}>
                      (Δ {validationDetails.deltaCents > 0 ? '+' : ''}{(validationDetails.deltaCents / 100).toFixed(2)}€)
                    </span>
                  )}
                </div>
              </div>

              {/* Banner d'alerta quan delta > ±2 cèntims */}
              {Math.abs(validationDetails.deltaCents) > 2 && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Imports no quadren</AlertTitle>
                  <AlertDescription className="text-xs">
                    Diferència: {validationDetails.deltaCents > 0 ? '+' : ''}{(validationDetails.deltaCents / 100).toFixed(2)}€
                    (màxim permès: ±0.02€). Revisa els imports o torna a importar el fitxer.
                  </AlertDescription>
                </Alert>
              )}

              {/* Opcions per crear contactes - compacte */}
              {/* Per mode IN: mostra opcions de CP i checkboxes de creació de donants */}
              {/* Per mode OUT: només mostra checkboxes (no CP) */}
              {(stats.newWithTaxId > 0 || stats.newWithoutTaxId > 0) && (
                <div className="flex flex-wrap items-center gap-4 px-3 py-2 rounded-md bg-muted/50 border text-sm">
                  {/* CP només per mode IN (donants) */}
                  {!isPaymentRemittance && (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="defaultZipCode" className="text-xs whitespace-nowrap text-muted-foreground">
                          {t.movements.splitter.defaultZipCode}:
                        </Label>
                        <Input
                          id="defaultZipCode"
                          value={defaultZipCode}
                          onChange={(e) => setDefaultZipCode(e.target.value)}
                          className="w-20 h-7 text-xs"
                          placeholder={t.movements.splitter.zipCodePlaceholder}
                        />
                        <Button variant="ghost" size="sm" onClick={handleApplyDefaultZipCode} className="h-7 px-2 text-xs">
                          {t.movements.splitter.applyToAll}
                        </Button>
                      </div>
                      <div className="h-4 w-px bg-border" />
                    </>
                  )}

                  {/* Info: els nous donants amb taxId es creen automàticament, els altres van a pendents */}
                  {stats.newWithTaxId > 0 && (
                    <div className="flex items-center space-x-1.5 text-xs text-blue-600">
                      <UserPlus className="h-3.5 w-3.5" />
                      <span>{t.movements.splitter.willCreateWithTaxId?.(stats.newWithTaxId) ?? `${stats.newWithTaxId} es crearan (amb DNI)`}</span>
                    </div>
                  )}
                  {stats.newWithoutTaxId > 0 && (
                    <div className="flex items-center space-x-1.5 text-xs text-orange-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{t.movements.splitter.willBePendingWithNote?.(stats.newWithoutTaxId) ?? t.movements.splitter.willBePending?.(stats.newWithoutTaxId) ?? `${stats.newWithoutTaxId} quedaran pendents (sense DNI)`}</span>
                    </div>
                  )}
                </div>
              )}

              {/* InfoBox informatiu: només si hi ha pendents i és remesa IN */}
              {stats.newWithoutTaxId > 0 && !isPaymentRemittance && (
                <div className="px-3 py-3 rounded-md bg-orange-50 border border-orange-200 text-orange-900 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="font-medium">
                        {t.movements.splitter.pendingPreProcessTitle ?? "Algunes línies no es poden processar ara"}
                      </p>
                      <p className="text-xs text-orange-800">
                        {t.movements.splitter.pendingPreProcessBody ?? "Aquesta remesa conté donacions que no porten DNI/NIF fiscal vàlid i l'IBAN no coincideix amb cap donant existent."}
                      </p>
                      <div className="pt-1">
                        <p className="font-medium text-xs">
                          {t.movements.splitter.pendingPreProcessNextTitle ?? "Què passarà després de processar"}
                        </p>
                        <ol className="list-decimal list-inside text-xs text-orange-800 mt-1 space-y-0.5">
                          <li>{t.movements.splitter.pendingPreProcessNextStep1 ?? "Aquestes línies quedaran com a \"Pendents\"."}</li>
                          <li>{t.movements.splitter.pendingPreProcessNextStep2 ?? "Podràs veure l'IBAN detectat."}</li>
                          <li>{t.movements.splitter.pendingPreProcessNextStep3 ?? "Podràs crear un donant o afegir l'IBAN a un existent."}</li>
                          <li>{t.movements.splitter.pendingPreProcessNextStep4 ?? "I clicar \"Reprocessar pendents\" per completar la remesa."}</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ─────────────────────────────────────────────────────────────────
                TAULA PROTAGONISTA: Scroll independent, ocupa tot l'espai
                ───────────────────────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>
                      {isPaymentRemittance ? t.movements.splitter.beneficiary : t.movements.splitter.name}
                    </TableHead>
                    <TableHead>{t.movements.splitter.taxId}</TableHead>
                    <TableHead className="text-right">{t.movements.splitter.amount}</TableHead>
                    <TableHead>{t.movements.splitter.status}</TableHead>
                    <TableHead>{t.movements.splitter.inDatabase}</TableHead>
                    {/* CP només per mode IN (donants) */}
                    {!isPaymentRemittance && (
                      <TableHead className="w-[100px]">{t.movements.splitter.zipCode}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedDonations.map((donation, index) => (
                    <TableRow key={index} className={
                      donation.status === 'found' || donation.status === 'found_inactive'
                        ? 'bg-green-50/50'
                        : donation.status === 'new_with_taxid'
                        ? 'bg-blue-50/50'
                        : 'bg-orange-50/50'
                    }>
                      <TableCell className="font-medium">{donation.name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {donation.taxIdValid ? (
                          <span className="text-green-700" title={`${donation.taxIdType}: ${donation.taxId}`}>
                            {donation.taxId}
                            <span className="ml-1 text-[10px] text-green-600">({donation.taxIdType})</span>
                          </span>
                        ) : donation.idCandidate ? (
                          <span className="text-orange-600" title={t.movements?.splitter?.nonFiscalIdLabel ?? 'ID no fiscal'}>
                            {donation.idCandidate}
                            <span className="ml-1 text-[10px] text-orange-500">(ref)</span>
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyEU(donation.amount)}
                      </TableCell>
                      <TableCell>
                        {donation.status === 'found' && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            {t.movements.splitter.foundBadge}
                          </Badge>
                        )}
                        {donation.status === 'found_inactive' && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              {t.movements.splitter.foundInactiveBadge}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReactivateDonor(index)}
                              className="h-6 px-2 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              {t.movements.splitter.reactivate}
                            </Button>
                          </div>
                        )}
                        {donation.status === 'new_with_taxid' && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            <UserPlus className="mr-1 h-3 w-3" />
                            {t.movements.splitter.newValidTaxIdLabel ?? `Nou (${donation.taxIdType} vàlid)`}
                          </Badge>
                        )}
                        {donation.status === 'new_without_taxid' && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            {donation.idCandidate
                              ? (t.movements.splitter.nonFiscalIdLabel ?? 'ID no fiscal')
                              : t.movements.splitter.withoutTaxIdBadge}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {donation.status === 'found_inactive' && donation.matchedDonor ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-700">{donation.matchedDonor.name}</span>
                            {/* Badge traçabilitat match amb valor emmascarament */}
                            {donation.matchMethod && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                                {donation.matchMethod === 'iban' ? 'IBAN' : donation.matchMethod === 'taxId' ? 'DNI' : 'Nom'}
                                {donation.matchValueMasked && ` ${donation.matchValueMasked}`}
                              </Badge>
                            )}
                          </div>
                        ) : donation.matchedDonor ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-green-700">{donation.matchedDonor.name}</span>
                            {/* Badge traçabilitat match per mode IN amb valor emmascarament */}
                            {!isPaymentRemittance && donation.matchMethod && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-300">
                                {donation.matchMethod === 'iban' ? 'IBAN' : donation.matchMethod === 'taxId' ? 'DNI' : 'Nom'}
                                {donation.matchValueMasked && ` ${donation.matchValueMasked}`}
                              </Badge>
                            )}
                            {/* Badge tipus de contacte per mode OUT */}
                            {isPaymentRemittance && donation.matchedContactType && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {donation.matchedContactType === 'supplier'
                                  ? t.movements.splitter.supplierBadge
                                  : donation.matchedContactType === 'employee'
                                  ? t.movements.splitter.employeeBadge
                                  : ''}
                              </Badge>
                            )}
                          </div>
                        ) : donation.status === 'new_with_taxid' ? (
                          <div className="space-y-0.5">
                            <span className="text-blue-600 font-medium">
                              {isPaymentRemittance
                                ? t.movements.splitter.createSupplier
                                : t.movements.splitter.willBeCreated}
                            </span>
                            <div className="text-[11px] text-blue-500">
                              {donation.name} · {donation.taxIdType}: {donation.taxId}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-orange-600 italic">{t.movements.splitter.willBePendingLabel ?? 'Quedarà pendent'}</span>
                            <div className="text-[11px] text-orange-500">
                              {donation.idCandidate
                                ? (t.movements.splitter.nonFiscalIdReason ?? 'ID no és DNI/CIF vàlid')
                                : (t.movements.splitter.noTaxIdReason ?? 'Sense identificador fiscal')}
                            </div>
                          </div>
                        )}
                      </TableCell>
                      {/* CP només per mode IN (donants) i només per nous amb taxId */}
                      {!isPaymentRemittance && (
                        <TableCell>
                          {donation.status === 'new_with_taxid' && (
                            <Input
                              value={donation.zipCode}
                              onChange={(e) => handleZipCodeChange(index, e.target.value)}
                              className="w-20 h-7 text-xs"
                              placeholder={t.movements.splitter.zipCode}
                            />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ─────────────────────────────────────────────────────────────────
                FOOTER FIX: Resum + Accions
                ───────────────────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {isPaymentRemittance
                      ? t.movements.splitter.paymentsActionSummary(stats.toCreate, parsedDonations.length)
                      : t.movements.splitter.actionSummary(stats.toCreate, parsedDonations.length)}
                  </span>
                  {/* Botó exportar SEPA només per mode OUT */}
                  {isPaymentRemittance && parsedDonations.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportSepa}
                      disabled={isProcessing || !debtorBankAccount?.iban || !canProcess}
                      title={
                        !debtorBankAccount?.iban
                          ? 'Cal configurar l\'IBAN del compte bancari'
                          : !canProcess
                          ? blockReason || 'Validació fallida'
                          : 'Exportar fitxer SEPA pain.001'
                      }
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Exportar SEPA
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep('mapping')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t.movements.splitter.backToMapping}
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing || !canProcess}
                    title={blockReason || undefined}
                  >
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {isPaymentRemittance
                      ? t.movements.splitter.processPayments(parsedDonations.length)
                      : t.movements.splitter.processDonations(parsedDonations.length)}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4: PROCESSING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">{t.movements.splitter.processingRemittance}</p>
            <p className="text-sm text-muted-foreground">
              {t.movements.splitter.creatingDonorsAndTransactions(stats.toCreate, parsedDonations.length)}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}