import { useMemo, useState } from 'react'
import { ArrowDownUp, CalendarDays, Download, Eye, FileArchive, FileClock, Pencil, Printer, Search, Trash2, Upload } from 'lucide-react'
import type { BillingDocument, DocumentType } from '../types'
import { TYPE_LABELS } from '../types'
import { formatNepaliDate, gregorianDateFromNepali } from '../dateUtils'
import { currencyFormatter, documentDue, documentTotal } from '../utils'

type Props = {
  documents: BillingDocument[]
  onView: (document: BillingDocument) => void
  onEdit: (document: BillingDocument) => void
  onDelete: (document: BillingDocument) => void
  onPrint: (document: BillingDocument) => void
  onExportArchive: () => void
  onImportArchive: (file: File) => void
}

export default function HistoryPage({ documents, onView, onEdit, onDelete, onPrint, onExportArchive, onImportArchive }: Props) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | DocumentType>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [fromDateText, setFromDateText] = useState('')
  const [toDateText, setToDateText] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'number'>('newest')
  const money = currencyFormatter()

  const filtered = useMemo(() => documents.filter((document) => {
    const searchText = `${document.documentNumber} ${document.customer.name} ${document.customer.company} ${document.customer.userId ?? ''} ${document.type === 'details' ? `${document.work} ${document.paymentStatus}` : ''}`.toLowerCase()
    return (
      (!query || searchText.includes(query.toLowerCase())) &&
      (type === 'all' || document.type === type) &&
      (!fromDate || document.date >= fromDate) &&
      (!toDate || document.date <= toDate)
    )
  }).sort((left, right) => {
    if (sort === 'number') return left.documentNumber.localeCompare(right.documentNumber, undefined, { numeric: true })
    const dateOrder = left.date.localeCompare(right.date)
    return sort === 'newest' ? -dateOrder || right.updatedAt.localeCompare(left.updatedAt) : dateOrder || left.updatedAt.localeCompare(right.updatedAt)
  }), [documents, query, type, fromDate, toDate, sort])

  const totalAmount = filtered.reduce((sum, document) => sum + documentTotal(document), 0)
  const dueByBill = new Map<string, number>()
  let unlinkedDue = 0
  for (const document of filtered) {
    if (document.type === 'normal') {
      dueByBill.set(document.id, documentDue(document, documents))
    } else if (document.type !== 'details') {
      if (document.linkedBillId) {
        const linkedBill = documents.find((item) => item.type === 'normal' && item.id === document.linkedBillId)
        if (linkedBill) dueByBill.set(linkedBill.id, documentDue(linkedBill, documents))
        else unlinkedDue += document.due
      } else {
        unlinkedDue += document.due
      }
    }
  }
  const dueAmount = [...dueByBill.values()].reduce((sum, due) => sum + due, unlinkedDue)

  return (
    <main className="page-shell history-page">
      <div className="page-heading">
        <div><p className="eyebrow">YOUR BILLING DESK</p><h1>Document history</h1><p>Bills and vouchers you’ve saved, gathered in one place.</p></div>
        <div className="history-count"><strong>{documents.length}</strong><span>{documents.length === 1 ? 'document' : 'documents'} saved</span></div>
      </div>
      <section className="history-panel">
        <div className="history-toolbar">
          <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, company, user ID or document no." aria-label="Search history" /></label>
          <label className="filter-field"><span>Type</span><select value={type} onChange={(event) => setType(event.target.value as 'all' | DocumentType)}><option value="all">All documents</option><option value="normal">Normal bill</option><option value="receipt">Receipt bill</option><option value="payment">Payment bill</option><option value="details">Details bill</option></select></label>
          <label className="filter-field"><span>From (B.S.)</span><span className="date-filter"><CalendarDays size={15} /><input type="text" placeholder="YYYY/MM/DD" value={fromDateText} onChange={(event) => { setFromDateText(event.target.value); setFromDate(gregorianDateFromNepali(event.target.value) ?? '') }} aria-label="Filter from date in B.S." /></span></label>
          <label className="filter-field"><span>To (B.S.)</span><span className="date-filter"><CalendarDays size={15} /><input type="text" placeholder="YYYY/MM/DD" value={toDateText} onChange={(event) => { setToDateText(event.target.value); setToDate(gregorianDateFromNepali(event.target.value) ?? '') }} aria-label="Filter to date in B.S." /></span></label>
          <label className="sort-field"><ArrowDownUp size={15} /><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="Sort history"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="number">Document number</option></select></label>
          <div className="archive-actions">
            <button type="button" className="archive-button" onClick={onExportArchive}><Download size={15} /> Export ZIP</button>
            <label className="archive-button archive-upload"><Upload size={15} /> Import ZIP
              <input
                type="file"
                accept=".zip,application/zip"
                aria-label="Import ZIP archive"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0]
                  if (file) onImportArchive(file)
                  event.currentTarget.value = ''
                }}
              />
            </label>
          </div>
        </div>
        <div className="history-summary"><span>Showing <strong>{filtered.length}</strong> of {documents.length} documents</span><div><span>Total amount <strong>{money.format(totalAmount)}</strong></span><span>Total due <strong>{money.format(dueAmount)}</strong></span></div></div>
        {filtered.length ? (
          <div className="table-scroll">
            <table className="history-table">
              <thead><tr><th>Document no.</th><th>Bill type</th><th>Date</th><th>Customer</th><th>Company</th><th>Contact</th><th>Work</th><th>Payment status</th><th className="numeric">Total amount</th><th className="numeric">Due amount</th><th>Actions</th></tr></thead>
              <tbody>{filtered.map((document) => (
                <tr key={document.id}>
                  <td><button className="document-link" type="button" onClick={() => onView(document)}>{document.documentNumber}</button></td>
                  <td><span className={`table-type type-${document.type}`}>{TYPE_LABELS[document.type]}</span></td>
                  <td>{formatNepaliDate(document.date)}</td>
                  <td>{document.customer.name || '—'}</td>
                  <td>{document.customer.company || '—'}</td>
                  <td>{document.customer.phone || '—'}</td>
                  <td>{document.type === 'details' ? document.work || '—' : '—'}</td>
                  <td>{document.type === 'details' ? <span className={`payment-status status-${document.paymentStatus.toLowerCase()}`}>{document.paymentStatus}</span> : '—'}</td>
                  <td className="numeric">{document.type === 'details' ? '—' : money.format(documentTotal(document))}</td>
                  <td className="numeric">{document.type === 'details' ? '—' : money.format(documentDue(document, documents))}</td>
                  <td><div className="row-actions">
                    <button type="button" title="View document" aria-label={`View ${document.documentNumber}`} onClick={() => onView(document)}><Eye size={15} /></button>
                    <button type="button" title="Edit document" aria-label={`Edit ${document.documentNumber}`} onClick={() => onEdit(document)}><Pencil size={15} /></button>
                    <button type="button" title="Print or download PDF" aria-label={`Print ${document.documentNumber}`} onClick={() => onPrint(document)}><Printer size={15} /></button>
                    <button type="button" title="Delete document" aria-label={`Delete ${document.documentNumber}`} className="delete-action" onClick={() => onDelete(document)}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><span className="empty-icon"><FileClock size={23} /></span><h2>{documents.length ? 'No matching documents' : 'Nothing here just yet'}</h2><p>{documents.length ? 'Try a different search or widen the date range.' : 'Once you save a bill or voucher, you’ll find it here.'}</p></div>
        )}
        <div className="history-bottom"><FileArchive size={14} /> ZIP includes a PDF for every saved document and backup.json for restoring the records. Passwords are included as plain text.</div>
      </section>
    </main>
  )
}
