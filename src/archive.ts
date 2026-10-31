import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import type { BillingDocument, StoreData } from './types'
import { formatNepaliDate } from './dateUtils'
import { currencyFormatter, documentDue, documentTotal } from './utils'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 18

function documentPdf(document: BillingDocument, allDocuments: BillingDocument[]): Blob {
  const pdf = new jsPDF({ format: 'a4', unit: 'mm' })
  const money = currencyFormatter()
  let y = MARGIN

  const ensureSpace = (height: number) => {
    if (y + height > PAGE_HEIGHT - MARGIN) {
      pdf.addPage()
      y = MARGIN
    }
  }
  const addText = (text: string, bold = false) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = pdf.splitTextToSize(text || '—', PAGE_WIDTH - MARGIN * 2)
    for (const line of lines) {
      ensureSpace(6)
      pdf.text(line, MARGIN, y)
      y += 5.5
    }
  }
  const addField = (label: string, value: string) => {
    addText(`${label}: ${value || '—'}`)
  }

  addText('GLOBAL TAX NEPAL', true)
  addText('Tax & business services')
  y += 3
  pdf.setDrawColor(220, 218, 231)
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 8
  addText(document.type === 'details' ? 'Details Bill' : document.type === 'normal' ? 'Normal Bill' : document.type === 'receipt' ? 'Receipt Bill' : 'Payment Bill', true)
  addField('Document number', document.documentNumber)
  addField('Date (B.S.)', formatNepaliDate(document.date))
  y += 3
  addText('CLIENT DETAILS', true)
  addField('Name', document.customer.name)
  addField('Company name', document.customer.company)
  addField('User ID', document.customer.userId ?? '')
  addField('Contact', document.customer.phone)
  if (document.customer.address) addField('Address', document.customer.address)
  if (document.customer.pan) addField('PAN', document.customer.pan)

  y += 3
  if (document.type === 'normal') {
    addText('BILL ITEMS', true)
    document.items.forEach((item, index) => {
      addText(`${index + 1}. ${item.particular}`, true)
      addText(`${item.years} year(s) x ${money.format(item.rate)} = ${money.format(item.years * item.rate)}`)
    })
    y += 2
    addText(`Total: ${money.format(documentTotal(document))}`, true)
    addField('Due amount', money.format(documentDue(document, allDocuments)))
  } else if (document.type === 'details') {
    addText('WORK AND PAYMENT', true)
    addField('Work', document.work)
    addField('Password', document.password)
    addField('Payment status', document.paymentStatus)
  } else {
    addText('PAYMENT DETAILS', true)
    addField(document.type === 'receipt' ? 'Amount received' : 'Amount paid', money.format(document.amount))
    addField('Due amount', money.format(documentDue(document, allDocuments)))
    if (document.notes) addField('Notes', document.notes)
  }

  y += 12
  ensureSpace(12)
  pdf.setDrawColor(220, 218, 231)
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
  y += 7
  addText('Thank you for your business.')

  return pdf.output('blob')
}

function safeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'document'
}

export async function createDocumentsArchive(store: StoreData): Promise<Blob> {
  const zip = new JSZip()
  zip.file('backup.json', JSON.stringify(store, null, 2))
  zip.file(
    'README.txt',
    'This archive contains backup.json to restore records in Global Tax Nepal and one PDF per saved document. Passwords are included as plain text in the backup and applicable PDFs.',
  )

  for (const [index, document] of store.documents.entries()) {
    const filename = `${String(index + 1).padStart(3, '0')}-${safeFilePart(document.documentNumber)}-${safeFilePart(document.customer.name)}.pdf`
    zip.file(`bills/${filename}`, documentPdf(document, store.documents))
  }

  return zip.generateAsync({ type: 'blob' })
}

export async function readArchiveBackup(file: File): Promise<unknown> {
  const zip = await JSZip.loadAsync(file)
  const backup = zip.file('backup.json')
  if (!backup) {
    throw new Error('This ZIP does not contain backup.json. It cannot restore editable billing records.')
  }
  return JSON.parse(await backup.async('string')) as unknown
}
