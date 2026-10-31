import NepaliDate from 'nepali-date-converter'

export function today(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function gregorianDateParts(date: string): [number, number, number] | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) return null
  return [year, month, day]
}

export function isValidGregorianDate(date: string): boolean {
  return gregorianDateParts(date) !== null
}

export function nepaliDate(date: string): NepaliDate | null {
  const parts = gregorianDateParts(date)
  if (!parts) return null
  try {
    const [year, month, day] = parts
    return new NepaliDate(new Date(year, month - 1, day, 12))
  } catch {
    return null
  }
}

export function formatNepaliDate(date: string): string {
  return nepaliDate(date)?.format('YYYY/MM/DD') ?? '—'
}

export function gregorianDateFromNepali(date: string): string | null {
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(date)
  if (!match) return null

  const nepaliDateText = `${match[1]}/${match[2].padStart(2, '0')}/${match[3].padStart(2, '0')}`
  try {
    const converted = new NepaliDate(nepaliDateText)
    if (converted.format('YYYY/MM/DD') !== nepaliDateText) return null
    const { year, month, date: day } = converted.getAD()
    const gregorianDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return isValidGregorianDate(gregorianDate) ? gregorianDate : null
  } catch {
    return null
  }
}
