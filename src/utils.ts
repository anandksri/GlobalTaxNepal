import type {
  BillingDocument,
  DocumentDraft,
  DocumentType,
  NormalDocument,
  StoreData,
  TransactionDocument,
} from './types'
import { makeEmptyCustomer } from './storage'
import { formatNepaliDate, nepaliDate, today } from './dateUtils'

export { formatNepaliDate, today }

export function makeDraft(type: DocumentType): DocumentDraft {
  return {
    type,
    date: today(),
    customer: makeEmptyCustomer(),
    items:
      type === 'normal'
        ? Array.from({ length: 3 }, () => ({
            id: crypto.randomUUID(),
            particular: '',
            years: '',
            rate: '',
          }))
        : [],
    amount: '',
    due: '',
    notes: '',
    linkedBillId: '',
  }
}

export function documentTotal(document: BillingDocument): number {
  return document.type === 'normal'
    ? document.items.reduce((sum, item) => sum + item.years * item.rate, 0)
    : document.amount
}

export function outstandingForBill(
  bill: NormalDocument,
  documents: BillingDocument[],
  excludeId = '',
): number {
  const applied = documents
    .filter((document): document is TransactionDocument =>
      document.id !== excludeId &&
      document.type !== 'normal' &&
      document.linkedBillId === bill.id)
    .reduce((sum, document) => sum + document.amount, 0)
  return Math.max(0, documentTotal(bill) - applied)
}

export function documentDue(
  document: BillingDocument,
  documents: BillingDocument[],
): number {
  if (document.type !== 'normal') return document.due
  return outstandingForBill(document, documents)
}

export function currencyFormatter() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function amountInWords(value: number): string {
  const small = [
    'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
    'sixteen', 'seventeen', 'eighteen', 'nineteen',
  ]
  const tens = [
    '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy',
    'eighty', 'ninety',
  ]
  const underThousand = (number: number): string => {
    if (number < 20) return small[number]
    if (number < 100) {
      return `${tens[Math.floor(number / 10)]}${number % 10 ? ` ${small[number % 10]}` : ''}`
    }
    return `${small[Math.floor(number / 100)]} hundred${number % 100 ? ` ${underThousand(number % 100)}` : ''}`
  }
  const integerWords = (number: number): string => {
    if (number < 1000) return underThousand(number)
    const units = [
      [1_000_000_000, 'billion'],
      [1_000_000, 'million'],
      [1_000, 'thousand'],
    ] as const
    for (const [size, label] of units) {
      if (number >= size) {
        return `${integerWords(Math.floor(number / size))} ${label}${number % size ? ` ${integerWords(number % size)}` : ''}`
      }
    }
    return underThousand(number)
  }
  const rounded = Math.round(Math.max(0, value) * 100)
  const major = Math.floor(rounded / 100)
  const minor = rounded % 100
  return `${integerWords(major)} rupees${minor ? ` and ${integerWords(minor)} paisa` : ''} only`
}

export function documentToDraft(document: BillingDocument): DocumentDraft {
  return {
    type: document.type,
    date: document.date,
    customer: { ...document.customer },
    items:
      document.type === 'normal'
        ? document.items.map((item) => ({
            ...item,
            years: String(item.years),
            rate: String(item.rate),
          }))
        : [],
    amount: document.type === 'normal' ? '' : String(document.amount),
    due: document.type === 'normal' ? '' : String(document.due),
    notes: document.type === 'normal' ? '' : document.notes,
    linkedBillId: document.type === 'normal' ? '' : document.linkedBillId,
  }
}

export function nextCounter(
  type: DocumentType,
  documents: BillingDocument[],
  counters: StoreData['counters'],
): number {
  const existing = documents.filter((document) => document.type === type).length
  return Math.max(counters[type], existing)
}

export function nextDailySequence(
  date: string,
  documents: BillingDocument[],
  dailyCounters: Record<string, number> = {},
): number {
  const savedSequence = dailyCounters[date] ?? 0
  const dateDocumentCount = documents.filter((document) => document.date === date).length
  return Math.max(savedSequence, dateDocumentCount) + 1
}

export function createDocumentNumber(date: string, sequence: number): string {
  const converted = nepaliDate(date)
  if (!converted) return 'Invalid date'
  const { year, month, date: dayOfMonth } = converted.getBS()
  const fiscalYear = year + (month + 1 >= 4 ? 1 : 0)
  return `${String(fiscalYear).slice(-2)}${String(month + 1).padStart(2, '0')}${String(dayOfMonth).padStart(2, '0')}${String(sequence).padStart(3, '0')}`
}

export function previewNumber(
  date: string,
  documents: BillingDocument[],
  dailyCounters: Record<string, number> = {},
): string {
  return createDocumentNumber(date, nextDailySequence(date, documents, dailyCounters))
}

export function numberToType(type: DocumentType): string {
  return type === 'normal' ? 'Bill No. 1' : type === 'receipt' ? 'Bill No. 2' : 'Bill No. 3'
}
