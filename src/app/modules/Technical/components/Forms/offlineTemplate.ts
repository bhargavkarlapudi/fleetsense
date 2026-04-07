import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import type { StaticFormConfig } from './staticFormsConfig'

const worksheetFromRows = (rows: (string | number)[][]) => XLSX.utils.aoa_to_sheet(rows)

const buildWorkbook = (form: StaticFormConfig) => {
  const metaRows: (string | number)[][] = [
    ['formCode', form.code],
    ['formTitle', form.title],
    ['remarks', ''],
    ['exportedAt', new Date().toISOString()],
  ]

  const fieldRows: (string | number)[][] = [['Field Key', 'Label', 'Value']]
  const checklistRows: (string | number)[][] = [['Field Key', 'Item', 'Value (Yes/No)']]

  form.fields.forEach((field) => {
    if (field.type === 'checklist' && field.items) {
      field.items.forEach((item) => {
        checklistRows.push([field.name, item, ''])
      })
      return
    }
    fieldRows.push([field.name, field.label, ''])
  })

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(metaRows), 'Form')
  XLSX.utils.book_append_sheet(workbook, worksheetFromRows(fieldRows), 'Fields')
  if (checklistRows.length > 1) {
    XLSX.utils.book_append_sheet(workbook, worksheetFromRows(checklistRows), 'Checklists')
  }

  return workbook
}

export const buildOfflineExcelFile = (form: StaticFormConfig) => {
  const workbook = buildWorkbook(form)
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  return new File([data], `${form.code}-offline-template.xlsx`, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export const downloadOfflineExcel = (form: StaticFormConfig) => {
  const file = buildOfflineExcelFile(form)
  saveAs(file, file.name)
}
