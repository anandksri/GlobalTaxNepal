export type DocumentType = 'normal' | 'receipt' | 'payment' | 'details'
export type PaymentStatus = 'Pending' | 'Paid' | 'Partial'

export type Customer = {
  name: string
  address: string
  company: string
  phone: string
  pan: string
  userId?: string
}

export type BillItem = {
  id: string
  particular: string
  years: number
  rate: number
}

type DocumentBase = {
  id: string
  type: DocumentType
  documentNumber: string
  date: string
  customer: Customer
  createdAt: string
  updatedAt: string
}

export type NormalDocument = DocumentBase & {
  type: 'normal'
  customer: Customer
  items: BillItem[]
}

export type TransactionDocument = DocumentBase & {
  type: 'receipt' | 'payment'
  amount: number
  due: number
  notes: string
  linkedBillId: string
}

export type DetailsDocument = DocumentBase & {
  type: 'details'
  password: string
  work: string
  paymentStatus: PaymentStatus
}

export type BillingDocument = NormalDocument | TransactionDocument | DetailsDocument

export type StoreData = {
  version: 1
  documents: BillingDocument[]
  counters: Record<Exclude<DocumentType, 'details'>, number> & Partial<Record<'details', number>>
  dailyCounters?: Record<string, number>
  currency: string
}

export type DraftItem = {
  id: string
  particular: string
  years: string
  rate: string
}

export type DocumentDraft = {
  type: DocumentType
  date: string
  useCustomNumber: boolean
  customNumber: string
  customer: Customer
  items: DraftItem[]
  amount: string
  due: string
  notes: string
  linkedBillId: string
  password: string
  work: string
  paymentStatus: PaymentStatus
}

export const EMPTY_CUSTOMER: Customer = {
  name: '',
  address: '',
  company: '',
  phone: '',
  pan: '',
  userId: '',
}

export const TYPE_LABELS: Record<DocumentType, string> = {
  normal: 'Normal Bill',
  receipt: 'Receipt Bill',
  payment: 'Payment Bill',
  details: 'Details Bill',
}

export const TYPE_NUMBERS: Record<DocumentType, number> = {
  normal: 1,
  receipt: 2,
  payment: 3,
  details: 4,
}
