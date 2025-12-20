import React, {useState, useEffect} from 'react'
import {
  CourseCertificate,
  CourseCertificateResponse,
} from '../../core/_models'
import {
  uploadCourseCertificateFile,
  fetchCourseCertificateFileBlob,
  deleteCourseCertificateFile,
  createCourseCertificate,
  updateCourseCertificate,
} from '../../core/_requests'
import {toast} from 'react-toastify'
import { DateTextInput } from '../DateTextInput'

interface CoursesCertificatesProps {
  crewId: number | null
  courseCertificates: CourseCertificate[]
  handleCourseCertificateChange: (
    index: number,
    field: keyof CourseCertificate,
    value: string
  ) => void
  fieldErrors: Record<string, string>
  existingCourseCertificates: CourseCertificateResponse[]
}

const courseCategories = [
  {
    label: 'STCW Certificates',
    courses: [
      'Personal Survival & Social Responsibility (PSSR)',
      'Proficiency in Survival Craft & Rescue Boat (PSCRB)',
      'Proficiency in Survival Technique (PST)',
      'Advanced Fire Fighting (AFF)/ Fire Prevention and Fire Fighting (FPFF)',
      'Elementary First Aid (EFA)/ Medical First Aid (MFA)/ Medicare',
      'STSDSD / SSO Course',
      'High Voltage Training',
      'Radar Observer / ARPA',
      'Radar Simulator (RANSCO) / ENS',
      'LCHS',
      'Ship Safety Officer',
    ],
  },
  {
    label: 'Tanker Courses',
    courses: [
      'Oil Tanker Familiarization (OTFC)/Advance Training for Cargo operation(TASCO)',
      'Chemical Tanker Familiarization (CTFC)',
      'Gas Familiarization (GTFC)',
      'Chemical Tanker Safety (CHEMCO)',
      'Gas Tanker Safety (GASCO)',
    ],
  },
  {
    label: 'Navigation & Main Engine Training',
    courses: [
      'Bridge Team Management (BTM)/Bridge Resource Management (BRM)',
      'Engine Room Simulator (ERS)',
      'ECDIS-Generic',
      'ECDIS-Type Specific',
      'Any Value Added Course/Company Specific Course',
      'Yellow Fever',
    ],
  },
  {
    label: 'Revalidation Course',
    courses: [
      'Refresher and Updating Training (Up gradation course) for Deck Officers',
      'Refresher and Updating Training for Engineer Officers',
      'Add. Training if any',
    ],
  },
]

const MAX_FILE_SIZE = 9 * 1024 * 1024 // 9 MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/pdf',
]

const CoursesCertificates: React.FC<CoursesCertificatesProps> = ({
  crewId,
  courseCertificates,
  handleCourseCertificateChange,
  fieldErrors,
  existingCourseCertificates,
}) => {
  // Local map: courseName => File
  const [filesByCourse, setFilesByCourse] = useState<Record<string, File | null>>({})
  const [idByCourse, setIdByCourse] = useState<Record<string, number | undefined>>({})
  const [hasFileByCourse, setHasFileByCourse] = useState<Record<string, boolean>>({})

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

    // Initialize row meta from backend on load / change
  useEffect(() => {
    const nextIds: Record<string, number | undefined> = {}
    const nextHasFile: Record<string, boolean> = {}

    existingCourseCertificates.forEach((c) => {
      if (c.certificateName) {
        nextIds[c.certificateName] = c.id
        nextHasFile[c.certificateName] = !!c.filePath
      }
    })

    setIdByCourse(nextIds)
    setHasFileByCourse(nextHasFile)
  }, [existingCourseCertificates])

  const handleFileChangeLocal = (courseName: string, file: File | null) => {
    if (file) {
      const validation = validateFile(file)
      if (!validation.isValid) {
        toast.error(validation.message)
        return
      }
    }
    setFilesByCourse((prev) => ({...prev, [courseName]: file}))
  }

    const handleSaveFile = async (courseName: string, certificate: CourseCertificate) => {
    const file = filesByCourse[courseName]
    if (!file) {
      toast.error('Please choose a file before saving.')
      return
    }
    if (!crewId) {
      toast.error('Please save Personal Data (crew) first.')
      return
    }

    try {
      let courseId = idByCourse[courseName]

      const payload: CourseCertificate = {
        certificateName: courseName,
        category: certificate.category,
        certificateNumber: certificate.certificateNumber || null,
        dateOfIssue: certificate.dateOfIssue || null,
        dateOfExpiry: certificate.dateOfExpiry || null,
        issuedBy: certificate.issuedBy || null,
      }

      if (!courseId) {
        const created = await createCourseCertificate(crewId, payload)
        courseId = created.id
      } else {
        await updateCourseCertificate(crewId, courseId, payload)
      }

      await uploadCourseCertificateFile(courseId!, file)

      setIdByCourse((prev) => ({...prev, [courseName]: courseId}))
      setHasFileByCourse((prev) => ({...prev, [courseName]: true}))
      setFilesByCourse((prev) => ({...prev, [courseName]: null}))

      toast.success('Course certificate file uploaded.')
    } catch (err) {
      console.error('Failed to upload course certificate file', err)
      toast.error('Failed to upload course certificate file.')
    }
  }

    const handlePreviewFile = async (courseName: string) => {
    const id = idByCourse[courseName]
    if (!id || !hasFileByCourse[courseName]) {
      toast.error('No file available to preview for this course.')
      return
    }

    try {
      const blob = await fetchCourseCertificateFileBlob(id)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Failed to preview course certificate file', err)
      toast.error('Failed to preview file. It may not exist on server.')
    }
  }

    const handleDeleteFile = async (courseName: string) => {
    const id = idByCourse[courseName]

    if (!id || !hasFileByCourse[courseName]) {
      setFilesByCourse((prev) => ({...prev, [courseName]: null}))
      setHasFileByCourse((prev) => ({...prev, [courseName]: false}))
      return
    }

    try {
      await deleteCourseCertificateFile(id)
      setFilesByCourse((prev) => ({...prev, [courseName]: null}))
      setHasFileByCourse((prev) => ({...prev, [courseName]: false}))
      toast.success('Course certificate file removed.')
    } catch (err) {
      console.error('Failed to delete course certificate file', err)
      toast.error('Failed to delete file.')
    }
  }


    const renderFileCell = (courseName: string, certificate: CourseCertificate) => {
  const pendingFile = filesByCourse[courseName] ?? null
  const hasServerFile = !!hasFileByCourse[courseName]

  // ✅ If file already exists on server → only show icons (View + Remove)
  if (hasServerFile) {
    return (
      <div className='d-flex flex-wrap gap-2 align-items-center'>
        <button
          type='button'
          className='btn btn-sm btn-icon btn-info'
          title='View file'
          onClick={() => handlePreviewFile(courseName)}
        >
          <i className='bi bi-eye' />
        </button>

        <button
          type='button'
          className='btn btn-sm btn-icon btn-secondary'
          title='Remove file'
          onClick={() => handleDeleteFile(courseName)}
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
          handleFileChangeLocal(courseName, e.target.files?.[0] || null)
        }
        style={{maxWidth: '220px'}}
      />

      <div className='d-flex flex-wrap gap-2'>
        {pendingFile && (
          <button
            type='button'
            className='btn btn-sm btn-primary'
            onClick={() => handleSaveFile(courseName, certificate)}
          >
            Save File
          </button>
        )}
      </div>
    </div>
  )
}

  return (
    <div className='container my-4'>
      <h5 className='fw-bold mb-4'>Courses &amp; Certificates</h5>
      {courseCategories.map((category, catIndex) => (
        <div key={catIndex} className='mb-4'>
          <h6 className='fw-bold mb-3'>{category.label}</h6>
          <div className='table-responsive'>
            <table className='table table-bordered'>
              <thead className='table-light'>
                <tr>
                  <th>Course Name</th>
                  <th>Certificate Number</th>
                  <th>Date of Issue</th>
                  <th>Date of Expiry</th>
                  <th>Issued By</th>
                  <th>File</th>
                </tr>
              </thead>
              <tbody>
                {category.courses.map((courseName, index) => {
                  const certIndex = courseCertificates.findIndex(
                    (cert) => cert.certificateName === courseName
                  )

                  const certificate =
                    certIndex !== -1
                      ? courseCertificates[certIndex]
                      : {
                          certificateName: courseName,
                          category: category.label,
                          certificateNumber: '',
                          dateOfIssue: '',
                          dateOfExpiry: '',
                          issuedBy: '',
                        }

                  const globalIndex =
                    courseCertificates.findIndex(
                      (cert) => cert.certificateName === courseName
                    ) !== -1
                      ? certIndex
                      : courseCertificates.length + index

                  return (
                    <tr key={`${catIndex}-${index}`}>
                      <td>{courseName}</td>
                      <td>
                        <input
                          type='text'
                          className='form-control'
                          placeholder='Certificate Number'
                          value={certificate.certificateNumber || ''}
                          onChange={(e) =>
                            handleCourseCertificateChange(
                              globalIndex,
                              'certificateNumber',
                              e.target.value
                            )
                          }
                        />
                        {fieldErrors[
                          `course_certificateNumber_${globalIndex}`
                        ] && (
                          <div className='text-danger mt-1'>
                            {
                              fieldErrors[
                                `course_certificateNumber_${globalIndex}`
                              ]
                            }
                          </div>
                        )}
                      </td>
                      <td>
                      <DateTextInput
  className='form-control'
  value={certificate.dateOfIssue || ''}
  onChange={(val) =>
    handleCourseCertificateChange(globalIndex, 'dateOfIssue', val)
  }
/>

                        {fieldErrors[`course_dateOfIssue_${globalIndex}`] && (
                          <div className='text-danger mt-1'>
                            {
                              fieldErrors[
                                `course_dateOfIssue_${globalIndex}`
                              ]
                            }
                          </div>
                        )}
                      </td>
                      <td>
                      <DateTextInput
  className='form-control'
  value={certificate.dateOfExpiry || ''}
  onChange={(val) =>
    handleCourseCertificateChange(globalIndex, 'dateOfExpiry', val)
  }
/>

                        {fieldErrors[
                          `course_dateOfExpiry_${globalIndex}`
                        ] && (
                          <div className='text-danger mt-1'>
                            {
                              fieldErrors[
                                `course_dateOfExpiry_${globalIndex}`
                              ]
                            }
                          </div>
                        )}
                      </td>
                      <td>
                        <input
                          type='text'
                          className='form-control'
                          placeholder='Issued By'
                          value={certificate.issuedBy || ''}
                          onChange={(e) =>
                            handleCourseCertificateChange(
                              globalIndex,
                              'issuedBy',
                              e.target.value
                            )
                          }
                        />
                        {fieldErrors[`course_issuedBy_${globalIndex}`] && (
                          <div className='text-danger mt-1'>
                            {fieldErrors[`course_issuedBy_${globalIndex}`]}
                          </div>
                        )}
                      </td>
                      <td>{renderFileCell(courseName, certificate)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CoursesCertificates
