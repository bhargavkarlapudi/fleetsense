import React, {useState, useEffect} from 'react'
import {
  WatchkeepingCertificateRequest,
  WatchkeepingCertificateResponse,
} from '../../core/_models'
import {
  uploadWatchkeepingFile,
  fetchWatchkeepingFileBlob,
  deleteWatchkeepingFile,
  createWatchkeepingCertificate,
  updateWatchkeepingCertificate,
} from '../../core/_requests'

import {toast} from 'react-toastify'
import { DateTextInput } from '../DateTextInput'
interface WatchkeepingCertificatesProps {
  crewId: number | null
  watchkeepingCertificates: WatchkeepingCertificateRequest[]
  handleWatchkeepingCertificateChange: (
    index: number,
    field: keyof WatchkeepingCertificateRequest,
    value: string
  ) => void
  fieldErrors: Record<string, string>
  existingWatchkeepingCertificates: WatchkeepingCertificateResponse[]
}

const certificateDetails = [
  'Deck Watch keeping Regulation II/4',
  'Able Seafarer Deck Regulation II/5 (COP)',
  'Engine Room Watch keeping III/4',
  'Able Seafarer Engine Regulation III/5 (COP)',
]

const MAX_FILE_SIZE = 9 * 1024 * 1024 // 9 MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
]

const WatchkeepingCertificates: React.FC<WatchkeepingCertificatesProps> = ({
  crewId,
  watchkeepingCertificates,
  handleWatchkeepingCertificateChange,
  fieldErrors,
  existingWatchkeepingCertificates,
}) => {
  // Local map: certificateDetails string => File
  const [filesByKey, setFilesByKey] = useState<Record<string, File | null>>({})
  // Track backend id + file-exists per certificateDetails row
  const [idByKey, setIdByKey] = useState<Record<string, number | undefined>>({})
  const [hasFileByKey, setHasFileByKey] = useState<Record<string, boolean>>({})

  const validateFile = (file: File | null) => {
    if (!file) return {isValid: false, message: 'No file selected'}
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        message:
          'Invalid file type. Only JPEG, PNG, JPG, and PDF are allowed.',
      }
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        message: 'File is too large. Maximum size is 9MB.',
      }
    }
    return {isValid: true, message: ''}
  }

    // Initialize local maps from existing backend data
  useEffect(() => {
    const nextIds: Record<string, number | undefined> = {}
    const nextHasFile: Record<string, boolean> = {}

    existingWatchkeepingCertificates.forEach((c) => {
      if (c.certificateDetails) {
        nextIds[c.certificateDetails] = c.id
        nextHasFile[c.certificateDetails] = !!c.filePath
      }
    })

    setIdByKey(nextIds)
    setHasFileByKey(nextHasFile)
  }, [existingWatchkeepingCertificates])


  const handleFileChangeLocal = (key: string, file: File | null) => {
    if (file) {
      const validation = validateFile(file)
      if (!validation.isValid) {
        toast.error(validation.message)
        return
      }
    }
    setFilesByKey((prev) => ({...prev, [key]: file}))
  }

    const handleSaveFile = async (key: string, index: number) => {
    const file = filesByKey[key]
    if (!file) {
      toast.error('Please choose a file before saving.')
      return
    }
    if (!crewId) {
      toast.error('Please save Personal Data (crew) first.')
      return
    }

    try {
      let certificateId = idByKey[key]

      // Build payload from the current row values
      const row = watchkeepingCertificates[index]
      const payload: WatchkeepingCertificateRequest = {
        certificateDetails: key,
        certificateNo: row?.certificateNo || null,
        dateOfIssue: row?.dateOfIssue || null,
        placeOfIssue: row?.placeOfIssue || null,
        validUntil: row?.validUntil || null,
      }

      // If no backend row yet, create it now
      if (!certificateId) {
        const created = await createWatchkeepingCertificate(crewId, payload)
        certificateId = created.id
      } else {
        // Keep backend details in sync
        await updateWatchkeepingCertificate(crewId, certificateId, payload)
      }

      // Upload / update the file for this certificate
      await uploadWatchkeepingFile(crewId, certificateId!, file)

      // Update local maps so UI reflects file presence immediately
      setIdByKey((prev) => ({...prev, [key]: certificateId}))
      setHasFileByKey((prev) => ({...prev, [key]: true}))
      setFilesByKey((prev) => ({...prev, [key]: null}))

      toast.success('Watchkeeping certificate file uploaded.')
    } catch (err) {
      console.error('Failed to upload watchkeeping file', err)
      toast.error('Failed to upload watchkeeping file.')
    }
  }


    const handlePreviewFile = async (key: string) => {
    if (!crewId) {
      toast.error('Please save Personal Data (crew) first.')
      return
    }
    const id = idByKey[key]
    if (!id || !hasFileByKey[key]) {
      toast.error('No file available to preview for this certificate.')
      return
    }

    try {
      const blob = await fetchWatchkeepingFileBlob(crewId, id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Failed to preview watchkeeping file', err)
      toast.error('Failed to preview file. It may not exist on server.')
    }
  }


    const handleDeleteFile = async (key: string) => {
    if (!crewId) {
      toast.error('Please save Personal Data (crew) first.')
      return
    }
    const id = idByKey[key]

    // No backend row / file yet → just clear local file
    if (!id || !hasFileByKey[key]) {
      setFilesByKey((prev) => ({...prev, [key]: null}))
      setHasFileByKey((prev) => ({...prev, [key]: false}))
      return
    }

    try {
      await deleteWatchkeepingFile(crewId, id)
      setFilesByKey((prev) => ({...prev, [key]: null}))
      setHasFileByKey((prev) => ({...prev, [key]: false}))
      toast.success('Watchkeeping file removed.')
    } catch (err) {
      console.error('Failed to delete watchkeeping file', err)
      toast.error('Failed to delete file.')
    }
  }

    const renderFileCell = (key: string, index: number) => {
  const pendingFile = filesByKey[key] ?? null
  const hasServerFile = !!hasFileByKey[key]

  // ✅ If file already exists on server → only show icons (View + Remove)
  if (hasServerFile) {
    return (
      <div className='d-flex flex-wrap gap-2 align-items-center'>
        <button
          type='button'
          className='btn btn-sm btn-icon btn-info'
          title='View file'
          onClick={() => handlePreviewFile(key)}
        >
          <i className='bi bi-eye' />
        </button>

        <button
          type='button'
          className='btn btn-sm btn-icon btn-secondary'
          title='Remove file'
          onClick={() => handleDeleteFile(key)}
        >
          <i className='bi bi-trash' />
        </button>
      </div>
    )
  }

  // ✅ No file yet → show choose file + Save
  return (
    <div className='d-flex flex-column gap-2'>
      <input
        type='file'
        className='form-control form-control-sm'
        accept='.pdf,.png,.jpg,.jpeg'
        onChange={(e) =>
          handleFileChangeLocal(key, e.target.files?.[0] || null)
        }
        style={{maxWidth: '220px'}}
      />

      <div className='d-flex flex-wrap gap-2'>
        {pendingFile && (
          <button
            type='button'
            className='btn btn-sm btn-primary'
            onClick={() => handleSaveFile(key, index)}
          >
            Save File
          </button>
        )}
      </div>
    </div>
  )
}


  return (
    <div className='container mt-4'>
      <h5 className='fw-bold mb-3'>
        Watch keeping certificates{' '}
        <span className='fw-normal'>
          (For <strong>Rating</strong> only)
        </span>
      </h5>
      <div className='table-responsive'>
        <table className='table table-bordered'>
          <thead className='table-light'>
            <tr>
              <th>Certificate Details</th>
              <th>Certificate No</th>
              <th>Date of Issue</th>
              <th>Place of Issue</th>
              <th>Valid Until</th>
              <th>File</th>
            </tr>
          </thead>
          <tbody>
            {certificateDetails.map((detail, index) => (
              <tr key={index}>
                <td>{detail}</td>
                <td>
                  <input
                    type='text'
                    className={`form-control ${
                      fieldErrors[`watchkeeping_certificateNo_${index}`]
                        ? 'is-invalid'
                        : ''
                    }`}
                    placeholder='Enter Certificate No'
                    value={watchkeepingCertificates[index]?.certificateNo || ''}
                    onChange={(e) =>
                      handleWatchkeepingCertificateChange(
                        index,
                        'certificateNo',
                        e.target.value
                      )
                    }
                  />
                  {fieldErrors[`watchkeeping_certificateNo_${index}`] && (
                    <div className='invalid-feedback'>
                      {fieldErrors[`watchkeeping_certificateNo_${index}`]}
                    </div>
                  )}
                </td>
                <td>
                <DateTextInput
  className={`form-control ${
    fieldErrors[`watchkeeping_dateOfIssue_${index}`] ? 'is-invalid' : ''
  }`}
  value={watchkeepingCertificates[index]?.dateOfIssue || ''}
  onChange={(val) =>
    handleWatchkeepingCertificateChange(index, 'dateOfIssue', val)
  }
/>

                  {fieldErrors[`watchkeeping_dateOfIssue_${index}`] && (
                    <div className='invalid-feedback'>
                      {fieldErrors[`watchkeeping_dateOfIssue_${index}`]}
                    </div>
                  )}
                </td>
                <td>
                  <input
                    type='text'
                    className={`form-control ${
                      fieldErrors[`watchkeeping_placeOfIssue_${index}`]
                        ? 'is-invalid'
                        : ''
                    }`}
                    placeholder='Enter Place'
                    value={watchkeepingCertificates[index]?.placeOfIssue || ''}
                    onChange={(e) =>
                      handleWatchkeepingCertificateChange(
                        index,
                        'placeOfIssue',
                        e.target.value
                      )
                    }
                  />
                  {fieldErrors[`watchkeeping_placeOfIssue_${index}`] && (
                    <div className='invalid-feedback'>
                      {fieldErrors[`watchkeeping_placeOfIssue_${index}`]}
                    </div>
                  )}
                </td>
                <td>
                <DateTextInput
  className={`form-control ${
    fieldErrors[`watchkeeping_validUntil_${index}`] ? 'is-invalid' : ''
  }`}
  value={watchkeepingCertificates[index]?.validUntil || ''}
  onChange={(val) =>
    handleWatchkeepingCertificateChange(index, 'validUntil', val)
  }
/>

                  {fieldErrors[`watchkeeping_validUntil_${index}`] && (
                    <div className='invalid-feedback'>
                      {fieldErrors[`watchkeeping_validUntil_${index}`]}
                    </div>
                  )}
                </td>
                <td>{renderFileCell(detail, index)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WatchkeepingCertificates
