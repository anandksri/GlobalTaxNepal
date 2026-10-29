export type DocumentType = 'normal' | 'receipt' | 'payment'

export type Customer = {
  name: string
  address: string
  company: string
  phone: string
  pan: string
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

export type BillingDocument = NormalDocument | TransactionDocument

export type StoreData = {
  version: 1
  documents: BillingDocument[]
  counters: Record<DocumentType, number>
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
  customer: Customer
  items: DraftItem[]
  amount: string
  due: string
  notes: string
  linkedBillId: string
}

export const EMPTY_CUSTOMER: Customer = {
  name: '',
  address: '',
  company: '',
  phone: '',
  pan: '',
}

export const TYPE_LABELS: Record<DocumentType, string> = {
  normal: 'Normal Bill',
  receipt: 'Receipt Bill',
  payment: 'Payment Bill',
}

export const TYPE_NUMBERS: Record<DocumentType, number> = {
  normal: 1,
  receipt: 2,
  payment: 3,
}
