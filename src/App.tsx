import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import BillEditor from './components/BillEditor'
import Header from './components/Header'
import HistoryPage from './components/HistoryPage'
import { isStoreData, loadStore, writeStore } from './storage'
import type { BillingDocument, DocumentDraft, DocumentType, StoreData, TransactionDocument } from './types'
import {
  createDocumentNumber,
  makeDraft,
  documentToDraft,
  nextCounter,
  nextDailySequence,
  previewNumber,
} from './utils'
import { isValidGregorianDate } from './dateUtils'
import './App.css'

type Page = DocumentType | 'history'

function App() {
  const [initial] = useState(() => loadStore())
  const [store, setStore] = useState<StoreData>(initial.data)
  const [storageError, setStorageError] = useState(initial.error)
  const [page, setPage] = useState<Page>('normal')
  const [draft, setDraft] = useState<DocumentDraft>(() => makeDraft('normal'))
  const [drafts, setDrafts] = useState<Record<DocumentType, DocumentDraft>>(() => ({
    normal: makeDraft('normal'),
    receipt: makeDraft('receipt'),
    payment: makeDraft('payment'),
    details: makeDraft('details'),
  }))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [readOnly, setReadOnly] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [printPending, setPrintPending] = useState(false)

  const currentDocument = useMemo(
    () => store.documents.find((document) => document.id === editingId),
    [store.documents, editingId],
  )
  const documentNumber = previewNumber(draft.date, store.documents, store.dailyCounters)

  useEffect(() => {
    if (printPending && page !== 'history') {
      const timer = window.setTimeout(() => {
        window.print()
        setPrintPending(false)
      }, 100)
      return () => window.clearTimeout(timer)
    }
  }, [printPending, page])

  const persist = (next: StoreData): boolean => {
    try {
      writeStore(next)
      setStore(next)
      setStorageError(null)
      return true
    } catch {
      setStorageError('Could not save to this browser. Check available storage space and browser permissions.')
      return false
    }
  }

  const changeDraft = (nextDraft: DocumentDraft) => {
    setDraft(nextDraft)
    setDrafts((existing) => ({ ...existing, [nextDraft.type]: nextDraft }))
  }

  const openNew = (type: DocumentType) => {
    if (editingId && page !== 'history') {
      setDrafts((existing) => ({ ...existing, [page]: makeDraft(page) }))
    }
    const nextDraft = editingId ? makeDraft(type) : drafts[type] ?? makeDraft(type)
    setDraft({ ...nextDraft, type })
    setDrafts((existing) => ({ ...existing, [type]: { ...nextDraft, type } }))
    setPage(type)
    setEditingId(null)
    setReadOnly(false)
    setNotice(null)
  }

  const openDocument = (document: BillingDocument, viewOnly: boolean) => {
    const nextDraft = documentToDraft(document)
    setDraft(nextDraft)
    setPage(document.type)
    setEditingId(document.id)
    setReadOnly(viewOnly)
    setNotice(null)
  }

  const saveDocument = () => {
    if (readOnly || !isValidGregorianDate(draft.date)) {
      setNotice({ kind: 'error', text: 'Enter a valid document date before saving.' })
      return
    }

    let savedDocument: BillingDocument
    const reserveNumber = (existing?: BillingDocument) => {
      const dailyCounters = store.dailyCounters ?? {}
      if (draft.useCustomNumber) {
        return { documentNumber: draft.customNumber.trim(), dailyCounters }
      }
      if (existing?.date === draft.date) {
        return { documentNumber: existing.documentNumber, dailyCounters }
      }
      const sequence = nextDailySequence(draft.date, store.documents, dailyCounters)
      return {
        documentNumber: createDocumentNumber(draft.date, sequence),
        dailyCounters: { ...dailyCounters, [draft.date]: sequence },
      }
    }
    const validateNumber = (documentNumber: string) => {
      if (!documentNumber) {
        setNotice({ kind: 'error', text: 'Enter a bill number or use the automatically generated number.' })
        return false
      }
      if (store.documents.some((document) =>
        document.id !== editingId && document.documentNumber === documentNumber)) {
        setNotice({ kind: 'error', text: `The bill number ${documentNumber} is already in use.` })
        return false
      }
      return true
    }

    if (draft.type === 'details') {
      if (!draft.customer.name.trim()) {
        setNotice({ kind: 'error', text: 'Enter a name before saving this details bill.' })
        return
      }
      const existing = currentDocument?.type === 'details' ? currentDocument : undefined
      const now = new Date().toISOString()
      const counter = existing
        ? store.counters.details ?? 0
        : nextCounter('details', store.documents, store.counters) + 1
      const numbering = reserveNumber(existing)
      if (!validateNumber(numbering.documentNumber)) return
      savedDocument = {
        id: existing?.id ?? crypto.randomUUID(),
        type: 'details',
        documentNumber: numbering.documentNumber,
        date: draft.date,
        customer: {
          name: draft.customer.name.trim(),
          address: '',
          company: draft.customer.company.trim(),
          phone: draft.customer.phone.trim(),
          pan: '',
          userId: draft.customer.userId?.trim() ?? '',
        },
        password: draft.password,
        work: draft.work.trim(),
        paymentStatus: draft.paymentStatus,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const next: StoreData = {
        ...store,
        dailyCounters: numbering.dailyCounters,
        documents: existing
          ? store.documents.map((document) => document.id === existing.id ? savedDocument : document)
          : [...store.documents, savedDocument],
        counters: { ...store.counters, details: Math.max(store.counters.details ?? 0, counter) },
      }
      if (!persist(next)) return
    } else if (draft.type === 'normal') {
      const populated = draft.items.filter((item) => item.particular.trim() || item.years !== '' || item.rate !== '')
      if (!populated.length) {
        setNotice({ kind: 'error', text: 'Add at least one bill item before saving.' })
        return
      }
      const invalid = populated.find((item) => {
        const years = Number(item.years)
        const rate = Number(item.rate)
        return !item.particular.trim() || item.years === '' || item.rate === '' ||
          !Number.isFinite(years) || !Number.isFinite(rate) || years <= 0 || rate < 0
      })
      if (invalid) {
        setNotice({ kind: 'error', text: 'Each item needs a description, positive years, and a valid non-negative rate.' })
        return
      }
      const existing = currentDocument?.type === 'normal' ? currentDocument : undefined
      const items = populated.map((item) => ({
        id: item.id,
        particular: item.particular.trim(),
        years: Number(item.years),
        rate: Number(item.rate),
      }))
      const now = new Date().toISOString()
      const counter = existing ? store.counters.normal : nextCounter('normal', store.documents, store.counters) + 1
      const numbering = reserveNumber(existing)
      if (!validateNumber(numbering.documentNumber)) return
      savedDocument = {
        id: existing?.id ?? crypto.randomUUID(),
        type: 'normal',
        documentNumber: numbering.documentNumber,
        date: draft.date,
        customer: { ...draft.customer },
        items,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const next: StoreData = {
        ...store,
        dailyCounters: numbering.dailyCounters,
        documents: existing
          ? store.documents.map((document) => document.id === existing.id ? savedDocument : document)
          : [...store.documents, savedDocument],
        counters: { ...store.counters, normal: Math.max(store.counters.normal, counter) },
      }
      if (!persist(next)) return
    } else {
      const amount = Number(draft.amount)
      const due = Number(draft.due || 0)
      if (draft.amount === '' || !Number.isFinite(amount) || amount <= 0) {
        setNotice({ kind: 'error', text: `Enter a valid amount ${draft.type === 'receipt' ? 'received' : 'paid'}.` })
        return
      }
      if (!Number.isFinite(due) || due < 0) {
        setNotice({ kind: 'error', text: 'Due amount must be a valid non-negative number.' })
        return
      }
      const existing = currentDocument && (currentDocument.type === 'receipt' || currentDocument.type === 'payment')
        ? currentDocument
        : undefined
      const now = new Date().toISOString()
      const counter = existing ? store.counters[draft.type] : nextCounter(draft.type, store.documents, store.counters) + 1
      const numbering = reserveNumber(existing)
      if (!validateNumber(numbering.documentNumber)) return
      const linkedBill = draft.linkedBillId
        ? store.documents.find((document): document is Extract<BillingDocument, { type: 'normal' }> =>
            document.type === 'normal' && document.id === draft.linkedBillId)
        : undefined
      const savedDue = linkedBill
        ? Math.max(0, linkedBill.items.reduce((sum, item) => sum + item.years * item.rate, 0) -
            store.documents.filter((document): document is TransactionDocument =>
              document.id !== existing?.id &&
              (document.type === 'receipt' || document.type === 'payment') &&
              document.linkedBillId === linkedBill.id,
            ).reduce((sum, document) => sum + document.amount, 0) - amount)
        : due
      savedDocument = {
        id: existing?.id ?? crypto.randomUUID(),
        type: draft.type,
        documentNumber: numbering.documentNumber,
        date: draft.date,
        customer: { ...draft.customer },
        amount,
        due: savedDue,
        notes: draft.notes.trim(),
        linkedBillId: draft.linkedBillId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }
      const next: StoreData = {
        ...store,
        dailyCounters: numbering.dailyCounters,
        documents: existing
          ? store.documents.map((document) => document.id === existing.id ? savedDocument : document)
          : [...store.documents, savedDocument],
        counters: { ...store.counters, [draft.type]: Math.max(store.counters[draft.type], counter) },
      }
      if (!persist(next)) return
    }

    setEditingId(savedDocument.id)
    setDrafts((existing) => ({ ...existing, [draft.type]: makeDraft(draft.type) }))
    setReadOnly(false)
    setNotice({ kind: 'success', text: `${savedDocument.documentNumber} saved successfully.` })
  }

  const clearForm = () => {
    if (!window.confirm('Clear the current form? Any unsaved changes will be lost.')) return
    const reset = makeDraft(draft.type)
    changeDraft(reset)
    setEditingId(null)
    setReadOnly(false)
    setNotice(null)
  }

  const deleteDocument = (document: BillingDocument) => {
    if (!window.confirm(`Delete ${document.documentNumber}? This cannot be undone.`)) return
    const next = { ...store, documents: store.documents.filter((item) => item.id !== document.id) }
    if (persist(next)) setNotice({ kind: 'success', text: `${document.documentNumber} deleted.` })
  }

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = `global-tax-nepal-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice({ kind: 'success', text: 'Backup downloaded.' })
  }

  const importBackup = async (file: File) => {
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isStoreData(parsed)) {
        setNotice({ kind: 'error', text: 'This file is not a valid Global Tax Nepal billing backup.' })
        return
      }
      if (!window.confirm(`Import ${parsed.documents.length} documents and replace the records in this browser?`)) return
      if (persist({
        ...parsed,
        counters: { ...parsed.counters, details: parsed.counters.details ?? 0 },
        dailyCounters: parsed.dailyCounters ?? {},
        currency: 'NPR',
      })) setNotice({ kind: 'success', text: `${parsed.documents.length} documents restored from backup.` })
    } catch {
      setNotice({ kind: 'error', text: 'The backup file could not be read. Choose a valid JSON backup.' })
    }
  }

  const printSaved = (document: BillingDocument) => {
    openDocument(document, true)
    setPrintPending(true)
  }

  const backToHistory = () => {
    if (editingId && page !== 'history') {
      setDrafts((existing) => ({ ...existing, [page]: makeDraft(page) }))
    }
    setPage('history')
    setEditingId(null)
    setReadOnly(false)
    setNotice(null)
  }

  return (
    <div className="app">
      <Header
        onNew={openNew}
        onHistory={backToHistory}
        onExport={exportBackup}
        onImport={importBackup}
        activePage={page}
      />
      {storageError && <div className="storage-warning no-print"><CircleAlert size={16} /><span>{storageError}</span><button type="button" aria-label="Dismiss storage warning" onClick={() => setStorageError(null)}><X size={15} /></button></div>}
      {notice && <div className={`notice no-print ${notice.kind}`} role="status">{notice.kind === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<span>{notice.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15} /></button></div>}
      {page === 'history' ? (
        <HistoryPage
          documents={store.documents}
          onView={(document) => openDocument(document, true)}
          onEdit={(document) => openDocument(document, false)}
          onDelete={deleteDocument}
          onPrint={printSaved}
        />
      ) : (
        <BillEditor
          draft={draft}
          documents={store.documents}
          number={documentNumber}
          existingDocument={currentDocument}
          readOnly={readOnly}
          onChange={changeDraft}
          onSave={saveDocument}
          onClear={clearForm}
          onEdit={() => { setReadOnly(false); setNotice(null) }}
          onBack={backToHistory}
          onPrint={() => setNotice({ kind: 'success', text: 'Use “Save as PDF” in the print dialog to download a PDF.' })}
        />
      )}
      <footer className="app-footer no-print">
        <span>Global Tax Nepal</span>
        <a
          href="https://anandkeshari.com.np"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit Anand Keshari’s website (opens in a new tab)"
        >
          Developed By Anand Keshari
        </a>
      </footer>
    </div>
  )
}

export default App
