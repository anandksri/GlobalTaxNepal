import {
  EMPTY_CUSTOMER,
  type BillingDocument,
  type Customer,
  type StoreData,
} from './types'

const STORAGE_KEY = 'global-star-billing-v1'

export const EMPTY_STORE: StoreData = {
  version: 1,
  documents: [],
  counters: { normal: 0, receipt: 0, payment: 0, details: 0 },
  dailyCounters: {},
  currency: 'NPR',
}

function isCustomer(value: unknown): value is Customer {
  if (!value || typeof value !== 'object') return false
  const customer = value as Record<string, unknown>
  return (
    ['name', 'address', 'company', 'phone', 'pan'].every(
      (key) => typeof customer[key] === 'string',
    ) &&
    (customer.userId === undefined || typeof customer.userId === 'string')
  )
}

function isDocument(value: unknown): value is BillingDocument {
  if (!value || typeof value !== 'object') return false
  const document = value as Record<string, unknown>
  const common =
    typeof document.id === 'string' &&
    typeof document.documentNumber === 'string' &&
    typeof document.date === 'string' &&
    typeof document.createdAt === 'string' &&
    typeof document.updatedAt === 'string' &&
    isCustomer(document.customer)

  if (!common) return false
  if (document.type === 'normal') {
    return (
      Array.isArray(document.items) &&
      document.items.every(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.particular === 'string' &&
          Number.isFinite(item.years) &&
          Number.isFinite(item.rate),
      )
    )
  }
  if (document.type === 'details') {
    return (
      typeof document.password === 'string' &&
      typeof document.work === 'string' &&
      ['Pending', 'Paid', 'Partial'].includes(String(document.paymentStatus))
    )
  }
  return (
    (document.type === 'receipt' || document.type === 'payment') &&
    Number.isFinite(document.amount) &&
    Number.isFinite(document.due) &&
    typeof document.notes === 'string' &&
    typeof document.linkedBillId === 'string'
  )
}

export function isStoreData(value: unknown): value is StoreData {
  if (!value || typeof value !== 'object') return false
  const store = value as Record<string, unknown>
  const counters = store.counters as Record<string, unknown> | undefined
  return (
    store.version === 1 &&
    Array.isArray(store.documents) &&
    store.documents.every(isDocument) &&
    !!counters &&
    ['normal', 'receipt', 'payment'].every(
      (type) => Number.isInteger(counters[type]) && Number(counters[type]) >= 0,
    ) &&
    (counters.details === undefined ||
      (Number.isInteger(counters.details) && Number(counters.details) >= 0)) &&
    (store.dailyCounters === undefined ||
      (!!store.dailyCounters &&
        typeof store.dailyCounters === 'object' &&
        !Array.isArray(store.dailyCounters) &&
        Object.values(store.dailyCounters).every(
          (counter) => Number.isInteger(counter) && Number(counter) >= 0,
        ))) &&
    typeof store.currency === 'string'
  )
}

export function loadStore(): { data: StoreData; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { data: EMPTY_STORE, error: null }
    const parsed: unknown = JSON.parse(raw)
    if (!isStoreData(parsed)) {
      return {
        data: EMPTY_STORE,
        error: 'Saved billing data could not be read. You can import a valid backup or start fresh.',
      }
    }
    return {
      data: {
        ...parsed,
        counters: { ...parsed.counters, details: parsed.counters.details ?? 0 },
        dailyCounters: parsed.dailyCounters ?? {},
        currency: 'NPR',
      },
      error: null,
    }
  } catch {
    return {
      data: EMPTY_STORE,
      error: 'Saved billing data is unavailable or corrupted. You can import a valid backup or start fresh.',
    }
  }
}

export function writeStore(data: StoreData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function makeEmptyCustomer(): Customer {
  return { ...EMPTY_CUSTOMER }
}
