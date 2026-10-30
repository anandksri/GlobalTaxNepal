import type { ChangeEvent } from 'react'
import { Plus, Trash2, Printer, Download, Save, RotateCcw, ArrowLeft, Pencil } from 'lucide-react'
import type {
  BillingDocument,
  Customer,
  DocumentDraft,
  DocumentType,
  NormalDocument,
} from '../types'
import { formatNepaliDate } from '../dateUtils'
import { amountInWords, currencyFormatter, numberToType, outstandingForBill } from '../utils'

type Props = {
  draft: DocumentDraft
  documents: BillingDocument[]
  number: string
  existingDocument?: BillingDocument
  readOnly: boolean
  onChange: (draft: DocumentDraft) => void
  onSave: () => void
  onClear: () => void
  onEdit: () => void
  onBack: () => void
  onPrint: () => void
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  readOnly,
  min,
  step,
  required,
  helper,
}: {
  label: string
  value: string
  onChange?: (value: string) => void
  type?: string
  placeholder?: string
  readOnly?: boolean
  min?: string
  step?: string
  required?: boolean
  helper?: string
}) {
  return (
    <label className="field">
      <span>{label}{required && <span className="required-mark"> *</span>}</span>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
      />
      {helper && <small className="field-helper">{helper}</small>}
    </label>
  )
}

function CustomerFields({
  customer,
  readOnly,
  onChange,
  existingCustomers,
}: {
  customer: Customer
  readOnly: boolean
  onChange: (customer: Customer) => void
  existingCustomers: Customer[]
}) {
  const set = (key: keyof Customer, value: string) => onChange({ ...customer, [key]: value })
  const selectExisting = (event: ChangeEvent<HTMLSelectElement>) => {
    const selected = existingCustomers[Number(event.target.value)]
    if (selected) onChange({ ...selected })
  }

  return (
    <section className="form-section">
      <div className="section-heading">
        <div><span className="section-kicker">01</span><h2>Customer details</h2></div>
        {existingCustomers.length > 0 && (
          <label className="existing-customer">
            <span className="sr-only">Select an existing customer</span>
            <select disabled={readOnly} defaultValue="" onChange={selectExisting}>
              <option value="">Existing customer</option>
              {existingCustomers.map((person, index) => (
                <option value={index} key={`${person.name}-${person.phone}-${index}`}>
                  {person.name || person.company || `Customer ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="field-grid">
        <Field label="Name" value={customer.name} readOnly={readOnly} onChange={(value) => set('name', value)} placeholder="Customer name" />
        <Field label="Address" value={customer.address} readOnly={readOnly} onChange={(value) => set('address', value)} placeholder="Street, city" />
        <Field label="Company name" value={customer.company} readOnly={readOnly} onChange={(value) => set('company', value)} placeholder="Company (optional)" />
        <Field label="Contact number" value={customer.phone} readOnly={readOnly} onChange={(value) => set('phone', value)} placeholder="98XXXXXXXX" />
        <Field label="PAN number" value={customer.pan} readOnly={readOnly} onChange={(value) => set('pan', value)} placeholder="PAN (optional)" />
      </div>
    </section>
  )
}

function DocumentPreview({
  draft,
  number,
  existingDocument,
  documents,
}: Pick<Props, 'draft' | 'number' | 'existingDocument' | 'documents'>) {
  const money = currencyFormatter()
  const rows = draft.type === 'normal'
    ? draft.items.filter((item) => item.particular || item.years || item.rate)
    : []
  const total = draft.type === 'normal'
    ? draft.items.reduce((sum, item) => sum + (Number(item.years) || 0) * (Number(item.rate) || 0), 0)
    : Number(draft.amount) || 0
  const linkedBill = documents.find(
    (document): document is NormalDocument => document.type === 'normal' && document.id === draft.linkedBillId,
  )
  const voucherDue = linkedBill
    ? Math.max(0, outstandingForBill(linkedBill, documents, existingDocument?.id) - (Number(draft.amount) || 0))
    : Number(draft.due) || 0
  const title = draft.type === 'normal' ? 'Normal Bill' : draft.type === 'receipt' ? 'Receipt Voucher' : 'Payment Voucher'
  const docNo = draft.useCustomNumber
    ? draft.customNumber
    : existingDocument?.date === draft.date
      ? existingDocument.documentNumber
      : number

  return (
    <article className={`bill-paper ${draft.type !== 'normal' ? 'voucher-paper' : ''}`} id="document-preview">
      <div className="paper-topline">
        <div className="paper-brand"><span className="paper-logo">GTN</span><div><h2>Global Tax Nepal</h2><p>Tax &amp; business services</p></div></div>
        <span className="paper-type">{title}</span>
      </div>
      <div className="paper-title-row">
        <div><p className="paper-eyebrow">{numberToType(draft.type)}</p><h1>{title}</h1></div>
        <div className="paper-meta"><span>Document no.</span><strong>{docNo}</strong><span>Date (B.S.)</span><strong>{formatNepaliDate(draft.date)}</strong></div>
      </div>
      <div className="paper-rule" />
      <div className="paper-customer">
        <div><span className="paper-label">Billed to</span><strong>{draft.customer.name || 'Customer name'}</strong>
          {draft.customer.company && <span>{draft.customer.company}</span>}
          {draft.customer.address && <span>{draft.customer.address}</span>}
        </div>
        <div className="paper-contact">
          {draft.customer.phone && <span><b>Contact</b>{draft.customer.phone}</span>}
          {draft.customer.pan && <span><b>PAN</b>{draft.customer.pan}</span>}
        </div>
      </div>
      {draft.type === 'normal' ? (
        <>
          <table className="paper-table">
            <thead><tr><th>SN</th><th>Particular</th><th>No. of years</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((item, index) => {
                const lineAmount = (Number(item.years) || 0) * (Number(item.rate) || 0)
                return <tr key={item.id}><td>{index + 1}</td><td>{item.particular || '—'}</td><td>{item.years || '—'}</td><td>{money.format(Number(item.rate) || 0)}</td><td>{money.format(lineAmount)}</td></tr>
              }) : <tr><td>1</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>}
            </tbody>
          </table>
          <div className="paper-total"><span>Total</span><strong>{money.format(total)}</strong></div>
          <p className="amount-words"><span>Amount in words</span>{amountInWords(total)}</p>
        </>
      ) : (
        <div className="voucher-amount-block">
          <span>{draft.type === 'receipt' ? 'Amount received' : 'Amount paid'}</span>
          <strong>{money.format(total)}</strong>
          {draft.notes && <p><b>Remarks</b> {draft.notes}</p>}
          {draft.linkedBillId && <p><b>Bill balance after transaction</b> {money.format(voucherDue)}</p>}
        </div>
      )}
      <div className="paper-signatures"><div><span>Received by</span></div><div><span>Authorized signature</span></div></div>
      <footer className="paper-footer">Thank you for your business.</footer>
    </article>
  )
}

export default function BillEditor({
  draft,
  documents,
  number,
  existingDocument,
  readOnly,
  onChange,
  onSave,
  onClear,
  onEdit,
  onBack,
  onPrint,
}: Props) {
  const set = (patch: Partial<DocumentDraft>) => onChange({ ...draft, ...patch })
  const typeNames: Record<DocumentType, string> = {
    normal: 'Normal bill',
    receipt: 'Receipt voucher',
    payment: 'Payment voucher',
  }
  const customers = documents.reduce<Customer[]>((all, document) => {
    const person = document.customer
    if (!all.some((item) => item.name === person.name && item.phone === person.phone && item.company === person.company)) all.push(person)
    return all
  }, [])
  const linkedBills = documents.filter((document): document is NormalDocument => document.type === 'normal')
  const linkedBill = linkedBills.find((bill) => bill.id === draft.linkedBillId)
  const amount = Number(draft.amount) || 0
  const calculatedDue = linkedBill
    ? Math.max(0, outstandingForBill(linkedBill, documents, existingDocument?.id) - amount)
    : Number(draft.due) || 0
  const title = draft.type === 'normal' ? 'New normal bill' : draft.type === 'receipt' ? 'New receipt voucher' : 'New payment voucher'
  const activeNumber = draft.useCustomNumber
    ? draft.customNumber
    : existingDocument?.date === draft.date
      ? existingDocument.documentNumber
      : number

  const updateCustomer = (customer: Customer) => set({ customer })
  const updateItem = (id: string, field: 'particular' | 'years' | 'rate', value: string) => {
    set({ items: draft.items.map((item) => item.id === id ? { ...item, [field]: value } : item) })
  }
  const printDocument = () => {
    onPrint()
    window.print()
  }

  return (
    <main className="page-shell">
      <div className="page-heading no-print">
        <div>
          <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={15} /> All documents</button>
          <div className="heading-title"><h1>{readOnly ? typeNames[draft.type] : title}</h1>{readOnly && <span className="status-pill">Saved</span>}</div>
          <p>{readOnly ? 'Review and print this saved document.' : 'Enter the details below. Your document is saved locally in this browser.'}</p>
        </div>
        <div className="heading-document-number"><span>Document number</span><strong>{activeNumber}</strong></div>
      </div>

      <div className="editor-layout">
        <div className="editor-form no-print">
          <section className="form-section compact-section">
            <div className="section-heading">
              <div><span className="section-kicker">01</span><h2>Document details</h2></div>
              <span className="type-chip">{numberToType(draft.type)}</span>
            </div>
            <div className="field-grid two-fields">
              <Field label="Date (A.D.)" value={draft.date} type="date" readOnly={readOnly} onChange={(value) => set({ date: value })} helper={`Nepali date (B.S.): ${formatNepaliDate(draft.date)}`} required />
              <div className="field">
                <span>Bill number</span>
                {draft.useCustomNumber ? (
                  <input
                    value={draft.customNumber}
                    readOnly={readOnly}
                    onChange={(event) => set({ customNumber: event.target.value })}
                    aria-label="Custom bill number"
                    required
                  />
                ) : <div className="read-value">{activeNumber}</div>}
                {!readOnly && <label className="custom-number-option">
                  <input
                    type="checkbox"
                    checked={draft.useCustomNumber}
                    onChange={(event) => set({
                      useCustomNumber: event.target.checked,
                      customNumber: event.target.checked ? activeNumber : '',
                    })}
                  />
                  Use a custom bill number
                </label>}
                {!draft.useCustomNumber && <small className="field-helper">Automatically uses the Nepali date and daily sequence.</small>}
              </div>
            </div>
          </section>

          <CustomerFields customer={draft.customer} readOnly={readOnly} onChange={updateCustomer} existingCustomers={customers} />

          {draft.type === 'normal' ? (
            <section className="form-section">
              <div className="section-heading">
                <div><span className="section-kicker">02</span><h2>Bill items</h2></div>
                {!readOnly && <button className="text-button" type="button" onClick={() => set({ items: [...draft.items, { id: crypto.randomUUID(), particular: '', years: '', rate: '' }] })}><Plus size={15} /> Add row</button>}
              </div>
              <div className="item-editor">
                <div className="item-editor-head"><span>SN</span><span>Particular</span><span>Years</span><span>Rate</span><span>Amount</span><span /></div>
                {draft.items.map((item, index) => {
                  const lineTotal = (Number(item.years) || 0) * (Number(item.rate) || 0)
                  return (
                    <div className="item-editor-row" key={item.id}>
                      <span className="row-number">{index + 1}</span>
                      <input aria-label={`Item ${index + 1} particular`} value={item.particular} readOnly={readOnly} placeholder="Service or item" onChange={(event) => updateItem(item.id, 'particular', event.target.value)} />
                      <input aria-label={`Item ${index + 1} years`} type="number" min="0.01" step="any" value={item.years} readOnly={readOnly} placeholder="0" onChange={(event) => updateItem(item.id, 'years', event.target.value)} />
                      <input aria-label={`Item ${index + 1} rate`} type="number" min="0" step="any" value={item.rate} readOnly={readOnly} placeholder="0.00" onChange={(event) => updateItem(item.id, 'rate', event.target.value)} />
                      <span className="line-total">{currencyFormatter().format(lineTotal)}</span>
                      {!readOnly && <button type="button" className="row-remove" aria-label={`Remove item ${index + 1}`} onClick={() => set({ items: draft.items.filter((row) => row.id !== item.id) })}><Trash2 size={15} /></button>}
                      {readOnly && <span />}
                    </div>
                  )
                })}
              </div>
              <div className="form-total"><span>Grand total</span><strong>{currencyFormatter().format(draft.items.reduce((sum, item) => sum + (Number(item.years) || 0) * (Number(item.rate) || 0), 0))}</strong></div>
            </section>
          ) : (
            <section className="form-section">
              <div className="section-heading"><div><span className="section-kicker">02</span><h2>Payment details</h2></div></div>
              <div className="field-grid two-fields">
                <Field label={draft.type === 'receipt' ? 'Amount received' : 'Amount paid'} value={draft.amount} type="number" min="0.01" step="any" readOnly={readOnly} onChange={(value) => set({ amount: value })} placeholder="0.00" required />
                <Field label="Due amount" value={linkedBill ? String(calculatedDue.toFixed(2)) : draft.due} type="number" min="0" step="any" readOnly={readOnly || !!linkedBill} onChange={(value) => set({ due: value })} placeholder="0.00" />
              </div>
              {!readOnly && <label className="field linked-bill-field">
                <span>Link to a normal bill <small>Optional</small></span>
                <select value={draft.linkedBillId} onChange={(event) => {
                  const selectedId = event.target.value
                  const bill = linkedBills.find((item) => item.id === selectedId)
                  set({
                    linkedBillId: selectedId,
                    due: bill ? Math.max(0, outstandingForBill(bill, documents, existingDocument?.id) - amount).toFixed(2) : draft.due,
                    customer: bill ? { ...bill.customer } : draft.customer,
                  })
                }}>
                  <option value="">No linked bill</option>
                  {linkedBills.map((bill) => <option value={bill.id} key={bill.id}>{bill.documentNumber} · {bill.customer.name || bill.customer.company || 'Customer'}</option>)}
                </select>
              </label>}
              <label className="field notes-field"><span>Notes or payment remarks <small>Optional</small></span><textarea rows={3} value={draft.notes} readOnly={readOnly} onChange={(event) => set({ notes: event.target.value })} placeholder="Add a note for this document" /></label>
            </section>
          )}

          <div className="form-actions">
            {readOnly ? (
              <button type="button" className="button-primary" onClick={onEdit}><Pencil size={16} /> Edit document</button>
            ) : (
              <>
                <button type="button" className="button-primary" onClick={onSave}><Save size={16} /> Save {draft.type === 'normal' ? 'bill' : draft.type}</button>
                <button type="button" className="button-secondary" onClick={printDocument}><Printer size={16} /> Print</button>
                <button type="button" className="button-secondary" onClick={printDocument}><Download size={16} /> Download PDF</button>
                <button type="button" className="button-quiet" onClick={onClear}><RotateCcw size={15} /> Clear form</button>
              </>
            )}
          </div>
        </div>
        <aside className="preview-column">
          <div className="preview-label no-print"><span><span className="live-dot" /> Live preview</span><span>Print-ready</span></div>
          <DocumentPreview draft={draft} number={number} existingDocument={existingDocument} documents={documents} />
        </aside>
      </div>
    </main>
  )
}
