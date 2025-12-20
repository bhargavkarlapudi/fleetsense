import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from 'react-bootstrap'
import html2pdf from 'html2pdf.js'
import { KTSVG } from '../../../../_metronic/helpers'

import {
  CrewUnit,
  CrewDocument,
  CrewDocumentResponse,
  Rank,
  CompanyAdmin,
  Company,
  AcademicQualificationResponse,
  WatchkeepingCertificateResponse,
  NextOfKinResponse,
  CourseCertificateResponse,
  SeaServiceResponse,
  AdditionalDetailsResponse,
  Reference,
    CrewFlagDocument,
  FlagCountry,
  FlagDocType,
} from '../core/_models'

import {
  getCrewUnit,
  getCrewDocument,
  getCrewDocuments,
  getRanks,
  getCompanyAdminList,
  getCompanyList,
  fetchCrewDocumentBlob,
  getAcademicDetails,
  getWatchkeepingCertificates,
  getNextOfKin,
  getCourseCertificates,
  getSeaServices,
  getAdditionalDetails,
    getFlagDocuments,
  fetchFlagDocumentBlob,
    fetchWatchkeepingFileBlob,
  fetchCourseCertificateFileBlob,
} from '../core/_requests'

/** ---------- Helpers ---------- */
const formatBoolean = (val?: boolean | null) =>
  typeof val === 'boolean' ? (val ? 'Yes' : 'No') : '-'

const formatDate = (iso?: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mmm = d.toLocaleString('en-US', { month: 'short' })
  const yyyy = d.getFullYear()
  return `${dd}-${mmm}-${yyyy}`
}

const normalizeKey = (s: string) => (s || '').replace(/[^a-z0-9]/gi, '').toLowerCase()

// Stable label↔slot mapping used by the table
type TemplateLabel =
  | 'CV'
  | 'Passport'
  | 'National CDC'
  | 'Biometric SID'
  | 'Schengen Visa'
  | 'U.S. VISA C1/D'
  | 'National Certificate of Competency (COC)'
  | 'GMDSS'
  | 'GMDSS Endorsement'
  | 'Indos No'
  | 'Others'
  | 'Basic/Adv Oil Endorsement'
  | 'Basic/Adv Chem Endorsement'
  | 'Basic/Adv Gas Endorsement';

type DocumentSlot =
  | 'CV'
  | 'PASSPORT'
  | 'NATIONAL_CDC'
  | 'BIOMETRIC_SID'
  | 'SCHENGEN_VISA'
  | 'US_VISA_C1D'
  | 'COC'
  | 'GMDSS'
  | 'GMDSS_ENDORSEMENT'
  | 'INDOS'
  | 'OTHERS'
  | 'OIL_ENDORSEMENT'
  | 'CHEM_ENDORSEMENT'
  | 'GAS_ENDORSEMENT';

const LABEL_TO_SLOT: Record<TemplateLabel, DocumentSlot> = {
  'CV': 'CV',
  'Passport': 'PASSPORT',
  'National CDC': 'NATIONAL_CDC',
  'Biometric SID': 'BIOMETRIC_SID',
  'Schengen Visa': 'SCHENGEN_VISA',
  'U.S. VISA C1/D': 'US_VISA_C1D',
  'National Certificate of Competency (COC)': 'COC',
  'GMDSS': 'GMDSS',
  'GMDSS Endorsement': 'GMDSS_ENDORSEMENT',
  'Indos No': 'INDOS',
  'Others': 'OTHERS',
  'Basic/Adv Oil Endorsement': 'OIL_ENDORSEMENT',
  'Basic/Adv Chem Endorsement': 'CHEM_ENDORSEMENT',
  'Basic/Adv Gas Endorsement': 'GAS_ENDORSEMENT',
};

// --- Flag Documents (view-only section) ---
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

const FLAG_DOC_TYPES: FlagDocType[] = [
  'COC',
  'GMDSS',
  'SSO',
  'OIL_ENDORSEMENT',
  'CHEM_ENDORSEMENT',
  'STSDSD',
  'CRA',
]

const FLAG_DOC_LABELS: Record<FlagDocType, string> = {
  COC: 'COC',
  GMDSS: 'GMDSS',
  SSO: 'SSO',
  OIL_ENDORSEMENT: 'OIL ENDORSEMENT',
  CHEM_ENDORSEMENT: 'CHEM ENDORSEMENT',
  STSDSD: 'STSDSD',
  CRA: 'CRA',
}

/** ---------- Component ---------- */
interface Props {
  isOpen: boolean
  crewId?: number
  onClose: () => void
}

const ViewCrewModal: React.FC<Props> = ({ isOpen, crewId, onClose }) => {
  // loading
  const [loading, setLoading] = useState(false)

  // data
  const [crew, setCrew] = useState<CrewUnit | null>(null)
  const [docForm, setDocForm] = useState<CrewDocumentResponse | null>(null)
  const [docFiles, setDocFiles] = useState<CrewDocument[]>([])

  const [academicRows, setAcademicRows] = useState<AcademicQualificationResponse[]>([])
const [watchRows, setWatchRows] = useState<WatchkeepingCertificateResponse[]>([])
const [kinRow, setKinRow] = useState<NextOfKinResponse | null>(null)

const [cgaNameMap, setCgaNameMap] = useState<Record<number, string>>({})


// Keep Watchkeeping list in the same order as the Add form
const WATCHKEEPING_ORDER = [
  'Deck Watch keeping Regulation II/4',
  'Able Seafarer Deck Regulation II/5 (COP)',
  'Engine Room Watch keeping III/4',
  'Able Seafarer Engine Regulation III/5 (COP)',
] as const

const COURSE_CATEGORIES = [
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
] as const

const REFERRAL_LABELS: Record<string, string> = {
  WORD_OF_MOUTH: 'Word of mouth',
  PRINT_MEDIA: 'Print media (state which)',
  CONTACTED_BY_STAFF: 'Contacted by Staff',
  WEB_SITES: 'Web Sites',
}

// helper mapped types to pick only boolean and string keys from AdditionalDetailsResponse
type BoolKeysOf<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends boolean ? K : never
}[keyof T]

type StringKeysOf<T> = {
  [K in keyof T]-?: NonNullable<T[K]> extends string ? K : never
}[keyof T]

type ADBoolKey   = Extract<BoolKeysOf<AdditionalDetailsResponse>, string>
type ADStringKey = Extract<StringKeysOf<AdditionalDetailsResponse>, string>

// labels for the "Other Questions" section – keys now strongly typed
const OTHER_QS: Array<{ label: string; flag: ADBoolKey; details: ADStringKey }> = [
  {
    label:
      'Have you been involved in any Incidents of Grounding / Fire / Explosion / Collision / Abandon Ship / Rescue / Major Oil pollution / Drug Smuggling / Towed or Towing another vessel?',
    flag: 'incidentInvolvement',
    details: 'incidentDetails',
  },
  {
    label: 'Have you been involved in a court of Enquiry for a Maritime accident?',
    flag: 'courtOfEnquiryInvolvement',
    details: 'courtOfEnquiryDetails',
  },
  {
    label: 'Have you ever been involved in a criminal case?',
    flag: 'criminalCaseInvolved',
    details: 'criminalCaseDetails',
  },
  {
    label: 'Have you present or previous certificate ever been suspended/revoked?',
    flag: 'certificateSuspendedRevoked',
    details: 'certificateSuspendedRevokedDetails',
  },
  {
    label:
      'Do you suffer or have suffered from: Diabetes/High Blood pressure/Hepatitis/Epilepsy/Nervous Disorders/Disturbed Vision or Hearing/Vertigo?',
    flag: 'hasMedicalConditions',
    details: 'medicalConditionsDetails',
  },
  {
    label: 'Are you a habitual user of Drugs / Narcotics / Excessive Alcohol?',
    flag: 'habitualUseDrugsAlcohol',
    details: 'habitualUseDetails',
  },
  {
    label: 'Have you previously worked with multinational workforce? If Yes, What nationalities?',
    flag: 'workedWithMultinational',
    details: 'multinationalNationalities',
  },
]



  // lookups
  const [ranks, setRanks] = useState<Rank[]>([])
  const [rankMap, setRankMap] = useState<Record<number, string>>({})
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyAdminMap, setCompanyAdminMap] = useState<Record<number, string>>({})
  const [companyMap, setCompanyMap] = useState<Record<number, string>>({})

  // preview viewer
  const [viewer, setViewer] = useState<{ open: boolean; url: string | null; title: string; mime?: string }>({
    open: false,
    url: null,
    title: '',
    mime: undefined,
  })
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)

  const [courseRows, setCourseRows] = useState<CourseCertificateResponse[]>([])
const [seaRows, setSeaRows] = useState<SeaServiceResponse[]>([])
const [otherRow, setOtherRow] = useState<AdditionalDetailsResponse | null>(null)
const [flagDocs, setFlagDocs] = useState<CrewFlagDocument[]>([])

// ⬇️ memos for quick lookup / rendering order
const courseMap = useMemo(() => {
  const m = new Map<string, CourseCertificateResponse>()
  courseRows?.forEach((r) => r?.certificateName && m.set(r.certificateName, r))
  return m
}, [courseRows])

const seaSorted = useMemo(
  () => [...(seaRows || [])].sort((a, b) => (a?.serialNo ?? 0) - (b?.serialNo ?? 0)),
  [seaRows]
)

const parsedReferences: Reference[] = useMemo(() => {
  if (!otherRow?.references) return []
  try {
    const arr = JSON.parse(otherRow.references as unknown as string)
    return Array.isArray(arr) ? (arr as Reference[]) : []
  } catch {
    return []
  }
}, [otherRow])


  /** ---------- effects: load on open ---------- */
useEffect(() => {
  if (!isOpen || !crewId) {
    setCrew(null)
    setDocForm(null)
    setDocFiles([])
    setAcademicRows([])
    setWatchRows([])
    setKinRow(null)
    setCourseRows([])
    setSeaRows([])
    setOtherRow(null)
    setFlagDocs([])
    return
  }

  setLoading(true)

  Promise.all([
    getCrewUnit(crewId),                        // 0
    getRanks(),                                 // 1
    getCrewDocument(crewId).catch(() => null),  // 2
    getCrewDocuments(crewId).catch(() => []),   // 3
    getCompanyAdminList().catch(() => []),      // 4
    getCompanyList().catch(() => []),           // 5
    getAcademicDetails(crewId).catch(() => []), // 6
    getWatchkeepingCertificates(crewId).catch(() => []), // 7
    getNextOfKin(crewId).catch(() => null),     // 8
    getCourseCertificates(crewId).catch(() => []), // 9
    getSeaServices(crewId).catch(() => []),     // 10
    getAdditionalDetails(crewId).catch(() => null), // 11
    getFlagDocuments(crewId).catch(() => []),   // 12
  ])
    .then(([
      crewRes,
      rankList,
      docRes,
      files,
      caList,
      cList,
      acad,
      watch,
      kin,
      courses,
      sea,
      other,
      flags,
    ]) => {
      setCrew(crewRes)
      setDocForm(docRes)
      setDocFiles(files)

      // rank map
      const rm: Record<number, string> = {}
      rankList.forEach((r) => (rm[r.id] = r.rank))
      setRanks(rankList)
      setRankMap(rm)
      setFlagDocs(flags || [])

      // --- NEW: build CGA name map from BOTH sources ---
  const cgaMap: Record<number, string> = {}

  // Source A: /company-group-admins (works in superadmin)
  caList.forEach((cga) => {
    if (cga?.id != null) cgaMap[cga.id] = cga.name || String(cga.id)
  })

  // Source B: companies list with cga embedded (works in company login)
  cList.forEach((co) => {
    const id = co?.cga?.id
    const name = co?.cga?.name
    if (id != null && name) cgaMap[id] = name
  })

  setCgaNameMap(cgaMap)

      // keep your existing company map for “Sub Company (Company Admin)”
  const cm: Record<number, string> = {}
  cList.forEach((co) => (cm[co.id] = co.name || co.username || String(co.id)))
  setCompanyMap(cm)

      // already-present tabs
      setAcademicRows(acad || [])
      setWatchRows(watch || [])
      setKinRow(kin)

      // NEW tabs 6/7/8
      setCourseRows(courses || [])
      setSeaRows(sea || [])
      setOtherRow(other)
    })
    .finally(() => setLoading(false))
}, [isOpen, crewId])

  /** ---------- doc files (by slot) ---------- */
const bySlot = useMemo(() => {
  const m = new Map<DocumentSlot, CrewDocument>();
  docFiles.forEach((d) => {
    if (d?.slot) m.set(d.slot as DocumentSlot, d);
  });
  return m;
}, [docFiles]);

const hasDoc = (slot: DocumentSlot) => !!bySlot.get(slot)?.id;

const renderViewBtn = (label: TemplateLabel, slot: DocumentSlot) =>
  hasDoc(slot) ? (
    <button className="btn btn-sm btn-info" onClick={() => openPreview(slot, label)}>
      View
    </button>
  ) : (
    <span>-</span>
  );

/** ---------- viewer ---------- */
const closeViewer = () => {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
  }
  setViewer({ open: false, url: null, title: '', mime: undefined });
};

const openPreview = async (slot: DocumentSlot, title: string) => {
  if (!crewId) return;
  const doc = bySlot.get(slot);
  if (!doc?.id) return;
  try {
    const blob = await fetchCrewDocumentBlob(crewId, doc.id);
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    setViewer({ open: true, url, title, mime: blob.type || undefined });
  } catch (e) {
    console.error('Preview failed', e);
  }
};

 const openFlagPreview = async (doc: CrewFlagDocument, title: string) => {
  if (!crewId || !doc?.id) return
  try {
    const blob = await fetchFlagDocumentBlob(crewId, doc.id)
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    setViewer({open: true, url, title, mime: blob.type || undefined})
  } catch (e) {
    console.error('Flag preview failed', e)
  }
}
 

const openWatchPreview = async (row: WatchkeepingCertificateResponse) => {
  if (!crewId || !row?.id) return
  try {
    const blob = await fetchWatchkeepingFileBlob(crewId, row.id)
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    setViewer({
      open: true,
      url,
      title: row.certificateDetails || 'Watchkeeping Certificate',
      mime: blob.type || undefined,
    })
  } catch (e) {
    console.error('Watchkeeping preview failed', e)
  }
}

const openCoursePreview = async (row: CourseCertificateResponse) => {
  if (!row?.id) return
  try {
    const blob = await fetchCourseCertificateFileBlob(row.id)
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    setViewer({
      open: true,
      url,
      title: row.certificateName || 'Course Certificate',
      mime: blob.type || undefined,
    })
  } catch (e) {
    console.error('Course preview failed', e)
  }
}

  /** ---------- export PDF ---------- */
  const handleDownloadPDF = () => {
    if (!contentRef.current) return
    const options = {
      margin: 0.5,
      filename: `${crew?.name || 'crew-details'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
    }
    html2pdf().set(options).from(contentRef.current).save()
  }

  if (!isOpen || !crewId) return null

  const presentRankName =
    rankMap[(crew?.presentRankId as number) ?? crew?.rankId ?? -1] ?? '-'
  const appliedRankName =
    crew?.rankAppliedForId != null ? rankMap[crew.rankAppliedForId] ?? '-' : '-'

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '90rem' }}
        >
          <div className="custom-modal-header d-flex justify-content-between align-items-center">
            <h5 className="m-0">View Crew Details</h5>
            <div className="d-flex gap-2 align-items-center">
              <button className="btn btn-sm btn-light" onClick={handleDownloadPDF}>
                Download PDF
              </button>
              <button className="close-btn" onClick={onClose}>
                <KTSVG path="/media/map/x.svg" className="svg-icon-2x" />
              </button>
            </div>
          </div>

          <Modal.Body style={{ maxHeight: '75vh', overflowY: 'auto' }}>
            <div ref={contentRef} className="custom-modal-body">
              {/* Loading state */}
              {loading && (
                <div className="d-flex align-items-center gap-3 alert alert-info">
                  <div className="spinner-border spinner-border-sm" role="status" />
                  <span>Loading crew details…</span>
                </div>
              )}

              {!loading && !crew && (
                <div className="alert alert-danger">Failed to load crew details.</div>
              )}

              {/* ------------------ PERSONAL (tabs: Personal Data) ------------------ */}
              {crew && (
                <>
                  <h5 className="mb-3">Personal Data</h5>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Present Rank</label>
                      <p>{presentRankName}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Rank Applied For</label>
                      <p>{appliedRankName}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Family Name</label>
                      <p>{crew.familyName ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Tel No</label>
                      <p>{crew.telNo ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Full Name</label>
                      <p>{crew.name ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Mobile No</label>
                      <p>{crew.contactNumber ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Email Id</label>
                      <p>{crew.email ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Alternate Mobile No</label>
                      <p>{crew.alternateMobNo ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Date of Birth</label>
                      <p>{formatDate(crew.dateOfBirth)}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Skype Id</label>
                      <p>{crew.skypeId ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Nationality</label>
                      <p>{crew.nationality ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Place of Birth</label>
                      <p>{crew.placeOfBirth ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Date of Availability</label>
                      <p>{formatDate(crew.dateOfAvailability)}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Marital Status</label>
                      <p>{crew.maritalStatus ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Department</label>
                      <p>{crew.department ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Willing to Accept Lower Rank</label>
                      <p>{formatBoolean(crew.willingToAcceptLowerRank)}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Boiler Suit Size</label>
                      <p>{crew.boilerSuitSize ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Height (cm)</label>
                      <p>{crew.heightCms ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Weight (kg)</label>
                      <p>{crew.weightKgs ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">BMI Index</label>
                      <p>{crew.bmiIndex ?? '-'}</p>
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Blood Group</label>
                      <p>{crew.bloodGroup ?? '-'}</p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Shoe Size</label>
                      <p>{crew.shoeSize ?? '-'}</p>
                    </div>

                    <div className="col-12 mb-3">
                      <label className="modal_label">Address</label>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{crew.address ?? '-'}</p>
                    </div>

                    {/* Company mappings (best effort) */}
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Company</label>
                      <p>
                        {crew.companyGroupAdminId != null
                          ? (cgaNameMap[crew.companyGroupAdminId] ?? `ID: ${crew.companyGroupAdminId}`)
                            : '-'}
                      </p>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="modal_label">Sub Company</label>
                      <p>
                        {crew.companyAdminId != null
                          ? companyMap[crew.companyAdminId] ?? `ID: ${crew.companyAdminId}`
                          : '-'}
                      </p>
                    </div>

                    {/* Optional notes */}
                    {crew.notes && (
                      <div className="col-12 mb-2">
                        <label className="modal_label">Notes</label>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{crew.notes}</p>
                      </div>
                    )}
                  </div>

                  <hr className="my-5" />

                  {/* ------------------ DOCUMENTS (tabs: Documents) ------------------ */}
                  <h5 className="mb-3">Identity Documents</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Documents</th>
                          <th>Number</th>
                          <th>Date of Issue</th>
                          <th>Place of Issue</th>
                          <th>Date of Expiry</th>
                          <th>ECNR</th>
                          <th>Minimum 4 Blank Pages</th>
                          <th>Union Membership No</th>
                          <th>File</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>CV</strong></td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>
                            {renderViewBtn('CV', 'CV')}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Passport</strong></td>
                          <td>{docForm?.passportNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.passportIssueDate)}</td>
                          <td>{docForm?.passportPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.passportExpiryDate)}</td>
                          <td>{formatBoolean(docForm?.passportEcnr)}</td>
                          <td>{formatBoolean(docForm?.passportMin4BlankPages)}</td>
                          <td>-</td>
                          <td>
                            {renderViewBtn('Passport', 'PASSPORT')}

                          </td>
                        </tr>

                        <tr>
                          <td><strong>National CDC</strong></td>
                          <td>{docForm?.cdcNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.cdcIssueDate)}</td>
                          <td>{docForm?.cdcPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.cdcExpiryDate)}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>{docForm?.unionMembershipNo ?? '-'}</td>
                          <td>
                            {renderViewBtn('National CDC', 'NATIONAL_CDC')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>Biometric SID</strong></td>
                          <td>{docForm?.sidNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.sidIssueDate)}</td>
                          <td>{docForm?.sidPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.sidExpiryDate)}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>
                            {renderViewBtn('Biometric SID', 'BIOMETRIC_SID')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>Schengen Visa</strong></td>
                          <td>{docForm?.schengenVisaNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.schengenVisaIssueDate)}</td>
                          <td>{docForm?.schengenVisaPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.schengenVisaExpiryDate)}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>
                            {renderViewBtn('Schengen Visa', 'SCHENGEN_VISA')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>U.S. VISA C1/D</strong></td>
                          <td>{docForm?.usVisaC1dNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.usVisaC1dIssueDate)}</td>
                          <td>{docForm?.usVisaC1dPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.usVisaC1dExpiryDate)}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>-</td>
                          <td>
                            {renderViewBtn('U.S. VISA C1/D', 'US_VISA_C1D')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h5 className="mt-5 mb-3">Professional Certificates</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Documents</th>
                          <th>Grade/Level</th>
                          <th>Number</th>
                          <th>Issuing Authority</th>
                          <th>Date of Issue</th>
                          <th>Date of Expiry</th>
                          <th>File</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>National Certificate of Competency (COC)</strong></td>
                          <td>{docForm?.cocGradeLevel ?? '-'}</td>
                          <td>{docForm?.cocNumber ?? '-'}</td>
                          <td>{docForm?.cocIssuingAuthority ?? '-'}</td>
                          <td>{formatDate(docForm?.cocIssueDate)}</td>
                          <td>{formatDate(docForm?.cocExpiryDate)}</td>
                          <td>
                            {renderViewBtn('National Certificate of Competency (COC)', 'COC')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>GMDSS</strong></td>
                          <td>{docForm?.gmdssGradeLevel ?? '-'}</td>
                          <td>{docForm?.gmdssNumber ?? '-'}</td>
                          <td>{docForm?.gmdssIssuingAuthority ?? '-'}</td>
                          <td>{formatDate(docForm?.gmdssIssueDate)}</td>
                          <td>{formatDate(docForm?.gmdssExpiryDate)}</td>
                          <td>
                            {renderViewBtn('GMDSS', 'GMDSS')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>GMDSS Endorsement</strong></td>
                          <td>{docForm?.gmdssEndorsementGradeLevel ?? '-'}</td>
                          <td>{docForm?.gmdssEndorsementNumber ?? '-'}</td>
                          <td>{docForm?.gmdssEndorsementIssuingAuthority ?? '-'}</td>
                          <td>{formatDate(docForm?.gmdssEndorsementIssueDate)}</td>
                          <td>{formatDate(docForm?.gmdssEndorsementExpiryDate)}</td>
                          <td>
                            {renderViewBtn('GMDSS Endorsement', 'GMDSS_ENDORSEMENT')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>Indos No</strong></td>
                          <td>{docForm?.indosGradeLevel ?? '-'}</td>
                          <td>{docForm?.indosNumber ?? '-'}</td>
                          <td>{docForm?.indosIssuingAuthority ?? '-'}</td>
                          <td>{formatDate(docForm?.indosIssueDate)}</td>
                          <td>{formatDate(docForm?.indosExpiryDate)}</td>
                          <td>
                            {renderViewBtn('Indos No', 'INDOS')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>Others</strong></td>
                          <td>{docForm?.otherDocGradeLevel ?? '-'}</td>
                          <td>{docForm?.otherDocNumber ?? '-'}</td>
                          <td>{docForm?.otherDocIssuingAuthority ?? '-'}</td>
                          <td>{formatDate(docForm?.otherDocIssueDate)}</td>
                          <td>{formatDate(docForm?.otherDocExpiryDate)}</td>
                          <td>
                            {renderViewBtn('Others', 'OTHERS')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h5 className="mt-5 mb-3">Dangerous Cargo Endorsements</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th>Dangerous Cargo Endorsements</th>
                          <th>Nationality</th>
                          <th>Grade/Level I/II</th>
                          <th>Number</th>
                          <th>Date of Issue</th>
                          <th>Place of Issue</th>
                          <th>Date of Expiry</th>
                          <th>File</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>Basic/Adv Oil Endorsement</strong></td>
                          <td>{docForm?.oilEndorsementNationality ?? '-'}</td>
                          <td>{docForm?.oilEndorsementGradeLevel ?? '-'}</td>
                          <td>{docForm?.oilEndorsementNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.oilEndorsementIssueDate)}</td>
                          <td>{docForm?.oilEndorsementPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.oilEndorsementExpiryDate)}</td>
                          <td>
                            {renderViewBtn('Basic/Adv Oil Endorsement', 'OIL_ENDORSEMENT')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>Basic/Adv Chem Endorsement</strong></td>
                          <td>{docForm?.chemEndorsementNationality ?? '-'}</td>
                          <td>{docForm?.chemEndorsementGradeLevel ?? '-'}</td>
                          <td>{docForm?.chemEndorsementNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.chemEndorsementIssueDate)}</td>
                          <td>{docForm?.chemEndorsementPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.chemEndorsementExpiryDate)}</td>
                          <td>
                            {renderViewBtn('Basic/Adv Chem Endorsement', 'CHEM_ENDORSEMENT')}
                          </td>
                        </tr>

                        <tr>
                          <td><strong>Basic/Adv Gas Endorsement</strong></td>
                          <td>{docForm?.gasEndorsementNationality ?? '-'}</td>
                          <td>{docForm?.gasEndorsementGradeLevel ?? '-'}</td>
                          <td>{docForm?.gasEndorsementNumber ?? '-'}</td>
                          <td>{formatDate(docForm?.gasEndorsementIssueDate)}</td>
                          <td>{docForm?.gasEndorsementPlaceOfIssue ?? '-'}</td>
                          <td>{formatDate(docForm?.gasEndorsementExpiryDate)}</td>
                          <td>
                            {renderViewBtn('Basic/Adv Gas Endorsement', 'GAS_ENDORSEMENT')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ------------------------------------------------------------------ */}
{/* TAB 3 — Academic Background (view only)                            */}
{/* ------------------------------------------------------------------ */}
<hr className="my-5" />
<h5 className="mb-3">Academic Background</h5>
<div className="table-responsive">
  <table className="table table-bordered">
    <thead className="table-light">
      <tr>
        <th>Qualification</th>
        <th>Name of Institution</th>
        <th>Board/University</th>
        <th>Date of Passing</th>
        <th>Grade/Percentage</th>
      </tr>
    </thead>
    <tbody>
      {academicRows.length === 0 ? (
        <tr><td colSpan={5} className="text-center text-muted">No academic records.</td></tr>
      ) : (
        academicRows.map((row, idx) => (
          <tr key={idx}>
            <td>{row.qualification || '-'}</td>
            <td>{row.institutionName || '-'}</td>
            <td>{row.boardOrUniversity || '-'}</td>
            <td>{formatDate(row.dateOfPassing)}</td>
            <td>{row.gradeOrPercentage || '-'}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

{/* ------------------------------------------------------------------ */}
{/* TAB 4 — Watch keeping certificates (For Rating only)               */}
{/* ------------------------------------------------------------------ */}
<hr className="my-5" />
<h5 className="mb-3">
  Watch keeping certificates <span className="fw-normal">(For <strong>Rating</strong> only)</span>
</h5>
<div className="table-responsive">
  <table className="table table-bordered">
    <thead className="table-light">
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
      {WATCHKEEPING_ORDER.map((label, idx) => {
        const row = watchRows.find((w) => w.certificateDetails === label)
        return (
          <tr key={idx}>
            <td>{label}</td>
            <td>{row?.certificateNo || '-'}</td>
            <td>{formatDate(row?.dateOfIssue)}</td>
            <td>{row?.placeOfIssue || '-'}</td>
            <td>{formatDate(row?.validUntil)}</td>
            <td>
              {row?.filePath ? (
                <button
                  type="button"
                  className="btn btn-sm btn-info"
                  onClick={() => openWatchPreview(row)}
                >
                  View
                </button>
              ) : (
                <span>-</span>
              )}
            </td>
          </tr>
        )
      })}
      {watchRows.length === 0 && (
                <tr>
          <td colSpan={6} className="text-center text-muted">
            No watchkeeping certificates.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

{/* ------------------------------------------------------------------ */}
{/* TAB 5 — Next of Kin Details (view only)                            */}
{/* ------------------------------------------------------------------ */}
<hr className="my-5" />
<h5 className="mb-3">Next of Kin Details</h5>
{!kinRow ? (
  <div className="text-muted">No next of kin details.</div>
) : (
  <div className="row">
    <div className="col-md-6 mb-3">
      <label className="modal_label">Civil Status</label>
      <p>{kinRow.civilStatus ?? '-'}</p>
    </div>
    <div className="col-md-6 mb-3">
      <label className="modal_label">Full Name of Next of Kin</label>
      <p>{kinRow.fullName ?? '-'}</p>
    </div>
    <div className="col-md-6 mb-3">
      <label className="modal_label">Relationship</label>
      <p>{kinRow.relationship ?? '-'}</p>
    </div>
    <div className="col-12 mb-3">
      <label className="modal_label">Address of Next of Kin</label>
      <p style={{ whiteSpace: 'pre-wrap' }}>{kinRow.address ?? '-'}</p>
    </div>
    <div className="col-md-4 mb-3">
      <label className="modal_label">Pin Code</label>
      <p>{kinRow.pinCode ?? '-'}</p>
    </div>
    <div className="col-md-4 mb-3">
      <label className="modal_label">Phone STD Code</label>
      <p>{kinRow.phoneStdCode ?? '-'}</p>
    </div>
    <div className="col-md-4 mb-3">
      <label className="modal_label">Phone Number</label>
      <p>{kinRow.phoneNumber ?? '-'}</p>
    </div>
  </div>
)}



{/* ------------------------------------------------------------------ */}
{/* TAB 6 — Courses & Certificates                                     */}
{/* ------------------------------------------------------------------ */}
<hr className="my-5" />
<h5 className="mb-3">Courses & Certificates</h5>
{COURSE_CATEGORIES.map((cat) => (
  <div key={cat.label} className="mb-4">
    <h6 className="fw-bold mb-2">{cat.label}</h6>
    <div className="table-responsive">
      <table className="table table-bordered">
        <thead className="table-light">
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
          {cat.courses.map((courseName) => {
            const row = courseMap.get(courseName)
            return (
              <tr key={courseName}>
                <td>{courseName}</td>
                <td>{row?.certificateNumber || '-'}</td>
                <td>{formatDate(row?.dateOfIssue)}</td>
                <td>{formatDate(row?.dateOfExpiry)}</td>
                <td>{row?.issuedBy || '-'}</td>
                <td>
                  {row?.filePath ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-info"
                      onClick={() => openCoursePreview(row)}
                    >
                      View
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
))}

{/* ------------------------------------------------------------------ */}
{/* TAB 7 — Previous Sea Service                                       */}
{/* ------------------------------------------------------------------ */}
<hr className="my-5" />
<h5 className="mb-3">
  Previous Sea Service
  <small className="fw-normal d-block mt-1">
    (All sea service details from Cadets/Jr Level. List recent vessel first)
  </small>
</h5>
<div className="table-responsive">
  <table
    className="table table-bordered align-middle text-center"
    style={{minWidth: '1200px'}}
  >
    <thead className="table-light">
      <tr>
        <th>Sr. No.</th>
        <th>Company Name</th>
        <th>Vessel Name</th>
        <th>Type of Vessel/ Flag</th>
        <th>GRT/DWT</th>
        <th>Engine Type</th>
        <th>KWT/ ME BHP</th>
        <th>Rank</th>
        <th>From</th>
        <th>To</th>
        <th>Total Months/Days</th>
        <th>Reason for S/OFF</th>
      </tr>
    </thead>
    <tbody>
      {seaSorted.length === 0 ? (
        <tr>
          <td colSpan={12} className="text-center text-muted">
            No sea service records.
          </td>
        </tr>
      ) : (
        seaSorted.map((s, idx) => (
          <tr key={s.id ?? idx}>
            <td>{s.serialNo ?? idx + 1}</td>
            <td>{s.companyName || '-'}</td>
            <td>{s.vesselName || '-'}</td>
            <td>{s.typeOfVesselFlag || '-'}</td>
            <td>{s.grtdrt || '-'}</td>
            <td>{s.engineType || '-'}</td>
            <td>{s.kwtBhp || '-'}</td>
            <td>{s.rank || '-'}</td>
            <td>{formatDate(s.fromDate)}</td>
            <td>{formatDate(s.toDate)}</td>
            <td>{s.totalMonthsDays || '-'}</td>
            <td>{s.reasonForSignOff || '-'}</td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>


 {/* ------------------------------------------------------------------ */}
                  {/* FLAG DOCUMENTS SECTION                                            */}
                  {/* ------------------------------------------------------------------ */}
                  <hr className="my-5" />
                  <h5 className="mb-3">Flag Documents</h5>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead className="table-light">
                        <tr>
                          <th style={{width: '20%'}}>Flag / Document</th>
                          <th style={{width: '20%'}}>Document Number</th>
                          <th style={{width: '20%'}}>Issue Date</th>
                          <th style={{width: '20%'}}>Expiry Date</th>
                          <th style={{width: '20%'}}>File</th>
                        </tr>
                      </thead>
                      <tbody>
                        {flagDocs.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center text-muted">
                              No flag documents.
                            </td>
                          </tr>
                        )}

                        {FLAG_ORDER.map((flag) => (
                          <React.Fragment key={flag}>
                            <tr
                              className="table-secondary align-middle"
                              style={{borderTop: '2px solid #ccc'}}
                            >
                              <td colSpan={5} className="py-2 bg-light-warning">
                                <span
                                  className="fw-bold text-uppercase badge badge-secondary badge-lg my-2"
                                  style={{letterSpacing: '0.05em'}}
                                >
                                  {FLAG_LABELS[flag]}
                                </span>
                              </td>
                            </tr>

                            {FLAG_DOC_TYPES.map((docType) => {
                              const doc = flagDocs.find(
                                (d) => d.flag === flag && d.docType === docType
                              )

                              if (!doc) {
                                return (
                                  <tr key={`${flag}-${docType}`}>
                                    <td>
                                      <strong>{FLAG_DOC_LABELS[docType]}</strong>
                                    </td>
                                    <td colSpan={3} className="text-muted">
                                      No data
                                    </td>
                                    <td>-</td>
                                  </tr>
                                )
                              }

                              return (
                                <tr key={`${flag}-${docType}`}>
                                  <td>
                                    <strong>{FLAG_DOC_LABELS[docType]}</strong>
                                  </td>
                                  <td>{doc.documentNumber || '-'}</td>
                                  <td>{formatDate(doc.issueDate)}</td>
                                  <td>{formatDate(doc.expiryDate)}</td>
                                  <td>
                                    {doc.filePath ? (
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-info"
                                        onClick={() =>
                                          openFlagPreview(
                                            doc,
                                            `${FLAG_LABELS[doc.flag]} - ${FLAG_DOC_LABELS[doc.docType]}`
                                          )
                                        }
                                      >
                                        View
                                      </button>
                                    ) : (
                                      <span>-</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>


{/* ------------------ OTHER DETAILS (tab 8) ------------------ */}
<h5 className="mb-3 mt-6">Additional Information</h5>

{/* Pump Experience */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">PUMP EXPERIENCE</h6>
  <div className="row">
    <div className="col-md-6 mb-2">
      <label className="modal_label">FRAMO (in months)</label>
      <p>{otherRow?.pumpExperienceFramoMonths ?? '-'}</p>
    </div>
    <div className="col-md-6 mb-2">
      <label className="modal_label">COP (in months)</label>
      <p>{otherRow?.pumpExperienceCopMonths ?? '-'}</p>
    </div>
  </div>
</div>

{/* Vessel Experience */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">VESSEL EXPERIENCE</h6>
  <table className="table table-bordered">
    <thead className="table-light">
      <tr>
        <th>Have you been on board vessels during</th>
        <th>Response</th>
        <th>Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Drydocking</td>
        <td>{formatBoolean(otherRow?.drydockingExperience)}</td>
        <td>{otherRow?.drydockingExperience ? (otherRow?.drydockingRank || '-') : '-'}</td>
      </tr>
      <tr>
        <td>New Construction</td>
        <td>{formatBoolean(otherRow?.newConstructionExperience)}</td>
        <td>{otherRow?.newConstructionExperience ? (otherRow?.newConstructionRank || '-') : '-'}</td>
      </tr>
    </tbody>
  </table>
</div>

{/* Other Questions */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">OTHER QUESTIONS</h6>
  <div className="table-responsive">
    <table className="table table-bordered">
      <thead className="table-light">
        <tr>
          <th>Question</th>
          <th>Response</th>
          <th>Details (if Yes)</th>
        </tr>
      </thead>
      <tbody>
        {OTHER_QS.map((q, i) => (
          <tr key={i}>
            <td style={{ maxWidth: 520 }}>{q.label}</td>
            <td>{formatBoolean(otherRow?.[q.flag])}</td>
            <td>
              {otherRow?.[q.flag]
                ? (otherRow?.[q.details] as string | null) || '-'
                : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

{/* Company Awareness */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">COMPANY AWARENESS</h6>
  <div className="row">
    <div className="col-md-6 mb-2">
      <label className="modal_label">Referral Source</label>
      <p>
        {otherRow?.referralSource
          ? REFERRAL_LABELS[otherRow.referralSource as string] || otherRow.referralSource
          : '-'}
      </p>
    </div>
    <div className="col-md-6 mb-2">
      <label className="modal_label">Details</label>
      <p>{otherRow?.referralSource ? (otherRow?.referralDetails || '-') : '-'}</p>
    </div>
  </div>
</div>

{/* References */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">Reference</h6>
  {otherRow?.hasReferenceData ? (
    parsedReferences.length ? (
      <div className="table-responsive">
        <table className="table table-bordered">
          <thead className="table-light">
            <tr>
              <th>Sr. No</th>
              <th>Name of the company</th>
              <th>PIC</th>
              <th>Designation</th>
              <th>Phone No</th>
            </tr>
          </thead>
          <tbody>
            {parsedReferences.map((r, idx) => (
              <tr key={idx}>
                <td>{r.srNo ?? idx + 1}</td>
                <td>{r.companyName || '-'}</td>
                <td>{r.pic || '-'}</td>
                <td>{r.designation || '-'}</td>
                <td>{r.phoneNo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-muted">Enabled but no rows provided.</p>
    )
  ) : (
    <p className="text-muted">Not provided.</p>
  )}
</div>

{/* Declaration */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">DECLARATION BY THE APPLICANT</h6>
  <div className="row">
    <div className="col-md-6 mb-2">
      <label className="modal_label">
        Medical examination (incl. Drug/Alcohol test) is a condition of employment
      </label>
      <p>{formatBoolean(otherRow?.declarationMedicalExam)}</p>
    </div>
    <div className="col-md-6 mb-2">
      <label className="modal_label">
        Company medical officer’s decision is final
      </label>
      <p>{formatBoolean(otherRow?.declarationMedicalDecision)}</p>
    </div>

    <div className="col-md-6 mb-2">
      <label className="modal_label">No criminal/police investigations in progress</label>
      <p>{formatBoolean(otherRow?.declarationNoCriminal)}</p>
    </div>
    <div className="col-md-6 mb-2">
      <label className="modal_label">Travel documents valid and in order</label>
      <p>{formatBoolean(otherRow?.declarationDocumentsValid)}</p>
    </div>

    <div className="col-md-6 mb-2">
      <label className="modal_label">Presently employed elsewhere</label>
      <p>{formatBoolean(otherRow?.declarationNotEmployed)}</p>
    </div>

    <div className="col-md-6 mb-2">
      <label className="modal_label">Aware that company has no agents in India</label>
      <p>{formatBoolean(otherRow?.declarationNoAgents)}</p>
    </div>
    <div className="col-md-6 mb-2">
      <label className="modal_label">Available to report on/after</label>
      <p>{formatDate(otherRow?.availabilityDate)}</p>
    </div>
  </div>
</div>

{/* Applicant Details */}
<div className="mb-4">
  <h6 className="fw-bold mb-2">APPLICANT DETAILS</h6>
  <div className="row">
    <div className="col-md-6 mb-2">
      <label className="modal_label">Name of Applicant</label>
      <p>{otherRow?.applicantName || '-'}</p>
    </div>
    <div className="col-md-6 mb-2">
      <label className="modal_label">Date</label>
      <p>{formatDate(otherRow?.applicantDate)}</p>
    </div>
  </div>
</div>


                </>
              )}
            </div>
          </Modal.Body>
        </div>
      </div>

      {/* Preview Modal */}
      {viewer.open && (
        <div className="modal fade show" style={{ display: 'block' }} onClick={closeViewer}>
          <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title m-0">{viewer.title}</h5>
                <button type="button" className="btn-close" onClick={closeViewer} />
              </div>
              <div className="modal-body" style={{ height: '80vh' }}>
                {viewer.mime?.startsWith('image/')
                  ? <img src={viewer.url ?? ''} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                  : <iframe src={viewer.url ?? ''} width="100%" height="100%" title="Document preview" />}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ViewCrewModal
