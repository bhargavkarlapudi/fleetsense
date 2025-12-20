import React, {useEffect, useState} from 'react'
import {toast} from 'react-toastify'
import {
  CrewFlagDocument,
  FlagCountry,
  FlagDocType,
} from '../../core/_models'
import {
  getFlagDocuments,
  saveFlagDocument,
  deleteFlagDocument,
  fetchFlagDocumentBlob,
} from '../../core/_requests'

interface FlagDocumentsProps {
  crewId: number | null
  fieldErrors: Record<string, string>
  markSaved: () => void
  setIsDirty: (dirty: boolean) => void
  existingFlagDocuments?: CrewFlagDocument[] | null
}

interface FlagRow {
  flag: FlagCountry
  docType: FlagDocType
  documentNumber: string
  issueDate: string // yyyy-MM-dd
  expiryDate: string
  id: number | null
  filePath: string | null
  fileName: string | null
  file?: File | null
}

const FLAG_ORDER: FlagCountry[] = [
  'GAMBIA',
  'COMOROS',
  'MOZAMBIQUE',
  'MARSHALL_ISLANDS',
  'COOK_ISLANDS',
]

const FLAG_LABELS: Record<FlagCountry, string> = {
  GAMBIA: 'GAMBIA',
  COMOROS: 'COMOROS',
  MOZAMBIQUE: 'MOZAMBIQUE',
  MARSHALL_ISLANDS: 'MARSHALL  ISLANDS',
  COOK_ISLANDS: 'COOK ISLANDS',
}

const DOC_TYPES: FlagDocType[] = [
  'COC',
  'GMDSS',
  'SSO',
  'OIL_ENDORSEMENT',
  'CHEM_ENDORSEMENT',
  'STSDSD',
  'CRA',
]

const DOC_LABELS: Record<FlagDocType, string> = {
  COC: 'COC',
  GMDSS: 'GMDSS',
  SSO: 'SSO',
  OIL_ENDORSEMENT: 'OIL ENDORSEMENT',
  CHEM_ENDORSEMENT: 'CHEM ENDORSEMENT',
  STSDSD: 'STSDSD',   
  CRA: 'CRA',         
}

const makeInitialRows = (): FlagRow[] => {
  const rows: FlagRow[] = []
  for (const flag of FLAG_ORDER) {
    for (const docType of DOC_TYPES) {
      rows.push({
        flag,
        docType,
        documentNumber: '',
        issueDate: '',
        expiryDate: '',
        id: null,
        filePath: null,
        fileName: null,
        file: null,
      })
    }
  }
  return rows
}


const FlagDocuments = React.forwardRef<{ saveAll: () => Promise<boolean> }, FlagDocumentsProps>(
  ({
    crewId,
    fieldErrors,
    markSaved,
    setIsDirty,
    existingFlagDocuments,
  }, ref) => {
  const [rows, setRows] = useState<FlagRow[]>(makeInitialRows)
  const [initialRows, setInitialRows] = useState<FlagRow[]>(makeInitialRows)

  const isRowDirty = (index: number): boolean => {
  const r = rows[index]
  const init = initialRows[index]
  return (
    r.documentNumber !== init.documentNumber ||
    r.issueDate !== init.issueDate ||
    r.expiryDate !== init.expiryDate ||
    !!r.file
  )
}
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [viewer, setViewer] = useState<{
    open: boolean
    href: string | null
    title: string
    mime?: string
  }>({open: false, href: null, title: ''})

  const closeViewer = () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      setObjectUrl(null)
    }
    setViewer({open: false, href: null, title: '', mime: undefined})
  }

  React.useImperativeHandle(ref, () => ({
      saveAll: async () => {
        if (!crewId) return false
        const dirtyIndices = rows.map((_, i) => i).filter(isRowDirty)
        if (!dirtyIndices.length) return true  // Nothing to save

        try {
          await Promise.all(dirtyIndices.map(handleSaveRow))
          markSaved()
          setIsDirty(false)
          setInitialRows([...rows])  // Update snapshot after save
          return true
        } catch (err) {
          toast.error('Failed to save all flag documents')
          return false
        }
      }
    }))

  const validateFile = (file: File | null) => {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
    ]
    const maxSize = 9 * 1024 * 1024
    if (!file) return {isValid: true, message: ''}
    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        message:
          'Invalid file type. Only JPEG, PNG, JPG, and PDF are allowed.',
      }
    }
    if (file.size > maxSize) {
      return {
        isValid: false,
        message: 'File is too large. Maximum size is 9MB.',
      }
    }
    return {isValid: true, message: ''}
  }

  const updateRow = (index: number, patch: Partial<FlagRow>) => {
    setRows((prev) => {
      const copy = [...prev]
      copy[index] = {...copy[index], ...patch}
      return copy
    })
    setIsDirty(true)
  }

  const handleFieldChange = (
    index: number,
    field: keyof Pick<FlagRow, 'documentNumber' | 'issueDate' | 'expiryDate'>,
    value: string
  ) => {
    updateRow(index, {[field]: value})
  }

  const handleFileChange = (index: number, file: File | null) => {
    const validation = validateFile(file)
    if (!validation.isValid) {
      toast.error(validation.message)
      return
    }
    updateRow(index, {file})
  }

  const handleSaveRow = async (index: number) => {
    if (!crewId) {
      toast.error('Please create/save Personal Data (crew) first.')
      return
    }

    const row = rows[index]
    try {
      const res = await saveFlagDocument({
        crewId,
        flag: row.flag,
        docType: row.docType,
        documentNumber: row.documentNumber || '',
        issueDate: row.issueDate || '',
        expiryDate: row.expiryDate || '',
        file: row.file ?? null,
      })

      setRows((prev) => {
        const copy = [...prev]
        copy[index] = {
          ...copy[index],
          id: res.id,
          documentNumber: res.documentNumber ?? '',
          issueDate: res.issueDate ?? '',
          expiryDate: res.expiryDate ?? '',
          filePath: res.filePath ?? null,
          fileName: res.fileName ?? null,
          file: null,
        }
        return copy
      })

      setIsDirty(false)
      markSaved()
      toast.success(
        `${FLAG_LABELS[row.flag]} - ${DOC_LABELS[row.docType]} saved.`
      )
    } catch (err) {
      console.error('Failed to save flag document', err)
      toast.error('Failed to save flag document')
    }
  }

  const handlePreview = async (index: number) => {
    const row = rows[index]
    if (!crewId || !row.id) {
      toast.error('Nothing to preview for this document.')
      return
    }
    try {
      const blob = await fetchFlagDocumentBlob(crewId, row.id)
      const url = URL.createObjectURL(blob)
      setObjectUrl(url)
      setViewer({
        open: true,
        href: url,
        title: `${FLAG_LABELS[row.flag]} - ${DOC_LABELS[row.docType]}`,
        mime: blob.type || undefined,
      })
    } catch (err) {
      console.error('Failed to preview flag document', err)
      toast.error('Failed to preview flag document')
    }
  }

  const handleRemoveFile = async (index: number) => {
    const row = rows[index]
    if (!crewId || !row.id) {
      // just clear local file selection
      updateRow(index, {file: null, filePath: null, fileName: null})
      return
    }
    try {
      await deleteFlagDocument(crewId, row.id)
      toast.success(
        `${FLAG_LABELS[row.flag]} - ${DOC_LABELS[row.docType]} deleted.`
      )
      setRows((prev) => {
        const copy = [...prev]
        copy[index] = {
          ...copy[index],
          id: null,
          filePath: null,
          fileName: null,
          file: null,
          // keep numbers/dates in case they want to re-upload
        }
        return copy
      })
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to delete flag document', err)
      toast.error('Failed to delete flag document')
    }
  }

const renderFileCell = (index: number) => {
  const row = rows[index]
  const hasNewFile = !!row.file   // row-level save should be for file only

  // Case: file already exists on server
  if (row.filePath) {
    return (
      <div className='d-flex align-items-center gap-2 flex-wrap'>
        {/* Preview existing file */}
        <button
          type='button'
          className='btn btn-sm btn-icon btn-info'
          title='Preview'
          onClick={() => handlePreview(index)}
        >
          <i className='bi bi-eye'></i>
        </button>

        {/* Only show Update when a NEW file is selected */}
        {hasNewFile && (
          <button
            type='button'
            className='btn btn-sm btn-primary'
            title='Update file'
            onClick={() => handleSaveRow(index)}
          >
            Update File
          </button>
        )}

        {/* Remove file */}
        <button
          type='button'
          className='btn btn-sm btn-icon btn-secondary'
          title='Remove'
          onClick={() => handleRemoveFile(index)}
        >
          <i className='bi bi-trash'></i>
        </button>
      </div>
    )
  }

  // Case: no file yet → allow upload
  return (
    <>
      <input
        type='file'
        className='form-control form-control-sm mb-2'
        onChange={(e) =>
          handleFileChange(index, e.target.files?.[0] || null)
        }
        accept='.pdf,.png,.jpg,.jpeg'
        style={{maxWidth: '220px'}}
      />
      {hasNewFile && (
        <button
          type='button'
          className='btn btn-sm btn-primary'
          onClick={() => handleSaveRow(index)}
        >
          Save File
        </button>
      )}
    </>
  )
}


  useEffect(() => {
    if (!existingFlagDocuments?.length) return

    const byKey = new Map(
      existingFlagDocuments.map((d: CrewFlagDocument) => [
        `${d.flag}_${d.docType}`,
        d,
      ])
    )

    setRows((prev) => {
      const nextRows = prev.map((r) => {
        const key = `${r.flag}_${r.docType}`
        const found = byKey.get(key)
        if (!found) return r
        return {
          ...r,
          id: found.id,
          documentNumber: found.documentNumber ?? '',
          issueDate: found.issueDate ?? '',
          expiryDate: found.expiryDate ?? '',
          filePath: found.filePath ?? null,
          fileName: found.fileName ?? null,
          file: null,
        } as FlagRow
      })

      // snapshot after backend load so isRowDirty only picks real changes
      setInitialRows(nextRows)
      return nextRows
    })
  }, [existingFlagDocuments])

  return (
    <>
      <div className='col-12 mb-4'>
        <h6 className='mb-3 fw-bold'>Flag Documents</h6>
        <div className='table-responsive'>
          <table className='table table-bordered'>
            <thead className='table-light'>
              <tr>
                <th style={{width: '20%'}}>Flag / Document</th>
                <th style={{width: '20%'}}>Document Number</th>
                <th style={{width: '20%'}}>Issue Date</th>
                <th style={{width: '20%'}}>Expiry Date</th>
                <th style={{width: '20%'}}>File Upload</th>
              </tr>
            </thead>
            <tbody>
              {FLAG_ORDER.map((flag) => (
                <React.Fragment key={flag}>
                  <tr
  className='table-secondary align-middle'
  style={{borderTop: '2px solid #ccc'}}
>
  <td colSpan={5} className='py-2 bg-light-warning'>
    <div className='d-flex align-items-center'>
      {/* Left badge saying it's a section label */}

      {/* Actual flag label */}
      <span className='fw-bold text-uppercase badge badge-secondary badge-lg my-2 '
              style={{ letterSpacing: '0.05em'}}
>
        {FLAG_LABELS[flag]}
      </span>
    </div>
  </td>
</tr>

                  {DOC_TYPES.map((docType) => {
                    const idx = rows.findIndex(
                      (r) => r.flag === flag && r.docType === docType
                    )
                    if (idx < 0) return null
                    const row = rows[idx]
                    return (
                      <tr key={`${flag}-${docType}`}>
                        <td>
                          <strong>{DOC_LABELS[docType]}</strong>
                        </td>
                        <td>
                          <input
                            type='text'
                            className='form-control form-control-sm'
                            value={row.documentNumber}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                'documentNumber',
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type='date'
                            className='form-control form-control-sm'
                            value={row.issueDate}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                'issueDate',
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            type='date'
                            className='form-control form-control-sm'
                            value={row.expiryDate}
                            onChange={(e) =>
                              handleFieldChange(
                                idx,
                                'expiryDate',
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>{renderFileCell(idx)}</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewer.open && (
        <div
          className='modal fade show'
          style={{display: 'block'}}
          onClick={closeViewer}
        >
          <div
            className='modal-dialog modal-xl'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='modal-content'>
              <div className='modal-header'>
                <h5 className='modal-title m-0'>{viewer.title}</h5>
                <button
                  type='button'
                  className='btn-close'
                  onClick={closeViewer}
                />
              </div>
              <div className='modal-body' style={{height: '80vh'}}>
                {viewer.mime?.startsWith('image/')
                  ? (
                  <img
                    src={viewer.href ?? ''}
                    alt=''
                    style={{maxWidth: '100%', maxHeight: '100%'}}
                  />
                    )
                  : (
                  <iframe
                    src={viewer.href ?? ''}
                    width='100%'
                    height='100%'
                    title='Document preview'
                  />
                    )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
)
export default FlagDocuments
