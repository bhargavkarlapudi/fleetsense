import React, {useEffect, useRef, useState} from 'react'
import {getVesselList} from '../../Management/core/_requests'
import {toast} from 'react-toastify'
import {Vessel} from '../../operations/core/_models'
import {
  getRanks,
  createCrew,
  getCompanyAdminList,
  getCompanyList,
  createCrewDocument,
  updateCrewDocument,
  getCrewDocument,
  updateCrew,
  getAcademicDetails,
  createAcademicDetails,
  updateAcademicDetails,
  getWatchkeepingCertificates,
  createWatchkeepingCertificate,
  updateWatchkeepingCertificate,
  getNextOfKin,
  createNextOfKin,
  updateNextOfKin,
  getCourseCertificates,
  createCourseCertificate,
  updateCourseCertificate,
  getSeaServices,
  createSeaService,
  updateSeaService,
  deleteSeaService,
  getAdditionalDetails,
  updateAdditionalDetails,
  createAdditionalDetails,
  getCrewUnit,
} from '../core/_requests'
import {
  Rank,
  CompanyAdmin,
  Company,
  CrewDocumentResponse,
  CrewDocumentForm,
  AcademicQualificationRequest,
  AcademicQualificationResponse,
  WatchkeepingCertificateRequest,
  WatchkeepingCertificateResponse,
  NextOfKinRequest,
  NextOfKinResponse,
  CourseCertificate,
  CourseCertificateResponse,
  SeaServiceRequest,
  SeaServiceResponse,
  AdditionalDetailsResponse,
  AdditionalDetailsRequest,
  Reference,
} from '../core/_models'

import {useAuth} from '../../auth'
import {KTSVG} from '../../../../_metronic/helpers'
import PersonalData from './ApplicationForms/PersonalData'
import AcademicBackground from './ApplicationForms/AcademicBackground'
import CoursesCertificates from './ApplicationForms/CoursesCertificates'
import Documents from './ApplicationForms/Documents'
import NextOfKin from './ApplicationForms/NextOfKin'
import OtherDetails from './ApplicationForms/OtherDetails'
import SeaService from './ApplicationForms/SeaService'
import WatchkeepingCertificates from './ApplicationForms/WatchkeepingCertificates'
import FlagDocuments from './ApplicationForms/Flag'
import { CrewFlagDocument } from '../core/_models'
import { getFlagDocuments } from '../core/_requests'

// Top of file (after imports)
const TABS = [
  'personal',
  'documents',
  'academic',
  'watchkeeping',
  'kin',
  'courses',
  'seaService',
  'flagDocs',
  'other',
] as const
type TabKey = typeof TABS[number]
const DRAFT_KEY = `editCrewWizardDraft_v1_${/* protects per crew */ ''}` // <== will set in useEffect

const nextTab = (current: TabKey): TabKey => {
  const i = TABS.indexOf(current)
  return TABS[Math.min(i + 1, TABS.length - 1)]
}
const prevTab = (current: TabKey): TabKey => {
  const i = TABS.indexOf(current)
  return TABS[Math.max(i - 1, 0)]
}
//watch keeping certs
const certificateDetails = [
  'Deck Watch keeping Regulation II/4',
  'Able Seafarer Deck Regulation II/5 (COP)',
  'Engine Room Watch keeping III/4',
  'Able Seafarer Engine Regulation III/5 (COP)',
]
//courses and certificates
const courseCertificateDetails = [
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
  'Oil Tanker Familiarization (OTFC)/Advance Training for Cargo operation(TASCO)',
  'Chemical Tanker Familiarization (CTFC)',
  'Gas Familiarization (GTFC)',
  'Chemical Tanker Safety (CHEMCO)',
  'Gas Tanker Safety (GASCO)',
  'Bridge Team Management (BTM)/Bridge Resource Management (BRM)',
  'Engine Room Simulator (ERS)',
  'ECDIS-Generic',
  'ECDIS-Type Specific',
  'Any Value Added Course/Company Specific Course',
  'Yellow Fever',
  'Refresher and Updating Training (Up gradation course) for Deck Officers',
  'Refresher and Updating Training for Engineer Officers',
  'Add. Training if any',
]

const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

interface Props {
  isOpen: boolean
  onClose: () => void
  crewId: number // <== NEW: pass crewId from parent
  onUpdated?: () => void // <== optional callback after successful save
}

interface Certification {
  documentName: string
  file: File | null
}

const getCategoryForCourse = (certificateName: string): string => {
  if (
    [
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
    ].includes(certificateName)
  ) {
    return 'STCW Certificates'
  } else if (
    [
      'Oil Tanker Familiarization (OTFC)/Advance Training for Cargo operation(TASCO)',
      'Chemical Tanker Familiarization (CTFC)',
      'Gas Familiarization (GTFC)',
      'Chemical Tanker Safety (CHEMCO)',
      'Gas Tanker Safety (GASCO)',
    ].includes(certificateName)
  ) {
    return 'Tanker Courses'
  } else if (
    [
      'Bridge Team Management (BTM)/Bridge Resource Management (BRM)',
      'Engine Room Simulator (ERS)',
      'ECDIS-Generic',
      'ECDIS-Type Specific',
      'Any Value Added Course/Company Specific Course',
      'Yellow Fever',
    ].includes(certificateName)
  ) {
    return 'Navigation & Main Engine Training'
  } else {
    return 'Revalidation Course'
  }
}

const EditCrewModal: React.FC<Props> = ({onClose, isOpen, crewId: crewIdProp, onUpdated}) => {
  // <==
  const [activeTab, setActiveTab] = useState('personal')
  const [selectedVessel, setSelectedVessel] = useState<Vessel | null>(null)
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null)
  const [nationality, setNationality] = useState('')
  const [department, setDepartment] = useState('')
  const [ranks, setRanks] = useState<Rank[]>([])
  // const [selectedRankId, setSelectedRankId] = useState<number | ''>('')
  const [presentRankId, setPresentRankId] = useState<number | ''>('')
  const [rankAppliedForId, setRankAppliedForId] = useState<number | ''>('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesbyAdmin, setCompaniesByAdmin] = useState<Company[]>([])
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [certifications, setCertifications] = useState<Certification[]>([
    {documentName: '', file: null},
  ])
  const [documents, setDocuments] = useState<Certification[]>([{documentName: '', file: null}])
  const [academicBackgrounds, setAcademicBackgrounds] = useState<AcademicQualificationRequest[]>([
    {
      qualification: '',
      institutionName: '',
      boardOrUniversity: '',
      dateOfPassing: '',
      gradeOrPercentage: '',
    },
  ])
  const [watchkeepingCertificates, setWatchkeepingCertificates] = useState<
    WatchkeepingCertificateRequest[]
  >(
    certificateDetails.map((detail) => ({
      certificateDetails: detail,
      certificateNo: '',
      dateOfIssue: '',
      placeOfIssue: '',
      validUntil: '',
    }))
  )
  const [nextOfKin, setNextOfKin] = useState<NextOfKinRequest>({
    crewId: 0,
    civilStatus: null,
    fullName: '',
    relationship: '',
    address: '',
    pinCode: '',
    phoneStdCode: '',
    phoneNumber: '',
  })
  const [courseCertificates, setCourseCertificates] = useState<CourseCertificate[]>(
    courseCertificateDetails.map((certificateName) => ({
      certificateName,
      category: getCategoryForCourse(certificateName),
      certificateNumber: '',
      dateOfIssue: '',
      dateOfExpiry: '',
      issuedBy: '',
    }))
  )
  const [seaServices, setSeaServices] = useState<SeaServiceRequest[]>([
    {
      id: undefined,
      serialNo: 1,
      companyName: '',
      vesselName: '',
      typeOfVesselFlag: '',
      grtdrt: '',
      engineType: '',
      kwtBhp: '',
      rank: '',
      fromDate: '',
      toDate: '',
      totalMonthsDays: '',
      reasonForSignOff: '',
    },
  ])
  const [additionalDetails, setAdditionalDetails] = useState<AdditionalDetailsRequest>({
    crewId: 0,
    criminalCaseInvolved: false,
    criminalCaseDetails: '',
    certificateSuspendedRevoked: false,
    certificateSuspendedRevokedDetails: '',
    hasMedicalConditions: false,
    medicalConditionsDetails: '',
    habitualUseDrugsAlcohol: false,
    habitualUseDetails: '',
    workedWithMultinational: false,
    multinationalNationalities: '',
    referralSource: null,
    referralDetails: '',
    pumpExperienceFramoMonths: null,
    pumpExperienceCopMonths: null,
    drydockingExperience: false,
    drydockingRank: '',
    newConstructionExperience: false,
    newConstructionRank: '',
    incidentInvolvement: false,
    incidentDetails: '',
    courtOfEnquiryInvolvement: false,
    courtOfEnquiryDetails: '',
    references: '[]',
    declarationMedicalExam: false,
    declarationMedicalDecision: false,
    declarationNoCriminal: false,
    declarationDocumentsValid: false,
    declarationNotEmployed: false,
    declarationNoAgents: false,
    availabilityDate: '',
    applicantName: '',
    applicantDate: '',
    hasReferenceData: false,
  })
  const [references, setReferences] = useState<Reference[]>([
    {srNo: 1, companyName: '', pic: '', designation: '', phoneNo: ''},
  ])

  const [familyName, setFamilyName] = useState('')
  const [telNo, setTelNo] = useState('')
  const [alternateMobNo, setAlternateMobNo] = useState('')
  const [skypeId, setSkypeId] = useState('')
  const [maritalStatus, setMaritalStatus] = useState('')
  const [heightCms, setHeight] = useState<number>(0)
  const [weightKgs, setWeight] = useState<number>(0)
  const [bmiIndex, setBmiIndex] = useState<number>(0)
  const [willingToAcceptLowerRank, setWillingToAcceptLowerRank] = useState<boolean>(false)
  const [boilerSuitSize, setBoilerSuitSize] = useState('')
  const [shoeSize, setShoeSize] = useState('')
  const [address, setAddress] = useState('')
  const [placeOfBirth, setPlaceOfBirth] = useState('')
  const [dateOfAvailability, setDateOfAvailability] = useState<Date | null>(null)
  const [crewId, setCrewId] = useState<number | null>(null)
  const [documentForm, setDocumentForm] = useState<CrewDocumentForm>({})
  const [existingDocument, setExistingDocument] = useState<CrewDocumentResponse | null>(null)
  const [existingAcademicDetails, setExistingAcademicDetails] = useState<
    AcademicQualificationResponse[]
  >([])
  const [existingWatchkeepingCertificates, setExistingWatchkeepingCertificates] = useState<
    WatchkeepingCertificateResponse[]
  >([])
  const [existingNextOfKin, setExistingNextOfKin] = useState<NextOfKinResponse | null>(null)
  const [existingCourseCertificates, setExistingCourseCertificates] = useState<
    CourseCertificateResponse[]
  >([])
  const [existingSeaServices, setExistingSeaServices] = useState<SeaServiceResponse[]>([])
  const [existingAdditionalDetails, setExistingAdditionalDetails] =
    useState<AdditionalDetailsResponse | null>(null)
  const [existingFlagDocuments, setExistingFlagDocuments] = useState<CrewFlagDocument[] | null>(null)
  const {currentUser} = useAuth()
  const roleEntityId = currentUser?.roleEntityId
  const roleId = currentUser?.role?.id
const companyGroupAdminIdForRole6 = currentUser?.companyGroupAdminId

// === NEW: split Operator (roleId 6) behavior
const operatorActsLikeSuperadmin = roleId === 6 && !companyGroupAdminIdForRole6
const operatorActsLikeGroupAdmin = roleId === 6 && !!companyGroupAdminIdForRole6

  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
  const [selectedCompany, setSelectedCompany] = useState<{id: number; name: string}>({
    id: 0,
    name: '',
  })
  const [selectedCompanyAdmin, setSelectedCompanyAdmin] = useState<{id: number; name: string}>({
    id: 0,
    name: '',
  })

  // state // Track “saved” status and snapshots for dirty-check
  const [savedTabs, setSavedTabs] = useState<Record<TabKey, boolean>>({
    personal: false,
    documents: false,
    academic: false,
    watchkeeping: false,
    kin: false,
    courses: false,
    seaService: false,
    flagDocs: false,   
    other: false,
  })

  const [personalSnapshot, setPersonalSnapshot] = useState<string>('')
  const [documentSnapshot, setDocumentSnapshot] = useState<string>('')
  const [academicSnapshot, setAcademicSnapshot] = useState<string>('')
  const [watchkeepingSnapshot, setWatchkeepingSnapshot] = useState<string>('')
  const [nextOfKinSnapshot, setNextOfKinSnapshot] = useState<string>('')
  const [courseCertificatesSnapshot, setCourseCertificatesSnapshot] = useState<string>(
    JSON.stringify(
      courseCertificateDetails.map((certificateName) => ({
        certificateName,
        category: getCategoryForCourse(certificateName),
        certificateNumber: '',
        dateOfIssue: '',
        dateOfExpiry: '',
        issuedBy: '',
      }))
    )
  )
  const [seaServiceSnapshot, setSeaServiceSnapshot] = useState<string>('')
  const [additionalDetailsSnapshot, setAdditionalDetailsSnapshot] = useState<string>('')

  // Put this near other state:
  const personalForm = React.useMemo(
    () => ({
      name,
      dateOfBirth,
      nationality,
      department,
      contactNumber,
      email,
      presentRankId,
      rankAppliedForId,
      bloodGroup,
      familyName,
      telNo,
      alternateMobNo,
      skypeId,
      maritalStatus,
      heightCms,
      weightKgs,
      bmiIndex,
      willingToAcceptLowerRank,
      boilerSuitSize,
      shoeSize,
      address,
      placeOfBirth,
      dateOfAvailability,
      selectedCompany,
      selectedCompanyAdmin,
    }),
    [
      name,
      dateOfBirth,
      nationality,
      department,
      contactNumber,
      email,
      presentRankId,
      rankAppliedForId,
      bloodGroup,
      familyName,
      telNo,
      alternateMobNo,
      skypeId,
      maritalStatus,
      heightCms,
      weightKgs,
      bmiIndex,
      willingToAcceptLowerRank,
      boilerSuitSize,
      shoeSize,
      address,
      placeOfBirth,
      dateOfAvailability,
      selectedCompany,
      selectedCompanyAdmin,
    ]
  )

  const academicForm = React.useMemo(() => academicBackgrounds, [academicBackgrounds])
  const watchkeepingForm = React.useMemo(() => watchkeepingCertificates, [watchkeepingCertificates])
  const nextOfKinForm = React.useMemo(() => nextOfKin, [nextOfKin])
  const coursesForm = React.useMemo(() => courseCertificates, [courseCertificates])
  const seaServiceForm = React.useMemo(() => seaServices, [seaServices])
  const additionalDetailsForm = React.useMemo(
    () => ({...additionalDetails, references}),
    [additionalDetails, references]
  )

  // ---- Helpers for "Other Details" tab ----
const normalizeAdditional = (
  ad: AdditionalDetailsRequest,
  refs: Reference[]
) => {
  // Normalize nullable → '' and unify references as a JSON string for snapshots
  return {
    ...ad,
    availabilityDate: ad.availabilityDate || '',
    applicantName: ad.applicantName || '',
    applicantDate: ad.applicantDate || '',
    _refsJSON: JSON.stringify(refs ?? []),
  }
}

const focusFirstError = (errs: Record<string, string>) => {
  const firstKey = Object.keys(errs)[0]
  if (!firstKey) return
  const el = document.querySelector(`[data-errkey="${firstKey}"]`) as
    | (HTMLElement & { focus?: () => void })
    | null
  if (el) {
    try {
      el.scrollIntoView({behavior: 'smooth', block: 'center'})
      if (typeof el.focus === 'function') el.focus()
    } catch {}
  }
}


  const isPersonalDirty = React.useMemo(
    () => JSON.stringify(personalForm) !== personalSnapshot,
    [personalForm, personalSnapshot]
  )

  const isDocumentDirty = React.useMemo(
    () => JSON.stringify(documentForm) !== documentSnapshot,
    [documentForm, documentSnapshot]
  )

  const isAcademicDirty = React.useMemo(
    () => JSON.stringify(academicForm) !== academicSnapshot,
    [academicForm, academicSnapshot]
  )

  const isWatchkeepingDirty = React.useMemo(
    () => JSON.stringify(watchkeepingForm) !== watchkeepingSnapshot,
    [watchkeepingForm, watchkeepingSnapshot]
  )

  const isNextOfKinDirty = React.useMemo(
    () => JSON.stringify(nextOfKinForm) !== nextOfKinSnapshot,
    [nextOfKinForm, nextOfKinSnapshot]
  )
  const isCoursesDirty = React.useMemo(
    () => JSON.stringify(coursesForm) !== courseCertificatesSnapshot,
    [coursesForm, courseCertificatesSnapshot]
  )
  const isSeaServiceDirty = React.useMemo(
    () => JSON.stringify(seaServiceForm) !== seaServiceSnapshot,
    [seaServiceForm, seaServiceSnapshot]
  )

  const [isFlagsDirty, setIsFlagsDirty] = useState(false) 
const flagRef = useRef<{ saveAll: () => Promise<boolean> }>(null)
  const isAdditionalDetailsDirty = React.useMemo(
  () =>
    JSON.stringify(normalizeAdditional(additionalDetails, references)) !==
    additionalDetailsSnapshot,
  [additionalDetails, references, additionalDetailsSnapshot]
)


  useEffect(() => {
    if (isOpen && crewIdProp) setCrewId(crewIdProp) // <== below: rename prop to crewIdProp in destructure
  }, [isOpen, crewIdProp])

  // keep a per-crew draft key in Edit-mode
  const [draftKey, setDraftKey] = useState<string>('') // <==
  useEffect(() => {
    if (isOpen && crewId) {
      setDraftKey(`editCrewWizardDraft_v1_${crewId}`) // <==
    }
  }, [isOpen, crewId])



  const persistDraft = React.useCallback(() => {
    // <== add guard for draftKey
    if (!draftKey) return
    const payload = {
      activeTab,
      crewId,
      personalForm,
      documentForm,
      academicForm,
      watchkeepingForm,
      nextOfKinForm,
      coursesForm,
      seaServiceForm,
      additionalDetailsForm,
      savedTabs,
      ts: Date.now(),
    }
    if (draftKey) localStorage.setItem(draftKey, JSON.stringify(payload))
  }, [
    draftKey,
    activeTab,
    crewId,
    personalForm,
    documentForm,
    academicForm,
    watchkeepingForm,
    nextOfKinForm,
    coursesForm,
    seaServiceForm,
    additionalDetailsForm,
    savedTabs,
  ])

  //helper
  const loadPersonalFromCrewUnit = async (id: number) => {
    // <==
    try {
      const cu = await getCrewUnit(id)
      // Map CrewUnit fields → your personal tab state
      setName(cu.name || '')
      setFamilyName(cu.familyName || '')
      setTelNo(cu.telNo || '')
      setContactNumber(cu.contactNumber || '')
      setAlternateMobNo(cu.alternateMobNo || '')
      setEmail(cu.email || '')
      setDateOfBirth(cu.dateOfBirth ? new Date(cu.dateOfBirth) : null)
      setSkypeId(cu.skypeId || '')
      setNationality(cu.nationality || '')
      setPlaceOfBirth(cu.placeOfBirth || '')
      setDateOfAvailability(cu.dateOfAvailability ? new Date(cu.dateOfAvailability) : null)
      setMaritalStatus(cu.maritalStatus || '')
      setDepartment(cu.department || '')
      setWillingToAcceptLowerRank(!!cu.willingToAcceptLowerRank)
      setBoilerSuitSize(cu.boilerSuitSize || '')
      setHeight(cu.heightCms ?? 0)
      setWeight(cu.weightKgs ?? 0)
      setBmiIndex(cu.bmiIndex ?? 0)
      setBloodGroup(cu.bloodGroup || '')
      setShoeSize(cu.shoeSize || '')
      setAddress(cu.address || '')
      setNotes(cu.notes || '')
      setPresentRankId(cu.presentRankId ?? cu.rankId ?? '')
      setRankAppliedForId(cu.rankAppliedForId ?? '')

      // companies
      // If you want to pre-select in UI:
      if (cu.companyAdminId) {
        setSelectedCompany({id: cu.companyAdminId, name: ''}) // you can resolve name via lists
      }
      if (cu.companyGroupAdminId) {
        setSelectedCompanyAdmin({id: cu.companyGroupAdminId, name: ''})
      }

      // mark as saved (since these come from server)
      setSavedTabs((s) => ({...s, personal: true}))

      // personal snapshot
      const pf = {
        name: cu.name || '',
        dateOfBirth: cu.dateOfBirth ? new Date(cu.dateOfBirth) : null,
        nationality: cu.nationality || '',
        department: cu.department || '',
        contactNumber: cu.contactNumber || '',
        email: cu.email || '',
        presentRankId: cu.presentRankId ?? cu.rankId ?? '',
        rankAppliedForId: cu.rankAppliedForId ?? '',
        bloodGroup: cu.bloodGroup || '',
        familyName: cu.familyName || '',
        telNo: cu.telNo || '',
        alternateMobNo: cu.alternateMobNo || '',
        skypeId: cu.skypeId || '',
        maritalStatus: cu.maritalStatus || '',
        heightCms: cu.heightCms ?? 0,
        weightKgs: cu.weightKgs ?? 0,
        bmiIndex: cu.bmiIndex ?? 0,
        willingToAcceptLowerRank: !!cu.willingToAcceptLowerRank,
        boilerSuitSize: cu.boilerSuitSize || '',
        shoeSize: cu.shoeSize || '',
        address: cu.address || '',
        placeOfBirth: cu.placeOfBirth || '',
        dateOfAvailability: cu.dateOfAvailability ? new Date(cu.dateOfAvailability) : null,
        selectedCompany: {id: cu.companyAdminId || 0, name: ''},
        selectedCompanyAdmin: {id: cu.companyGroupAdminId || 0, name: ''},
      }
      setPersonalSnapshot(JSON.stringify(pf))
    } catch (e) {
      console.error('Failed to load crew unit', e)
      toast.error('Failed to load personal data')
    }
  }

  useEffect(() => {
    if (!isOpen || !crewId) return

    // 1) fetch core lookup lists
    fetchRanks()
    fetchCompanyAdmins()
    fetchCompanies()
    fetchVessels()

    // 2) load personal page fields from crew unit
    loadPersonalFromCrewUnit(crewId) // <== NEW below

    // 3) preload “tab bodies”
    ;(async () => {
      await Promise.allSettled([
        checkExistingDocument(),
        checkExistingAcademicDetails(),
        checkExistingWatchkeepingCertificates(),
        checkExistingNextOfKin(),
        checkExistingCourseCertificates(),
        checkExistingSeaServices(),
        checkExistingAdditionalDetails(),
        checkExistingFlagDocuments(),
      ])
    })()
  }, [isOpen, crewId])

  // Save draft whenever something significant changes
  useEffect(() => {
    if (isOpen) persistDraft()
  }, [isOpen, persistDraft])

  // Restore draft on open
  useEffect(() => {
    if (!isOpen) return
    if (!draftKey) return
    const raw = localStorage.getItem(draftKey)

    if (!raw) return

    try {
      const draft = JSON.parse(raw)
      // Check if draft has meaningful data
      const hasPersonalData =
        draft?.personalForm &&
        Object.values(draft.personalForm).some(
          (val) =>
            val !== '' &&
            val !== null &&
            val !== undefined &&
            (typeof val !== 'object' || Object.values(val).some((v) => v !== 0 && v !== ''))
        )
      // const hasDocumentData = draft?.documentForm && Object.values(draft.documentForm).some(val => val !== '' && val !== null && val !== undefined);
      if (
        hasPersonalData
        // || hasDocumentData
      ) {
        if (draft?.personalForm) {
          const p = draft.personalForm
          setName(p.name ?? '')
          setDateOfBirth(p.dateOfBirth ? new Date(p.dateOfBirth) : null)
          setNationality(p.nationality ?? '')
          setDepartment(p.department ?? '')
          setContactNumber(p.contactNumber ?? '')
          setEmail(p.email ?? '')
          setPresentRankId(p.presentRankId ?? '')
          setRankAppliedForId(p.rankAppliedForId ?? '')
          setBloodGroup(p.bloodGroup ?? '')
          setFamilyName(p.familyName ?? '')
          setTelNo(p.telNo ?? '')
          setAlternateMobNo(p.alternateMobNo ?? '')
          setSkypeId(p.skypeId ?? '')
          setMaritalStatus(p.maritalStatus ?? '')
          setHeight(p.heightCms ?? 0)
          setWeight(p.weightKgs ?? 0)
          setBmiIndex(p.bmiIndex ?? 0)
          setWillingToAcceptLowerRank(!!p.willingToAcceptLowerRank)
          setBoilerSuitSize(p.boilerSuitSize ?? '')
          setShoeSize(p.shoeSize ?? '')
          setAddress(p.address ?? '')
          setPlaceOfBirth(p.placeOfBirth ?? '')
          setDateOfAvailability(p.dateOfAvailability ? new Date(p.dateOfAvailability) : null)
          setSelectedCompany(p.selectedCompany ?? {id: 0, name: ''})
          setSelectedCompanyAdmin(p.selectedCompanyAdmin ?? {id: 0, name: ''})
        }
        if (draft?.documentForm) setDocumentForm(draft.documentForm)
        if (draft?.academicForm) setAcademicBackgrounds(draft.academicForm)
        if (draft?.watchkeepingForm) setWatchkeepingCertificates(draft.watchkeepingForm)
        if (draft?.nextOfKinForm) setNextOfKin(draft.nextOfKinForm)
        if (draft?.coursesForm) setCourseCertificates(draft.coursesForm)
        if (draft?.seaServiceForm) setSeaServices(draft.seaServiceForm)
        if (draft?.additionalDetailsForm) {
  setAdditionalDetails(draft.additionalDetailsForm)
  const parsedRefs = JSON.parse(draft.additionalDetailsForm.references || '[]')
  setReferences(parsedRefs)
  setAdditionalDetailsSnapshot(
    JSON.stringify(normalizeAdditional(draft.additionalDetailsForm, parsedRefs))
  )
}
        if (draft?.savedTabs) setSavedTabs(draft.savedTabs)
        if (typeof draft?.crewId === 'number') setCrewId(draft.crewId)
        if (draft?.activeTab && TABS.includes(draft.activeTab)) {
          setActiveTab(draft.activeTab as TabKey)
        }
        // establish snapshots so we don’t show “dirty” on restored data
        setPersonalSnapshot(JSON.stringify(draft?.personalForm ?? {}))
        setDocumentSnapshot(JSON.stringify(draft?.documentForm ?? {}))
        setAcademicSnapshot(JSON.stringify(draft?.academicForm ?? []))
        setWatchkeepingSnapshot(JSON.stringify(draft?.watchkeepingForm ?? []))
        setNextOfKinSnapshot(JSON.stringify(draft?.nextOfKinForm ?? {}))
        setCourseCertificatesSnapshot(JSON.stringify(draft?.coursesForm ?? []))

        // toast.info('Restored in-progress application');
      }
    } catch {}
  }, [isOpen])

  const safeSetActiveTab = (tab: TabKey) => {
    // <== Edit mode: free navigation
    setActiveTab(tab)
  }

  useEffect(() => {
    fetchRanks()
    fetchCompanyAdmins()
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (activeTab === 'documents' && crewId) {
      checkExistingDocument()
    }
    if (activeTab === 'academic' && crewId) {
      checkExistingAcademicDetails()
    }
    if (activeTab === 'watchkeeping' && crewId) {
      checkExistingWatchkeepingCertificates()
    }
    if (activeTab === 'kin' && crewId) {
      checkExistingNextOfKin()
    }
    if (activeTab === 'courses' && crewId) {
      checkExistingCourseCertificates()
    }
    if (activeTab === 'seaService' && crewId) {
      checkExistingSeaServices()
    }
    if (activeTab === 'flagDocs' && crewId) {
      checkExistingFlagDocuments()
    }
    if (activeTab === 'other' && crewId) {
      checkExistingAdditionalDetails()
    }
  }, [activeTab, crewId])

  const fetchRanks = async () => {
    try {
      const ranksList = await getRanks()
      setRanks(ranksList)
    } catch (err) {
      console.error('Failed to fetch ranks:', err)
    }
  }

  const fetchCompanyAdmins = async () => {
    try {
      const companyAdminsList = await getCompanyAdminList()
      setCompanyAdmins(companyAdminsList)
    } catch (err) {
      console.error('Failed to fetch company admins:', err)
    }
  }

  const fetchCompanies = async () => {
  try {
    const companyList = await getCompanyList();

    // Decide if we pre-filter sub-companies by a fixed Company Group
    // - Group Admin (5)  => fixed to their own group
    // - Operator (6) with companyGroupAdminId => fixed to that group
    // - Superadmin (1) and Operator-as-Superadmin => no pre-filter until a CGA is picked in UI
    let groupIdForFilter: number | null = null;
    if (roleId === 5) {
      groupIdForFilter = Number(roleEntityId ?? 0);
    } else if (operatorActsLikeGroupAdmin) {
      groupIdForFilter = Number(companyGroupAdminIdForRole6 ?? 0);
    } else {
      // Superadmin and Operator-as-Superadmin do not pre-populate sub-companies
      groupIdForFilter = null
    }

    const activeCompanies =
      groupIdForFilter
        ? companyList.filter(
            (company) => company.active === true && company.cga?.id === groupIdForFilter
          )
        : [];

    setCompanies(activeCompanies);
  } catch (error) {
    console.error('Failed to fetch company list:', error);
  }
};


  useEffect(() => {
    fetchVessels()
    getRanks().then(setRanks).catch(console.error)
  }, [])

  const checkExistingDocument = async () => {
    try {
      const resp = await getCrewDocument(crewId!)

      // Accept “exists” only if there’s a numeric id
      if (resp && typeof resp.id === 'number') {
        setExistingDocument(resp)
        // If resp already matches your form shape, keep this:
        setDocumentForm(resp)
        setDocumentSnapshot(JSON.stringify(resp))
      } else {
        setExistingDocument(null)
        if (!draftKey) return
        // Only reset documentForm if no draft data exists
        const raw = localStorage.getItem(draftKey)
        const draft = raw ? JSON.parse(raw) : null
        if (
          !draft?.documentForm ||
          Object.values(draft.documentForm).every(
            (val) => val === '' || val === null || val === undefined
          )
        ) {
          setDocumentForm({})
          setDocumentSnapshot(JSON.stringify({}))
        }
      }
    } catch (error) {
      console.error('No existing document found:', error)
      setExistingDocument(null)
      if (!draftKey) return
      // Only reset documentForm if no draft data exists
      const raw = localStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) : null
      if (
        !draft?.documentForm ||
        Object.values(draft.documentForm).every(
          (val) => val === '' || val === null || val === undefined
        )
      ) {
        setDocumentForm({})
        setDocumentSnapshot(JSON.stringify({}))
      }
    }
  }

  const checkExistingAcademicDetails = async () => {
    try {
      const resp = await getAcademicDetails(crewId!)
      if (resp && resp.length > 0 && resp.some((item) => item.id)) {
        setExistingAcademicDetails(resp)
        setAcademicBackgrounds(
          resp.map((item) => ({
            id: item.id,
            qualification: item.qualification || '',
            institutionName: item.institutionName || '',
            boardOrUniversity: item.boardOrUniversity || '',
            dateOfPassing: item.dateOfPassing || '',
            gradeOrPercentage: item.gradeOrPercentage || '',
          }))
        )
        setAcademicSnapshot(JSON.stringify(resp))
      } else {
        setExistingAcademicDetails([])
        if (!draftKey) return
        const raw = localStorage.getItem(draftKey)
        const draft = raw ? JSON.parse(raw) : null
        if (
          !draft?.academicForm ||
          draft.academicForm.every((item: any) =>
            Object.values(item).every((val) => val === '' || val === null || val === undefined)
          )
        ) {
          setAcademicBackgrounds([
            {
              qualification: '',
              institutionName: '',
              boardOrUniversity: '',
              dateOfPassing: '',
              gradeOrPercentage: '',
            },
          ])
          setAcademicSnapshot(JSON.stringify([]))
        }
      }
    } catch (error) {
      console.error('No existing academic details found:', error)
      setExistingAcademicDetails([])
      if (!draftKey) return
      const raw = localStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) : null
      if (
        !draft?.academicForm ||
        draft.academicForm.every((item: any) =>
          Object.values(item).every((val) => val === '' || val === null || val === undefined)
        )
      ) {
        setAcademicBackgrounds([
          {
            qualification: '',
            institutionName: '',
            boardOrUniversity: '',
            dateOfPassing: '',
            gradeOrPercentage: '',
          },
        ])
        setAcademicSnapshot(JSON.stringify([]))
      } else {
        setAcademicBackgrounds(draft.academicForm)
        setAcademicSnapshot(JSON.stringify(draft.academicForm))
      }
    }
  }

  const checkExistingWatchkeepingCertificates = async () => {
    try {
      const resp = await getWatchkeepingCertificates(crewId!)
      if (resp && resp.length > 0 && resp.some((item) => item.id)) {
        setExistingWatchkeepingCertificates(resp)
        const updatedCertificates = certificateDetails.map((detail, index) => {
          const existingCert = resp.find((cert) => cert.certificateDetails === detail)
          return {
            certificateDetails: detail,
            certificateNo: existingCert?.certificateNo || '',
            dateOfIssue: existingCert?.dateOfIssue || '',
            placeOfIssue: existingCert?.placeOfIssue || '',
            validUntil: existingCert?.validUntil || '',
          }
        })
        setWatchkeepingCertificates(updatedCertificates)
        setWatchkeepingSnapshot(JSON.stringify(updatedCertificates))
      } else {
        setExistingWatchkeepingCertificates([])
        if (!draftKey) return
        const raw = localStorage.getItem(draftKey)
        const draft = raw ? JSON.parse(raw) : null
        if (
          !draft?.watchkeepingForm ||
          draft.watchkeepingForm.every((item: any) =>
            Object.values(item).every((val) => val === '' || val === null || val === undefined)
          )
        ) {
          setWatchkeepingCertificates(
            certificateDetails.map((detail) => ({
              certificateDetails: detail,
              certificateNo: '',
              dateOfIssue: '',
              placeOfIssue: '',
              validUntil: '',
            }))
          )
          setWatchkeepingSnapshot(
            JSON.stringify(
              certificateDetails.map((detail) => ({
                certificateDetails: detail,
                certificateNo: '',
                dateOfIssue: '',
                placeOfIssue: '',
                validUntil: '',
              }))
            )
          )
        } else {
          setWatchkeepingCertificates(draft.watchkeepingForm)
          setWatchkeepingSnapshot(JSON.stringify(draft.watchkeepingForm))
        }
      }
    } catch (error) {
      console.error('No existing watchkeeping certificates found:', error)
      setExistingWatchkeepingCertificates([])
      if (!draftKey) return
      const raw = localStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) : null
      if (
        !draft?.watchkeepingForm ||
        draft.watchkeepingForm.every((item: any) =>
          Object.values(item).every((val) => val === '' || val === null || val === undefined)
        )
      ) {
        setWatchkeepingCertificates(
          certificateDetails.map((detail) => ({
            certificateDetails: detail,
            certificateNo: '',
            dateOfIssue: '',
            placeOfIssue: '',
            validUntil: '',
          }))
        )
        setWatchkeepingSnapshot(
          JSON.stringify(
            certificateDetails.map((detail) => ({
              certificateDetails: detail,
              certificateNo: '',
              dateOfIssue: '',
              placeOfIssue: '',
              validUntil: '',
            }))
          )
        )
      } else {
        setWatchkeepingCertificates(draft.watchkeepingForm)
        setWatchkeepingSnapshot(JSON.stringify(draft.watchkeepingForm))
      }
    }
  }

  const checkExistingNextOfKin = async () => {
    try {
      const resp = await getNextOfKin(crewId!)
      if (resp && typeof resp.id === 'number') {
        setExistingNextOfKin(resp)
        setNextOfKin({
          crewId: crewId!,
          civilStatus: resp.civilStatus || null,
          fullName: resp.fullName || '',
          relationship: resp.relationship || '',
          address: resp.address || '',
          pinCode: resp.pinCode || '',
          phoneStdCode: resp.phoneStdCode || '',
          phoneNumber: resp.phoneNumber || '',
        })
        setNextOfKinSnapshot(JSON.stringify(resp))
      } else {
        setExistingNextOfKin(null)
        if (!draftKey) return
        const raw = localStorage.getItem(draftKey)
        const draft = raw ? JSON.parse(raw) : null
        if (
          !draft?.nextOfKinForm ||
          Object.values(draft.nextOfKinForm).every(
            (val) => val === '' || val === null || val === undefined
          )
        ) {
          setNextOfKin({
            crewId: crewId!,
            civilStatus: null,
            fullName: '',
            relationship: '',
            address: '',
            pinCode: '',
            phoneStdCode: '',
            phoneNumber: '',
          })
          setNextOfKinSnapshot(JSON.stringify({}))
        }
      }
    } catch (error) {
      console.error('No existing next of kin found:', error)
      setExistingNextOfKin(null)
      if (!draftKey) return
      const raw = localStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) : null
      if (
        !draft?.nextOfKinForm ||
        Object.values(draft.nextOfKinForm).every(
          (val) => val === '' || val === null || val === undefined
        )
      ) {
        setNextOfKin({
          crewId: crewId!,
          civilStatus: null,
          fullName: '',
          relationship: '',
          address: '',
          pinCode: '',
          phoneStdCode: '',
          phoneNumber: '',
        })
        setNextOfKinSnapshot(JSON.stringify({}))
      }
    }
  }

  const checkExistingCourseCertificates = async () => {
  if (!crewId) return

  try {
    const resp = await getCourseCertificates(crewId)

    if (resp && resp.length > 0 && resp.some((item) => item.id)) {
      // --- server data exists ---
      setExistingCourseCertificates(resp)

      const updatedCertificates = courseCertificateDetails.map((certificateName) => {
        const existingCert = resp.find((cert) => cert.certificateName === certificateName)
        return {
          id: existingCert?.id,
          crewId: existingCert?.crewId,
          certificateName,
          category: getCategoryForCourse(certificateName),
          certificateNumber: existingCert?.certificateNumber || '',
          dateOfIssue: existingCert?.dateOfIssue || '',
          dateOfExpiry: existingCert?.dateOfExpiry || '',
          issuedBy: existingCert?.issuedBy || '',
        }
      })

      setCourseCertificates(updatedCertificates)
      setCourseCertificatesSnapshot(JSON.stringify(updatedCertificates))
    } else {
      // --- nothing on server; fall back to draft or clean template ---
      setExistingCourseCertificates([])
      if (!draftKey) {
        setCourseCertificates(
          courseCertificateDetails.map((certificateName) => ({
            certificateName,
            category: getCategoryForCourse(certificateName),
            certificateNumber: '',
            dateOfIssue: '',
            dateOfExpiry: '',
            issuedBy: '',
          }))
        )
        setCourseCertificatesSnapshot(
          JSON.stringify(
            courseCertificateDetails.map((certificateName) => ({
              certificateName,
              category: getCategoryForCourse(certificateName),
              certificateNumber: '',
              dateOfIssue: '',
              dateOfExpiry: '',
              issuedBy: '',
            }))
          )
        )
        return
      }

      const raw = localStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) : null

      if (
        !draft?.coursesForm ||
        draft.coursesForm.every((item: any) =>
          Object.values(item).every((val) => val === '' || val === null || val === undefined)
        )
      ) {
        setCourseCertificates(
          courseCertificateDetails.map((certificateName) => ({
            certificateName,
            category: getCategoryForCourse(certificateName),
            certificateNumber: '',
            dateOfIssue: '',
            dateOfExpiry: '',
            issuedBy: '',
          }))
        )
        setCourseCertificatesSnapshot(
          JSON.stringify(
            courseCertificateDetails.map((certificateName) => ({
              certificateName,
              category: getCategoryForCourse(certificateName),
              certificateNumber: '',
              dateOfIssue: '',
              dateOfExpiry: '',
              issuedBy: '',
            }))
          )
        )
      } else {
        setCourseCertificates(draft.coursesForm)
        setCourseCertificatesSnapshot(JSON.stringify(draft.coursesForm))
      }
    }
  } catch (error) {
    console.error('No existing course certificates found:', error)
    setExistingCourseCertificates([])

    if (!draftKey) {
      setCourseCertificates(
        courseCertificateDetails.map((certificateName) => ({
          certificateName,
          category: getCategoryForCourse(certificateName),
          certificateNumber: '',
          dateOfIssue: '',
          dateOfExpiry: '',
          issuedBy: '',
        }))
      )
      setCourseCertificatesSnapshot(
        JSON.stringify(
          courseCertificateDetails.map((certificateName) => ({
            certificateName,
            category: getCategoryForCourse(certificateName),
            certificateNumber: '',
            dateOfIssue: '',
            dateOfExpiry: '',
            issuedBy: '',
          }))
        )
      )
      return
    }

    const raw = localStorage.getItem(draftKey)
    const draft = raw ? JSON.parse(raw) : null
    if (
      !draft?.coursesForm ||
      draft.coursesForm.every((item: any) =>
        Object.values(item).every((val) => val === '' || val === null || val === undefined)
      )
    ) {
      setCourseCertificates(
        courseCertificateDetails.map((certificateName) => ({
          certificateName,
          category: getCategoryForCourse(certificateName),
          certificateNumber: '',
          dateOfIssue: '',
          dateOfExpiry: '',
          issuedBy: '',
        }))
      )
      setCourseCertificatesSnapshot(
        JSON.stringify(
          courseCertificateDetails.map((certificateName) => ({
            certificateName,
            category: getCategoryForCourse(certificateName),
            certificateNumber: '',
            dateOfIssue: '',
            dateOfExpiry: '',
            issuedBy: '',
          }))
        )
      )
    } else {
      setCourseCertificates(draft.coursesForm)
      setCourseCertificatesSnapshot(JSON.stringify(draft.coursesForm))
    }
  }
}

  const checkExistingSeaServices = async () => {
  try {
    const resp = await getSeaServices(crewId!)
    if (resp && resp.length > 0 && resp.some((item) => item.id)) {
      setExistingSeaServices(resp)

      const updatedServices = resp
        .sort((a, b) => a.serialNo - b.serialNo)
        .map((item, index) => ({
          id: item.id, 
          serialNo: index + 1,
          companyName: item.companyName || '',
          vesselName: item.vesselName || '',
          typeOfVesselFlag: item.typeOfVesselFlag || '',
          grtdrt: item.grtdrt || '',
          engineType: item.engineType || '',
          kwtBhp: item.kwtBhp || '',
          rank: item.rank || '',
          fromDate: item.fromDate || '',
          toDate: item.toDate || '',
          totalMonthsDays: item.totalMonthsDays || '',
          reasonForSignOff: item.reasonForSignOff || '',
        }))

      setSeaServices(updatedServices)
      setSeaServiceSnapshot(JSON.stringify(updatedServices))
    } else {
      setExistingSeaServices([])

      if (!draftKey) {
        setSeaServices([
          {
            serialNo: 1,
            companyName: '',
            vesselName: '',
            typeOfVesselFlag: '',
            grtdrt: '',
            engineType: '',
            kwtBhp: '',
            rank: '',
            fromDate: '',
            toDate: '',
            totalMonthsDays: '',
            reasonForSignOff: '',
          },
        ])
        setSeaServiceSnapshot(JSON.stringify([]))
        return
      }

      const raw = localStorage.getItem(draftKey)
      const draft = raw ? JSON.parse(raw) : null

      if (
        !draft?.seaServiceForm ||
        draft.seaServiceForm.every((item: any) =>
          Object.values(item).every((val) => val === '' || val === null || val === undefined)
        )
      ) {
        setSeaServices([
          {
            serialNo: 1,
            companyName: '',
            vesselName: '',
            typeOfVesselFlag: '',
            grtdrt: '',
            engineType: '',
            kwtBhp: '',
            rank: '',
            fromDate: '',
            toDate: '',
            totalMonthsDays: '',
            reasonForSignOff: '',
          },
        ])
        setSeaServiceSnapshot(JSON.stringify([]))
      } else {
        setSeaServices(draft.seaServiceForm)
        setSeaServiceSnapshot(JSON.stringify(draft.seaServiceForm))
      }
    }
  } catch (error) {
    console.error('No existing sea services found:', error)
    setExistingSeaServices([])

    if (!draftKey) {
      setSeaServices([
        {
          serialNo: 1,
          companyName: '',
          vesselName: '',
          typeOfVesselFlag: '',
          grtdrt: '',
          engineType: '',
          kwtBhp: '',
          rank: '',
          fromDate: '',
          toDate: '',
          totalMonthsDays: '',
          reasonForSignOff: '',
        },
      ])
      setSeaServiceSnapshot(JSON.stringify([]))
      return
    }

    const raw = localStorage.getItem(draftKey)
    const draft = raw ? JSON.parse(raw) : null
    if (
      !draft?.seaServiceForm ||
      draft.seaServiceForm.every((item: any) =>
        Object.values(item).every((val) => val === '' || val === null || val === undefined)
      )
    ) {
      setSeaServices([
        {
          serialNo: 1,
          companyName: '',
          vesselName: '',
          typeOfVesselFlag: '',
          grtdrt: '',
          engineType: '',
          kwtBhp: '',
          rank: '',
          fromDate: '',
          toDate: '',
          totalMonthsDays: '',
          reasonForSignOff: '',
        },
      ])
      setSeaServiceSnapshot(JSON.stringify([]))
    } else {
      setSeaServices(draft.seaServiceForm)
      setSeaServiceSnapshot(JSON.stringify(draft.seaServiceForm))
    }
  }
}

  const checkExistingAdditionalDetails = async () => {
  try {
    const resp = await getAdditionalDetails(crewId!)
    if (resp && resp.id) {
      setExistingAdditionalDetails(resp)

      const refArr: Reference[] = resp.references ? JSON.parse(resp.references) : []
      const uiRefs = Array.isArray(refArr) && refArr.length > 0
        ? refArr
        : [{srNo: 1, companyName: '', pic: '', designation: '', phoneNo: ''}]
      setReferences(uiRefs)

      const ad: AdditionalDetailsRequest = {
        crewId: crewId!,
        criminalCaseInvolved: resp.criminalCaseInvolved ?? false,
        criminalCaseDetails: resp.criminalCaseDetails ?? '',
        certificateSuspendedRevoked: resp.certificateSuspendedRevoked ?? false,
        certificateSuspendedRevokedDetails: resp.certificateSuspendedRevokedDetails ?? '',
        hasMedicalConditions: resp.hasMedicalConditions ?? false,
        medicalConditionsDetails: resp.medicalConditionsDetails ?? '',
        habitualUseDrugsAlcohol: resp.habitualUseDrugsAlcohol ?? false,
        habitualUseDetails: resp.habitualUseDetails ?? '',
        workedWithMultinational: resp.workedWithMultinational ?? false,
        multinationalNationalities: resp.multinationalNationalities ?? '',
        referralSource: resp.referralSource ?? null,
        referralDetails: resp.referralDetails ?? '',
        pumpExperienceFramoMonths: resp.pumpExperienceFramoMonths ?? null,
        pumpExperienceCopMonths: resp.pumpExperienceCopMonths ?? null,
        drydockingExperience: resp.drydockingExperience ?? false,
        drydockingRank: resp.drydockingRank ?? '',
        newConstructionExperience: resp.newConstructionExperience ?? false,
        newConstructionRank: resp.newConstructionRank ?? '',
        incidentInvolvement: resp.incidentInvolvement ?? false,
        incidentDetails: resp.incidentDetails ?? '',
        courtOfEnquiryInvolvement: resp.courtOfEnquiryInvolvement ?? false,
        courtOfEnquiryDetails: resp.courtOfEnquiryDetails ?? '',
        references: resp.references ?? '[]',
        declarationMedicalExam: resp.declarationMedicalExam ?? false,
        declarationMedicalDecision: resp.declarationMedicalDecision ?? false,
        declarationNoCriminal: resp.declarationNoCriminal ?? false,
        declarationDocumentsValid: resp.declarationDocumentsValid ?? false,
        declarationNotEmployed: resp.declarationNotEmployed ?? false,
        declarationNoAgents: resp.declarationNoAgents ?? false,
        availabilityDate: resp.availabilityDate ?? '',
        applicantName: resp.applicantName ?? '',
        applicantDate: resp.applicantDate ?? '',
        hasReferenceData: resp.hasReferenceData ?? false,
      }

      setAdditionalDetails(ad)
      setSavedTabs((s) => ({...s, other: true}))
      setAdditionalDetailsSnapshot(JSON.stringify(normalizeAdditional(ad, uiRefs)))
    } else {
      setExistingAdditionalDetails(null)
      setAdditionalDetailsSnapshot(JSON.stringify(normalizeAdditional(additionalDetails, references)))
    }
  } catch (e) {
    console.error('No existing additional details found:', e)
    setExistingAdditionalDetails(null)
    setAdditionalDetailsSnapshot(JSON.stringify(normalizeAdditional(additionalDetails, references)))
  }
}
const checkExistingFlagDocuments = async () => {
  try {
    const resp = await getFlagDocuments(crewId!)
    setExistingFlagDocuments(resp)
  } catch (error) {
    console.error('No existing flag documents found:', error)
    setExistingFlagDocuments([])
  }
}

  const validateFile = (file: File | null) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    const maxSize = 9 * 1024 * 1024 // 9 MB

    if (!file) return {isValid: false, message: 'No file selected.'}
    if (!validTypes.includes(file.type)) {
      return {
        isValid: false,
        message: 'Invalid file type. Only JPEG, PNG, JPG, and PDF are allowed.',
      }
    }
    if (file.size > maxSize) {
      return {isValid: false, message: 'File is too large. Maximum size is 9MB.'}
    }
    return {isValid: true, message: ''}
  }

  const handleCertificationChange = (index: number, key: 'documentName' | 'file', value: any) => {
    const updated = [...certifications]
    updated[index][key] = value
    setCertifications(updated)

    if (key === 'file') {
      const validation = validateFile(value)
      if (!validation.isValid) {
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          [`certification_${index}`]: validation.message,
        }))
      } else {
        setFieldErrors((prevErrors) => {
          const newErrors = {...prevErrors}
          delete newErrors[`certification_${index}`]
          return newErrors
        })
      }
    }
  }

  const handleAddCertification = () => {
    setCertifications([...certifications, {documentName: '', file: null}])
  }

  const handleDocumentChange = (index: number, key: 'documentName' | 'file', value: any) => {
    const updated = [...documents]
    updated[index][key] = value
    setDocuments(updated)

    if (key === 'file') {
      const validation = validateFile(value)
      if (!validation.isValid) {
        setFieldErrors((prevErrors) => ({
          ...prevErrors,
          [`document_${index}`]: validation.message,
        }))
      } else {
        setFieldErrors((prevErrors) => {
          const newErrors = {...prevErrors}
          delete newErrors[`document_${index}`]
          return newErrors
        })
      }
    }
  }

  const handleAddDocument = () => {
    setDocuments([...documents, {documentName: '', file: null}])
  }

  const handleRemoveDocument = (index: number) => {
    const updated = documents.filter((_, i) => i !== index)
    setDocuments(updated)
  }

  const handleRemoveCertification = (index: number) => {
    const updated = certifications.filter((_, i) => i !== index)
    setCertifications(updated)
  }

  const handleAcademicBackgroundChange = (
    index: number,
    field: keyof AcademicQualificationRequest,
    value: string
  ) => {
    const updated = [...academicBackgrounds]
    updated[index][field] = value
    setAcademicBackgrounds(updated)
  }

  const handleAddAcademicBackground = () => {
    setAcademicBackgrounds([
      ...academicBackgrounds,
      {
        qualification: '',
        institutionName: '',
        boardOrUniversity: '',
        dateOfPassing: '',
        gradeOrPercentage: '',
      },
    ])
  }

  const handleRemoveAcademicBackground = (index: number) => {
    if (academicBackgrounds.length > 1) {
      const updated = academicBackgrounds.filter((_, i) => i !== index)
      setAcademicBackgrounds(updated)
    }
  }

  const handleCourseCertificateChange = (
    index: number,
    field: keyof CourseCertificate,
    value: string
  ) => {
    const updated = [...courseCertificates]
    updated[index] = {...updated[index], [field]: value}
    setCourseCertificates(updated)
  }

  const handleSeaServiceChange = (index: number, field: keyof SeaServiceRequest, value: string) => {
    setSeaServices((prev) =>
      prev.map((service, i) => (i === index ? {...service, [field]: value} : service))
    )
  }
  const handleAddSeaService = () => {
    const newSerialNo = seaServices.length + 1
    setSeaServices((prev) => [
      ...prev,
      {
        id: undefined,
        serialNo: newSerialNo,
        companyName: '',
        vesselName: '',
        typeOfVesselFlag: '',
        grtdrt: '',
        engineType: '',
        kwtBhp: '',
        rank: '',
        fromDate: '',
        toDate: '',
        totalMonthsDays: '',
        reasonForSignOff: '',
      },
    ])
  }

  const handleRemoveSeaService = async (index: number) => {
    if (!crewId) return
  
    const target = seaServices[index]
    if (!target) return
  
    // If row exists on server -> delete first
    if (target.id) {
      try {
        await deleteSeaService(crewId, target.id)
        toast.success('Sea service deleted')
      } catch (e) {
        console.error('Failed to delete sea service:', e)
        toast.error('Failed to delete sea service')
        return // don’t remove from UI if backend delete fails
      }
    }
  
    // Remove from UI + re-serial
    setSeaServices((prev) => {
      const updated = prev
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, serialNo: i + 1 }))
  
      // Since delete is already persisted, keep snapshot in-sync
      setSeaServiceSnapshot(JSON.stringify(updated))
      setSavedTabs((t) => ({ ...t, seaService: true }))
      return updated
    })
  
    // Also keep “existingSeaServices” in sync
    setExistingSeaServices((prev) => prev.filter((s) => s.id !== target.id))
  }
  
  const [rows, setRows] = useState([1]) // Start with 1 row

  const addRow = () => {
    setRows([...rows, rows.length + 1])
  }

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      setRows(rows.filter((_, i) => i !== index))
    }
  }

  const fetchCompaniesByAdmin = async (adminId: number) => {
    try {
      const companyList = await getCompanyList()
      console.log(companyList)
      const filteredCompanies = companyList.filter(
        (c) => c.cga?.id === adminId && c.active === true
      )
      setCompaniesByAdmin(filteredCompanies)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const fetchVessels = async () => {
    try {
      const vesselList = await getVesselList()

      const vesselsForCompany = vesselList.filter((vessel) => {
        const isActive = vessel.active

      if (roleId === 1 || operatorActsLikeSuperadmin) {
        // Superadmin + Operator-as-Superadmin: see all active vessels
        return isActive
      } else if (roleId === 5 || operatorActsLikeGroupAdmin) {
        // Group Admin or Operator pinned to a Company Group
        const groupId =
          roleId === 5 ? roleEntityId : companyGroupAdminIdForRole6
        return isActive && vessel.companyGroupAdmin?.id === groupId
      } else if (roleId === 2) {
        // Company Admin: only their company’s vessels
        return isActive && vessel.companyAdmin?.id === roleEntityId
      }
      return false
    })

    setVessels(vesselsForCompany)
  } catch (error) {
    console.error('Failed to fetch vessel list:', error)
  }
}


  const validateDocumentFields = () => {
    const errors: Record<string, string> = {}

    // helper to trim and test
    const check = (key: keyof CrewDocumentForm, re: RegExp, label: string) => {
      const raw = (documentForm as any)[key]
      if (!raw) return
      const val = String(raw).trim()
      if (val && !re.test(val)) {
        errors[String(key)] = `Invalid ${label} format`
      }
    }

    // NOTE: added /i to allow lowercase letters too
    check('passportNumber', /^[A-Z0-9]{6,12}$/i, 'passport number')
    check('cdcNumber', /^[A-Z0-9]{6,12}$/i, 'CDC number')
    check('sidNumber', /^[A-Z0-9]{6,12}$/i, 'SID number')
    check('schengenVisaNumber', /^[A-Z0-9]{5,12}$/i, 'Schengen Visa number')
    check('usVisaC1dNumber', /^[A-Z0-9]{5,12}$/i, 'US Visa C1/D number')
    check('cocNumber', /^[A-Z0-9]{5,12}$/i, 'COC number')
    check('gmdssNumber', /^[A-Z0-9]{5,12}$/i, 'GMDSS number')
    check('gmdssEndorsementNumber', /^[A-Z0-9]{5,12}$/i, 'GMDSS Endorsement number')
    check('indosNumber', /^[A-Z0-9]{6,12}$/i, 'INDOS number')
    check('otherDocNumber', /^[A-Z0-9]{5,12}$/i, 'Other Document number')
    check('oilEndorsementNumber', /^[A-Z0-9]{5,12}$/i, 'Oil Endorsement number')
    check('chemEndorsementNumber', /^[A-Z0-9]{5,12}$/i, 'Chemical Endorsement number')
    check('gasEndorsementNumber', /^[A-Z0-9]{5,12}$/i, 'Gas Endorsement number')

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateAcademicFields = () => {
    const errors: Record<string, string> = {}
    academicBackgrounds.forEach((academic, index) => {
      if (!academic.qualification?.trim()) {
        errors[`academic_qualification_${index}`] = 'Qualification is required'
      }
      if (!academic.institutionName?.trim()) {
        errors[`academic_institution_${index}`] = 'Institution Name is required'
      }
      if (!academic.boardOrUniversity?.trim()) {
        errors[`academic_boardOrUniversity_${index}`] = 'Board/University is required'
      }
      if (!academic.dateOfPassing) {
        errors[`academic_dateOfPassing_${index}`] = 'Date of Passing is required'
      }
      if (!academic.gradeOrPercentage?.trim()) {
        errors[`academic_gradeOrPercentage_${index}`] = 'Grade/Percentage is required'
      } else if (!/^\d{1,3}%$/.test(academic.gradeOrPercentage)) {
        errors[`academic_gradeOrPercentage_${index}`] =
          'Grade/Percentage must be in format e.g., 75%'
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateWatchkeepingFields = () => {
    const errors: Record<string, string> = {}
    watchkeepingCertificates.forEach((certificate, index) => {
      if (!certificate.certificateNo?.trim()) {
        errors[`watchkeeping_certificateNo_${index}`] = 'Certificate Number is required'
      } else if (!/^[A-Z0-9-]{6,12}$/.test(certificate.certificateNo)) {
        errors[`watchkeeping_certificateNo_${index}`] =
          'Invalid Certificate Number format (e.g., WKC-123456)'
      }
      if (!certificate.dateOfIssue) {
        errors[`watchkeeping_dateOfIssue_${index}`] = 'Date of Issue is required'
      }
      if (!certificate.placeOfIssue?.trim()) {
        errors[`watchkeeping_placeOfIssue_${index}`] = 'Place of Issue is required'
      }
      if (!certificate.validUntil) {
        errors[`watchkeeping_validUntil_${index}`] = 'Valid Until is required'
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateNextOfKinFields = () => {
    const errors: Record<string, string> = {}
    if (!nextOfKin.civilStatus) {
      errors.civilStatus = 'Civil Status is required'
    }
    if (!nextOfKin.fullName?.trim()) {
      errors.fullName = 'Full Name is required'
    }
    if (!nextOfKin.relationship?.trim()) {
      errors.relationship = 'Relationship is required'
    }
    // if (!nextOfKin.address?.trim()) {
    //   errors.address = 'Address is required'
    // }
    if ((nextOfKin.pinCode?.trim()) && (!/^\d{6}$/.test(nextOfKin.pinCode))) {
    errors.pinCode = 'Pin Code must be a 6-digit number';
  }
  if ((nextOfKin.phoneStdCode?.trim()) && (!/^\d{3,5}$/.test(nextOfKin.phoneStdCode))) {
    errors.phoneStdCode = 'STD Code must be a 3-5 digit number';
  }
  if ((nextOfKin.phoneNumber?.trim()) && (!/^\d{8,10}$/.test(nextOfKin.phoneNumber))) {
    errors.phoneNumber = 'Phone Number must be 8-10 digits';
  }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateCourseCertificateFields = () => {
    const errors: Record<string, string> = {}
    courseCertificates.forEach((certificate, index) => {
      if (certificate.certificateNumber?.trim()) {
        if (!/^[A-Z0-9-]{6,12}$/.test(certificate.certificateNumber)) {
          errors[`course_certificateNumber_${index}`] =
            'Invalid Certificate Number format (e.g., AFF-123456)'
        }
        if (!certificate.dateOfIssue) {
          errors[`course_dateOfIssue_${index}`] = 'Date of Issue is required'
        }
        if (!certificate.dateOfExpiry) {
          errors[`course_dateOfExpiry_${index}`] = 'Date of Expiry is required'
        }
        if (!certificate.issuedBy?.trim()) {
          errors[`course_issuedBy_${index}`] = 'Issued By is required'
        }
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateSeaServiceFields = () => {
    const errors: Record<string, string> = {}
    seaServices.forEach((service, index) => {
      if (service.companyName?.trim()) {
        if (!service.vesselName?.trim()) {
          errors[`sea_vesselName_${index}`] = 'Vessel Name is required'
        }
        if (!service.typeOfVesselFlag?.trim()) {
          errors[`sea_typeOfVesselFlag_${index}`] = 'Type of Vessel/Flag is required'
        }
        if (!service.grtdrt?.trim()) {
          errors[`sea_grtdrt_${index}`] = 'GRT/DWT is required'
        }
        if (!service.engineType?.trim()) {
          errors[`sea_engineType_${index}`] = 'Engine Type is required'
        }
        if (!service.kwtBhp?.trim()) {
          errors[`sea_kwtBhp_${index}`] = 'KWT/ME BHP is required'
        }
        if (!service.rank?.trim()) {
          errors[`sea_rank_${index}`] = 'Rank is required'
        }
        if (!service.fromDate) {
          errors[`sea_fromDate_${index}`] = 'From Date is required'
        }
        if (!service.toDate) {
          errors[`sea_toDate_${index}`] = 'To Date is required'
        }
        if (!service.totalMonthsDays?.trim()) {
          errors[`sea_totalMonthsDays_${index}`] = 'Total Months/Days is required'
        }
        if (!service.reasonForSignOff?.trim()) {
          errors[`sea_reasonForSignOff_${index}`] = 'Reason for S/OFF is required'
        }
      }
    })
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateAdditionalDetailsFields = () => {
  const errors: Record<string, string> = {}

  // numbers
  if (
    additionalDetails.pumpExperienceFramoMonths !== null &&
    additionalDetails.pumpExperienceFramoMonths! < 0
  ) {
    errors.pumpExperienceFramoMonths = 'FRAMO experience months cannot be negative'
  }
  if (
    additionalDetails.pumpExperienceCopMonths !== null &&
    additionalDetails.pumpExperienceCopMonths! < 0
  ) {
    errors.pumpExperienceCopMonths = 'COP experience months cannot be negative'
  }

  // conditionals
  if (additionalDetails.drydockingExperience && !additionalDetails.drydockingRank?.trim()) {
    errors.drydockingRank = 'Drydocking rank is required when experience is selected'
  }
  if (additionalDetails.newConstructionExperience && !additionalDetails.newConstructionRank?.trim()) {
    errors.newConstructionRank = 'New construction rank is required when experience is selected'
  }
  if (additionalDetails.incidentInvolvement && !additionalDetails.incidentDetails?.trim()) {
    errors.incidentDetails = 'Incident details are required when involvement is selected'
  }
  if (
    additionalDetails.courtOfEnquiryInvolvement &&
    !additionalDetails.courtOfEnquiryDetails?.trim()
  ) {
    errors.courtOfEnquiryDetails = 'Court of enquiry details are required when involvement is selected'
  }
  if (additionalDetails.criminalCaseInvolved && !additionalDetails.criminalCaseDetails?.trim()) {
    errors.criminalCaseDetails = 'Criminal case details are required when involvement is selected'
  }
  if (
    additionalDetails.certificateSuspendedRevoked &&
    !additionalDetails.certificateSuspendedRevokedDetails?.trim()
  ) {
    errors.certificateSuspendedRevokedDetails =
      'Certificate suspension details are required when selected'
  }
  if (
    additionalDetails.hasMedicalConditions &&
    !additionalDetails.medicalConditionsDetails?.trim()
  ) {
    errors.medicalConditionsDetails = 'Medical condition details are required when selected'
  }
  if (
    additionalDetails.habitualUseDrugsAlcohol &&
    !additionalDetails.habitualUseDetails?.trim()
  ) {
    errors.habitualUseDetails = 'Habitual use details are required when selected'
  }
  if (
    additionalDetails.workedWithMultinational &&
    !additionalDetails.multinationalNationalities?.trim()
  ) {
    errors.multinationalNationalities = 'Nationalities are required when multinational is selected'
  }

  // referral
  if (additionalDetails.referralSource && !additionalDetails.referralDetails?.trim()) {
    errors.referralDetails = 'Referral details are required when source is selected'
  }

  // references
  if (additionalDetails.hasReferenceData) {
    references.forEach((ref, index) => {
      if (!ref.companyName?.trim()) {
        errors[`reference_companyName_${index}`] = 'Company name is required'
      }
      if (!ref.pic?.trim()) {
        errors[`reference_pic_${index}`] = 'Person in charge is required'
      }
      if (!ref.designation?.trim()) {
        errors[`reference_designation_${index}`] = 'Designation is required'
      }
      if (!ref.phoneNo?.trim()) {
        errors[`reference_phoneNo_${index}`] = 'Phone number is required'
      } else if (!/^\+?[0-9\s\-()]{7,20}$/.test(ref.phoneNo)) {
        errors[`reference_phoneNo_${index}`] = 'Invalid phone number format'
      }
    })
  }

  // declarations
  if (additionalDetails.declarationMedicalExam !== true) {
    errors.declarationMedicalExam = 'Please confirm the medical examination declaration'
  }
  if (additionalDetails.declarationMedicalDecision !== true) {
    errors.declarationMedicalDecision = 'Please confirm the medical decision declaration'
  }
  if (additionalDetails.declarationNoCriminal !== true) {
    errors.declarationNoCriminal = 'Please confirm the no criminal investigations declaration'
  }
  if (additionalDetails.declarationDocumentsValid !== true) {
    errors.declarationDocumentsValid = 'Please confirm the valid travel documents declaration'
  }
  if (additionalDetails.declarationNotEmployed !== true) {
    errors.declarationNotEmployed = 'Please confirm the present employment declaration'
  }
  if (additionalDetails.declarationNoAgents !== true) {
    errors.declarationNoAgents = 'Please confirm awareness about no agents'
  }
  if (additionalDetails.declarationNoAgents === true && !additionalDetails.availabilityDate) {
    errors.availabilityDate = 'Please provide the availability date'
  }

  // applicant
  if (!additionalDetails.applicantName?.trim()) {
    errors.applicantName = 'Applicant name is required'
  }
  if (!additionalDetails.applicantDate) {
    errors.applicantDate = 'Applicant date is required'
  }

  setFieldErrors(errors)
  if (Object.keys(errors).length > 0) {
    focusFirstError(errors)
    return false
  }
  return true
}


  const handleDocumentFormChange = (field: keyof CrewDocumentForm, value: any) => {
    setDocumentForm((prev) => ({...prev, [field]: value}))
  }

  const handleWatchkeepingCertificateChange = (
    index: number,
    field: keyof WatchkeepingCertificateRequest,
    value: string
  ) => {
    const updated = [...watchkeepingCertificates]
    updated[index][field] = value
    setWatchkeepingCertificates(updated)
  }

  const handleNextOfKinChange = (field: keyof NextOfKinRequest, value: any) => {
    setNextOfKin((prev) => ({...prev, [field]: value}))
  }

  const handleDocumentSubmit = async () => {
    // <== edited
    if (!crewId) {
      setError('Please fill and save Personal Data first to create a crew member.')
      toast.error('Please fill and save Personal Data first.')
      return
    }
    // if (!validateDocumentFields()) {
    //   toast.error('Please fill out the form correctly.')
    //   return
    // }
    try {
      // Check for any pending file uploads
      // const pendingUploads = documents.filter((doc) => doc.file !== null);
      // if (pendingUploads.length > 0) {
      //   toast.error('Please upload all selected files before saving.');
      //   return;
      // }
      if (existingDocument?.id) {
        await updateCrewDocument(crewId, existingDocument.id, documentForm)
        toast.success('Documents updated')
      } else {
        const created = await createCrewDocument(crewId, documentForm)
        setExistingDocument(created)
        toast.success('Documents saved')
      }
      setSavedTabs((s) => ({...s, documents: true}))
      setDocumentSnapshot(JSON.stringify(documentForm))
      setActiveTab(nextTab('documents'))
      await checkExistingDocument()
    } catch (err) {
      console.error('Failed to save document:', err)
      setError('Failed to save document.')
      toast.error('Failed to save document.')
    }
  }

  const handleAcademicSubmit = async () => {
    if (!crewId) {
      setError('Please fill and save Personal Data first to create a crew member.')
      toast.error('Please fill and save Personal Data first.')
      return
    }
    // if (!validateAcademicFields()) {
    //   toast.error('Please fill out the form correctly.')
    //   return
    // }
    try {
      const existingIds = existingAcademicDetails
        .map((item) => item.id)
        .filter((id): id is number => id !== undefined)
      const updatedBackgrounds = await Promise.all(
        academicBackgrounds.map(async (academic, index) => {
          const academicData: AcademicQualificationRequest = {
            qualification: academic.qualification,
            institutionName: academic.institutionName,
            boardOrUniversity: academic.boardOrUniversity,
            dateOfPassing: academic.dateOfPassing,
            gradeOrPercentage: academic.gradeOrPercentage,
          }
          const academicResponse = existingAcademicDetails[index]
          if (academicResponse?.id && existingIds.includes(academicResponse.id)) {
            return await updateAcademicDetails(crewId, academicResponse.id, academicData)
          } else {
            return await createAcademicDetails(crewId, academicData)
          }
        })
      )
      setExistingAcademicDetails(updatedBackgrounds)
      setAcademicBackgrounds(
        updatedBackgrounds.map((item) => ({
          qualification: item.qualification || '',
          institutionName: item.institutionName || '',
          boardOrUniversity: item.boardOrUniversity || '',
          dateOfPassing: item.dateOfPassing || '',
          gradeOrPercentage: item.gradeOrPercentage || '',
        }))
      )
      setSavedTabs((s) => ({...s, academic: true}))
      setAcademicSnapshot(JSON.stringify(updatedBackgrounds))
      toast.success(
        existingAcademicDetails.length > 0 ? 'Academic Details updated' : 'Academic Details saved'
      )
      setActiveTab(nextTab('academic'))
    } catch (err) {
      console.error('Failed to save academic details:', err)
      setError('Failed to save academic details.')
      toast.error('Failed to save academic details.')
    }
  }

  const handleWatchkeepingSubmit = async () => {
    if (!crewId) {
      setError('Please fill and save Personal Data first to create a crew member.')
      toast.error('Please fill and save Personal Data first.')
      return
    }

    // if (!validateWatchkeepingFields()) {
    //   toast.error('Please fill out the form correctly.')
    //   return
    // }
   try {
    // Always use latest data so row-level updates don’t create duplicates
    const fresh = await getWatchkeepingCertificates(crewId)
    setExistingWatchkeepingCertificates(fresh)

    const existingIds = fresh
      .map((item) => item.id)
      .filter((id): id is number => id !== undefined)

    const updatedCertificates = await Promise.all(
      watchkeepingCertificates.map(async (certificate) => {
        const certificateData: WatchkeepingCertificateRequest = {
          certificateDetails: certificate.certificateDetails,
          certificateNo: certificate.certificateNo || null,
          dateOfIssue: certificate.dateOfIssue || null,
          placeOfIssue: certificate.placeOfIssue || null,
          validUntil: certificate.validUntil || null,
        }

        const existingCert = fresh.find(
          (cert) => cert.certificateDetails === certificate.certificateDetails
        )

        // Only persist if there is some data (certificateNo)
        if (certificate.certificateNo?.trim()) {
          if (existingCert?.id && existingIds.includes(existingCert.id)) {
            return await updateWatchkeepingCertificate(crewId, existingCert.id, certificateData)
          } else {
            return await createWatchkeepingCertificate(crewId, certificateData)
          }
        }

        return null
      })
    )

    const validCertificates = updatedCertificates.filter(
      (cert): cert is WatchkeepingCertificateResponse => cert !== null
    )

    setExistingWatchkeepingCertificates(validCertificates)

    // Normalize local state from backend result
    const normalized = certificateDetails.map((detail) => {
      const existingCert = validCertificates.find(
        (cert) => cert.certificateDetails === detail
      )
      return {
        certificateDetails: detail,
        certificateNo: existingCert?.certificateNo || '',
        dateOfIssue: existingCert?.dateOfIssue || '',
        placeOfIssue: existingCert?.placeOfIssue || '',
        validUntil: existingCert?.validUntil || '',
      }
    })

    setWatchkeepingCertificates(normalized)
    setSavedTabs((s) => ({ ...s, watchkeeping: true }))
    setWatchkeepingSnapshot(JSON.stringify(normalized))

    toast.success(
      existingWatchkeepingCertificates.length > 0
        ? 'Watchkeeping Certificates updated'
        : 'Watchkeeping Certificates saved'
    )

    setActiveTab(nextTab('watchkeeping'))
  } catch (err) {
    console.error('Failed to save watchkeeping certificates:', err)
    setError('Failed to save watchkeeping certificates.')
    toast.error('Failed to save watchkeeping certificates.')
  }
  }

  const handleNextOfKinSubmit = async () => {
    if (!crewId) {
      setError('Please fill and save Personal Data first to create a crew member.')
      toast.error('Please fill and save Personal Data first.')
      return
    }
    if (!validateNextOfKinFields()) {
      toast.error('Please fill out the form correctly.')
      return
    }
    try {
      const nextOfKinData: NextOfKinRequest = {
        crewId: crewId!,
        civilStatus: nextOfKin.civilStatus,
        fullName: nextOfKin.fullName || null,
        relationship: nextOfKin.relationship || null,
        address: nextOfKin.address || null,
        pinCode: nextOfKin.pinCode || null,
        phoneStdCode: nextOfKin.phoneStdCode || null,
        phoneNumber: nextOfKin.phoneNumber || null,
      }
      if (existingNextOfKin?.id) {
        await updateNextOfKin(crewId, existingNextOfKin.id, nextOfKinData)
        toast.success('Next of Kin updated')
      } else {
        const created = await createNextOfKin(crewId, nextOfKinData)
        setExistingNextOfKin(created)
        toast.success('Next of Kin saved')
      }
      setSavedTabs((s) => ({...s, kin: true}))
      setNextOfKinSnapshot(JSON.stringify(nextOfKinData))
      setActiveTab(nextTab('kin'))
    } catch (err) {
      console.error('Failed to save next of kin:', err)
      setError('Failed to save next of kin.')
      toast.error('Failed to save next of kin.')
    }
  }

  const handleCourseCertificatesSubmit = async () => {
    if (!crewId) {
      setError('Please fill and save Personal Data first to create a crew member.')
      toast.error('Please fill and save Personal Data first.')
      return
    }

    // if (!validateCourseCertificateFields()) {
    //   toast.error('Please fill out the form correctly.')
    //   return
    // }
    try {
    // Refresh from backend to avoid duplicates when row-level saves already added records
    const fresh = await getCourseCertificates(crewId)
    setExistingCourseCertificates(fresh)

    const existingIds = fresh
      .map((item) => item.id)
      .filter((id): id is number => id !== undefined)

    const updatedCertificates = await Promise.all(
      courseCertificates.map(async (certificate) => {
        const certificateData: CourseCertificate = {
          certificateName: certificate.certificateName,
          category: certificate.category,
          certificateNumber: certificate.certificateNumber || null,
          dateOfIssue: certificate.dateOfIssue || null,
          dateOfExpiry: certificate.dateOfExpiry || null,
          issuedBy: certificate.issuedBy || null,
        }

        const existingCert = fresh.find(
          (cert) => cert.certificateName === certificate.certificateName
        )

        // Only persist rows that actually have a certificate number
        if (certificate.certificateNumber?.trim()) {
          if (existingCert?.id && existingIds.includes(existingCert.id)) {
            return await updateCourseCertificate(crewId, existingCert.id, certificateData)
          } else {
            return await createCourseCertificate(crewId, certificateData)
          }
        }

        return null
      })
    )

    const validCertificates = updatedCertificates.filter(
      (cert): cert is CourseCertificateResponse => cert !== null
    )

    setExistingCourseCertificates(validCertificates)

    // Normalize local state from backend result
    const normalized = courseCertificateDetails.map((certificateName) => {
      const existingCert = validCertificates.find(
        (cert) => cert.certificateName === certificateName
      )
      return {
        certificateName,
        category: getCategoryForCourse(certificateName),
        certificateNumber: existingCert?.certificateNumber || '',
        dateOfIssue: existingCert?.dateOfIssue || '',
        dateOfExpiry: existingCert?.dateOfExpiry || '',
        issuedBy: existingCert?.issuedBy || '',
      }
    })

    setCourseCertificates(normalized)
    setSavedTabs((s) => ({ ...s, courses: true }))
    setCourseCertificatesSnapshot(JSON.stringify(normalized))

    toast.success(
      existingCourseCertificates.length > 0
        ? 'Course Certificates updated'
        : 'Course Certificates saved'
    )

    setActiveTab(nextTab('courses'))
  } catch (err) {
    console.error('Failed to save course certificates:', err)
    setError('Failed to save course certificates.')
    toast.error('Failed to save course certificates.')
  }
}

const handleSeaServiceSubmit = async () => {
  if (!crewId) {
    setError('Please fill and save Personal Data first to create a crew member.')
    toast.error('Please fill and save Personal Data first.')
    return
  }

  try {
    const updatedServices = await Promise.all(
      seaServices.map(async (service, index) => {
        // Only persist rows that have some meaningful data (you used companyName as the trigger)
        if (!service.companyName?.trim()) return null

        const payload: SeaServiceRequest = {
          serialNo: index + 1, // keep order
          companyName: service.companyName || null,
          vesselName: service.vesselName || null,
          typeOfVesselFlag: service.typeOfVesselFlag || null,
          grtdrt: service.grtdrt || null,
          engineType: service.engineType || null,
          kwtBhp: service.kwtBhp || null,
          rank: service.rank || null,
          fromDate: service.fromDate || null,
          toDate: service.toDate || null,
          totalMonthsDays: service.totalMonthsDays || null,
          reasonForSignOff: service.reasonForSignOff || null,
        }

        // ✅ update by row id if present
        if (service.id) {
          return await updateSeaService(crewId, service.id, payload)
        }

        // ✅ otherwise create
        return await createSeaService(crewId, payload)
      })
    )

    const valid = updatedServices.filter(
      (s): s is SeaServiceResponse => s !== null
    )

    setExistingSeaServices(valid)

    const normalized: SeaServiceRequest[] = valid
      .sort((a, b) => (a.serialNo ?? 0) - (b.serialNo ?? 0))
      .map((item, i) => ({
        id: item.id,            // ✅ keep id for future delete/update
        serialNo: i + 1,
        companyName: item.companyName || '',
        vesselName: item.vesselName || '',
        typeOfVesselFlag: item.typeOfVesselFlag || '',
        grtdrt: item.grtdrt || '',
        engineType: item.engineType || '',
        kwtBhp: item.kwtBhp || '',
        rank: item.rank || '',
        fromDate: item.fromDate || '',
        toDate: item.toDate || '',
        totalMonthsDays: item.totalMonthsDays || '',
        reasonForSignOff: item.reasonForSignOff || '',
      }))

    setSeaServices(normalized)
    setSavedTabs((s) => ({ ...s, seaService: true }))
    setSeaServiceSnapshot(JSON.stringify(normalized))

    toast.success(existingSeaServices.length > 0 ? 'Sea Services updated' : 'Sea Services saved')
    setActiveTab(nextTab('seaService'))
  } catch (err) {
    console.error('Failed to save sea services:', err)
    setError('Failed to save sea services.')
    toast.error('Failed to save sea services.')
  }
}


  const handleAdditionalDetailsSubmit = async () => {
    if (!crewId) {
      setError('Invalid crew ID.')
      toast.error('Invalid crew ID.')
      return
    }
    // if (!validateAdditionalDetailsFields()) {
    //   toast.error('Please fill out the form correctly.')
    //   return
    // }
    try {
      const additionalDetailsData: AdditionalDetailsRequest = {
        crewId: crewId!,
        criminalCaseInvolved: additionalDetails.criminalCaseInvolved ?? false,
        criminalCaseDetails: additionalDetails.criminalCaseDetails || null,
        certificateSuspendedRevoked: additionalDetails.certificateSuspendedRevoked ?? false,
        certificateSuspendedRevokedDetails:
          additionalDetails.certificateSuspendedRevokedDetails || null,
        hasMedicalConditions: additionalDetails.hasMedicalConditions ?? false,
        medicalConditionsDetails: additionalDetails.medicalConditionsDetails || null,
        habitualUseDrugsAlcohol: additionalDetails.habitualUseDrugsAlcohol ?? false,
        habitualUseDetails: additionalDetails.habitualUseDetails || null,
        workedWithMultinational: additionalDetails.workedWithMultinational ?? false,
        multinationalNationalities: additionalDetails.multinationalNationalities || null,
        referralSource: additionalDetails.referralSource || null,
        referralDetails: additionalDetails.referralDetails || null,
        pumpExperienceFramoMonths: additionalDetails.pumpExperienceFramoMonths || null,
        pumpExperienceCopMonths: additionalDetails.pumpExperienceCopMonths || null,
        drydockingExperience: additionalDetails.drydockingExperience ?? false,
        drydockingRank: additionalDetails.drydockingRank || null,
        newConstructionExperience: additionalDetails.newConstructionExperience ?? false,
        newConstructionRank: additionalDetails.newConstructionRank || null,
        incidentInvolvement: additionalDetails.incidentInvolvement ?? false,
        incidentDetails: additionalDetails.incidentDetails || null,
        courtOfEnquiryInvolvement: additionalDetails.courtOfEnquiryInvolvement ?? false,
        courtOfEnquiryDetails: additionalDetails.courtOfEnquiryDetails || null,
        references: additionalDetails.hasReferenceData ? JSON.stringify(references) : '[]',
        declarationMedicalExam: additionalDetails.declarationMedicalExam ?? false,
        declarationMedicalDecision: additionalDetails.declarationMedicalDecision ?? false,
        declarationNoCriminal: additionalDetails.declarationNoCriminal ?? false,
        declarationDocumentsValid: additionalDetails.declarationDocumentsValid ?? false,
        declarationNotEmployed: additionalDetails.declarationNotEmployed ?? false,
        declarationNoAgents: additionalDetails.declarationNoAgents ?? false,
        availabilityDate: additionalDetails.availabilityDate || null,
        applicantName: additionalDetails.applicantName || null,
        applicantDate: additionalDetails.applicantDate || null,
        hasReferenceData: additionalDetails.hasReferenceData ?? false,
      }

      let updated
      if (existingAdditionalDetails?.id) {
        updated = await updateAdditionalDetails(
          crewId,
          existingAdditionalDetails.id,
          additionalDetailsData
        ) // <==
        toast.success('Additional Details updated')
      } else {
        updated = await createAdditionalDetails(crewId, additionalDetailsData) // <==
        toast.success('Additional Details created')
      }
      setExistingAdditionalDetails(updated)
      setSavedTabs((s) => ({...s, other: true}))
      setAdditionalDetailsSnapshot(JSON.stringify({...additionalDetailsData, references}))
      onUpdated?.() // <== don’t close; notify parent if needed
    } catch (err) {
      console.error('Failed to save additional details:', err)
      setError('Failed to save additional details.')
      toast.error('Failed to save additional details.')
    }
  }

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'name':
        return !value.trim() ? 'Name is required' : ''
      case 'familyName':
        return !value.trim() ? 'Family Name is required' : ''
      case 'contactNumber':
        if (!value.trim()) return 'Mobile number is required'
        return !/^\+?[0-9\s\-()]{7,20}$/.test(value) ? 'Invalid mobile number' : ''
      case 'alternateMobNo':
        if (!value.trim()) return 'Alternate mobile number is required'
        return !/^\+?[0-9\s\-()]{7,20}$/.test(value) ? 'Invalid alternate mobile number' : ''
      case 'email':
        if (!value.trim()) return 'Email is required'
        return !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(value) ? 'Invalid email format' : ''
      case 'nationality':
        return !value.trim() ? 'Nationality is required' : ''
      case 'placeOfBirth':
        return !value.trim() ? 'Place of Birth is required' : ''
      case 'dateOfAvailability':
        return !value ? 'Date of Availability is required' : ''
      case 'maritalStatus':
        return !value.trim() ? 'Marital Status is required' : ''
      case 'department':
        return !value.trim() ? 'Department is required' : ''
      case 'presentRankId':
        return value === '' ? 'Present Rank is required' : ''
      case 'rankAppliedForId':
        return value === '' ? 'Applied Rank is required' : ''
      case 'bloodGroup':
        return !value.trim() ? 'Blood Group is required' : ''
      case 'heightCms':
        return value <= 0 ? 'Height must be greater than 0' : ''
      case 'weightKgs':
        return value <= 0 ? 'Weight must be greater than 0' : ''
      case 'bmiIndex':
        return value <= 0 ? 'BMI Index must be greater than 0' : ''
      case 'willingToAcceptLowerRank':
        return value === undefined || value === null
          ? 'Willing to Accept Lower Rank is required'
          : ''
      case 'address':
        return !value.trim() ? 'Address is required' : ''
      case 'companyAdmin':
  return ((roleId === 1) || operatorActsLikeSuperadmin) && !value.id
    ? 'Company Group selection is required'
    : ''
      case 'dateOfBirth':
        if (!value) return 'Date of Birth is required'
        const age = calculateAge(value)
        return age < 18 ? 'You must be at least 18 years old' : ''
      default:
        return ''
    }
  }

  const handleFieldChange = (field: string, value: any, setter: (value: any) => void) => {
    setter(value)
    const error = validateField(field, value)
    setFieldErrors((prev) => ({
      ...prev,
      [field]: error,
    }))
  }

  // REPLACE THIS WHOLE FUNCTION
  const validateFields = () => {
    const errors: Record<string, string> = {}

    // --- DOB: must be at least 18 as of today ---
    const toDate = (d: any): Date | null => {
      if (!d) return null
      return d instanceof Date ? d : new Date(d)
    }
    const dob = toDate(dateOfBirth)
    const today = new Date()
    const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    errors.dateOfBirth = !dob
      ? 'Date of Birth is required'
      : dob > cutoff
      ? 'You must be at least 18 years old as of today'
      : ''

    // --- existing validations ---
    errors.name = validateField('name', name)
    // errors.familyName = validateField('familyName', familyName)
    errors.contactNumber = validateField('contactNumber', contactNumber)
    errors.alternateMobNo = validateField('alternateMobNo', alternateMobNo)
    errors.email = validateField('email', email)
    errors.nationality = validateField('nationality', nationality)
    errors.placeOfBirth = validateField('placeOfBirth', placeOfBirth)
    errors.dateOfAvailability = validateField('dateOfAvailability', dateOfAvailability)
    // errors.maritalStatus = validateField('maritalStatus', maritalStatus)
    errors.department = validateField('department', department)
    errors.presentRankId = validateField('presentRankId', presentRankId)
    errors.rankAppliedForId = validateField('rankAppliedForId', rankAppliedForId)
    // errors.bloodGroup = validateField('bloodGroup', bloodGroup)
    // errors.heightCms = validateField('heightCms', heightCms)
    // errors.weightKgs = validateField('weightKgs', weightKgs)
    // errors.bmiIndex = validateField('bmiIndex', bmiIndex)
    errors.willingToAcceptLowerRank = validateField(
      'willingToAcceptLowerRank',
      willingToAcceptLowerRank
    )
    errors.address = validateField('address', address)
    errors.companyAdmin = validateField('companyAdmin', selectedCompanyAdmin)

    // uploads pairing checks
    certifications.forEach((cert, index) => {
      if (!cert.documentName.trim() && cert.file) {
        errors[`certification_${index}`] = 'Document name is required when a file is selected.'
      }
      if (cert.documentName.trim() && !cert.file) {
        errors[`certification_${index}`] = 'A file is required when document name is provided.'
      }
    })

    documents.forEach((doc, index) => {
      if (!doc.documentName.trim() && doc.file) {
        errors[`document_${index}`] = 'Document name is required when a file is selected.'
      }
      if (doc.documentName.trim() && !doc.file) {
        errors[`document_${index}`] = 'A file is required when document name is provided.'
      }
    })

    // NEW: Sub Company required only if the group actually has sub companies
  if ((roleId === 5 || roleId === 6) && companies.length > 0 && !selectedCompany.id) {
    errors.selectedCompany = 'Sub Company is required'
  }

    setFieldErrors(errors)
    return Object.values(errors).every((e) => !e)
  }

  const calculateAge = (dob: Date | null): number => {
    if (!dob) return 0 // Handle null value for dateOfBirth
    const diff = Date.now() - dob.getTime()
    const ageDate = new Date(diff)
    return Math.abs(ageDate.getUTCFullYear() - 1970)
  }

  const handleSavePersonal = async () => {
    // <== replaced
    setError('')
    if (!validateFields()) {
      toast.error('Please fill out the form correctly.')
      return
    }
    // Sub-company requirement for Company/Operator only if subcompanies exist
  const mustPickSubCompany = (roleId === 5 || roleId === 6) && companies.length > 0
  if (mustPickSubCompany && !selectedCompany.id) {
    setFieldErrors((prev) => ({ ...prev, selectedCompany: 'Sub Company is required' }))
    toast.error('Please select a Sub Company.')
    return
  }
  
    try {
      // compute company ids by effective role
      let companyGroupAdminId: number
      let companyAdminId: number | null = null

if (roleId === 1 || operatorActsLikeSuperadmin) {
  // Superadmin (1) and Operator-as-Superadmin must choose a Company Group
  if (!selectedCompanyAdmin.id) {
    toast.error('Please select a Company Group Admin.')
    return
  }
  companyGroupAdminId = selectedCompanyAdmin.id
  companyAdminId = selectedCompany.id || null
} else if (roleId === 5 || operatorActsLikeGroupAdmin) {
  // Group Admin (5) and Operator pinned to a Company Group
  const groupId =
    roleId === 5 ? Number(roleEntityId) : Number(companyGroupAdminIdForRole6)
  if (!groupId) {
    toast.error('Invalid user configuration: Group Admin ID is missing.')
    return
  }
  companyGroupAdminId = groupId
  companyAdminId = selectedCompany.id || null
} else if (roleId === 2) {
  // Company Admin (2): both ids are the company’s id (as per existing backend contract)
  if (!roleEntityId) {
    toast.error('Invalid user configuration: Company Admin ID is missing.')
    return
  }
  companyGroupAdminId = Number(roleEntityId)
  companyAdminId = Number(roleEntityId)
} else {
  toast.error('Invalid user role.')
  return
}

      await updateCrew(crewId!, {
        name,
        dateOfBirth: (dateOfBirth ?? new Date()).toISOString().split('T')[0],
        nationality,
        department,
        contactNumber,
        email,
        rankId: Number(presentRankId),
        presentRankId: Number(presentRankId),
        rankAppliedForId: rankAppliedForId ? Number(rankAppliedForId) : undefined,
        companyGroupAdminId,
        companyAdminId,
        active: true,
        notes,
        familyName,
        placeOfBirth,
        gender: '', // if needed later
        telNo,
        alternateMobNo,
        skypeId,
        dateOfAvailability: dateOfAvailability
          ? dateOfAvailability.toISOString().split('T')[0]
          : undefined,
        maritalStatus,
        bloodGroup,
        heightCms,
        weightKgs,
        bmiIndex,
        willingToAcceptLowerRank,
        boilerSuitSize,
        shoeSize,
        address,
        // isApproved: false,
      })

      setSavedTabs((s) => ({...s, personal: true}))
      setPersonalSnapshot(JSON.stringify(personalForm))
      toast.success('Personal data updated')
      onUpdated?.() // <== optional callback for parent
      setActiveTab(nextTab('personal'))
    } catch (err: any) {
      console.error('Error saving personal data:', err)
      const errorMessage = err.response?.data?.message || 'Failed to update Personal'
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const clearForm = () => {
    if (activeTab === 'personal' && !savedTabs.personal) {
      setName('')
      setDateOfBirth(null)
      setNationality('')
      setDepartment('')
      setContactNumber('')
      setEmail('')
      setPresentRankId('')
      setRankAppliedForId('')
      setBloodGroup('')
      setFamilyName('')
      setTelNo('')
      setAlternateMobNo('')
      setSkypeId('')
      setMaritalStatus('')
      setHeight(0)
      setWeight(0)
      setBmiIndex(0)
      setWillingToAcceptLowerRank(false)
      setBoilerSuitSize('')
      setShoeSize('')
      setAddress('')
      setPlaceOfBirth('')
      setDateOfAvailability(null)
      setSelectedCompany({id: 0, name: ''})
      setSelectedCompanyAdmin({id: 0, name: ''})
      setFieldErrors({})
      setPersonalSnapshot(JSON.stringify({}))
      toast.success('Personal form cleared')
    } else if (activeTab === 'documents' && !savedTabs.documents) {
      setDocumentForm({})
      setFieldErrors({})
      setDocumentSnapshot(JSON.stringify({}))
      toast.success('Documents form cleared')
    } else if (activeTab === 'academic' && !savedTabs.academic) {
      setAcademicBackgrounds([
        {
          qualification: '',
          institutionName: '',
          boardOrUniversity: '',
          dateOfPassing: '',
          gradeOrPercentage: '',
        },
      ])
      setFieldErrors({})
      setAcademicSnapshot(JSON.stringify([]))
      toast.success('Academic form cleared')
    } else if (activeTab === 'watchkeeping' && !savedTabs.watchkeeping) {
      setWatchkeepingCertificates(
        certificateDetails.map((detail) => ({
          certificateDetails: detail,
          certificateNo: '',
          dateOfIssue: '',
          placeOfIssue: '',
          validUntil: '',
        }))
      )
      setFieldErrors({})
      setWatchkeepingSnapshot(
        JSON.stringify(
          certificateDetails.map((detail) => ({
            certificateDetails: detail,
            certificateNo: '',
            dateOfIssue: '',
            placeOfIssue: '',
            validUntil: '',
          }))
        )
      )
      toast.success('Watchkeeping Certificates form cleared')
    } else if (activeTab === 'kin' && !savedTabs.kin) {
      setNextOfKin({
        crewId: crewId || 0,
        civilStatus: null,
        fullName: '',
        relationship: '',
        address: '',
        pinCode: '',
        phoneStdCode: '',
        phoneNumber: '',
      })
      setFieldErrors({})
      setNextOfKinSnapshot(JSON.stringify({}))
      toast.success('Next of Kin form cleared')
    } else if (activeTab === 'courses' && !savedTabs.courses) {
      setCourseCertificates(
        courseCertificateDetails.map((certificateName) => ({
          certificateName,
          category: getCategoryForCourse(certificateName),
          certificateNumber: '',
          dateOfIssue: '',
          dateOfExpiry: '',
          issuedBy: '',
        }))
      )
      setFieldErrors({})
      setCourseCertificatesSnapshot(
        JSON.stringify(
          courseCertificateDetails.map((certificateName) => ({
            certificateName,
            category: getCategoryForCourse(certificateName),
            certificateNumber: '',
            dateOfIssue: '',
            dateOfExpiry: '',
            issuedBy: '',
          }))
        )
      )
      toast.success('Course Certificates form cleared')
    } else if (activeTab === 'seaService' && !savedTabs.seaService) {
      setSeaServices([
        {
          serialNo: 1,
          companyName: '',
          vesselName: '',
          typeOfVesselFlag: '',
          grtdrt: '',
          engineType: '',
          kwtBhp: '',
          rank: '',
          fromDate: '',
          toDate: '',
          totalMonthsDays: '',
          reasonForSignOff: '',
        },
      ])
      setFieldErrors({})
      setSeaServiceSnapshot(JSON.stringify([]))
      toast.success('Sea Service form cleared')
    } else if (activeTab === 'other' && !savedTabs.other) {
      setAdditionalDetails({
        crewId: crewId || 0,
        criminalCaseInvolved: false,
        criminalCaseDetails: '',
        certificateSuspendedRevoked: false,
        certificateSuspendedRevokedDetails: '',
        hasMedicalConditions: false,
        medicalConditionsDetails: '',
        habitualUseDrugsAlcohol: false,
        habitualUseDetails: '',
        workedWithMultinational: false,
        multinationalNationalities: '',
        referralSource: null,
        referralDetails: '',
        pumpExperienceFramoMonths: null,
        pumpExperienceCopMonths: null,
        drydockingExperience: false,
        drydockingRank: '',
        newConstructionExperience: false,
        newConstructionRank: '',
        incidentInvolvement: false,
        incidentDetails: '',
        courtOfEnquiryInvolvement: false,
        courtOfEnquiryDetails: '',
        references: '[]',
        declarationMedicalExam: false,
        declarationMedicalDecision: false,
        declarationNoCriminal: false,
        declarationDocumentsValid: false,
        declarationNotEmployed: false,
        declarationNoAgents: false,
        availabilityDate: '',
        applicantName: '',
        applicantDate: '',
        hasReferenceData: false,
      })

      setReferences([{srNo: 1, companyName: '', pic: '', designation: '', phoneNo: ''}])
      setFieldErrors({})
      setAdditionalDetailsSnapshot(JSON.stringify({}))
      toast.success('Additional Details form cleared')
    }
    persistDraft() // Update draft to reflect cleared form
  }

  const hasUnsavedChanges =
    isPersonalDirty ||
    isDocumentDirty ||
    isAcademicDirty ||
    isWatchkeepingDirty ||
    isNextOfKinDirty ||
    isCoursesDirty ||
    isSeaServiceDirty ||
    isAdditionalDetailsDirty ||
    isFlagsDirty 
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  if (!isOpen) return null

  return (
    <div className='modal-overlay'>
      <div
        className='modal-content'
        onClick={(e) => e.stopPropagation()}
        style={{maxWidth: '115rem'}}
      >
        <div className='custom-modal-header d-flex justify-content-between align-items-center'>
          <h5 className='m-0'>Edit Crew Data</h5>
          {/* <span className='d-flex align-items-center gap-2'>
            <button className='btn btn-sm btn-secondary' onClick={clearForm}>
              Clear Form
            </button>{' '}</span> */}
          <button className='close-btn' onClick={onClose}>
            <KTSVG path='/media/map/x.svg' className='svg-icon-2x' />
          </button>
        </div>

        <ul className='nav nav-tabs mb-4'>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('personal')}
            >
              Personal Data {savedTabs.personal && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('documents')}
            >
              Documents {savedTabs.documents && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'academic' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('academic')}
            >
              Academic Background{' '}
              {savedTabs.academic && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'watchkeeping' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('watchkeeping')}
            >
              Watch Keeping Certificates{' '}
              {savedTabs.watchkeeping && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'kin' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('kin')}
            >
              Next of Kin Details {savedTabs.kin && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'courses' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('courses')}
            >
              Courses & Certificates{' '}
              {savedTabs.courses && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'seaService' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('seaService')}
            >
              Previous Sea Service{' '}
              {savedTabs.seaService && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
          <li className='nav-item'>
          <button
            className={`nav-link ${activeTab === 'flagDocs' ? 'active' : ''}`}
            onClick={() => safeSetActiveTab('flagDocs')}
          >
            Flag Documents {savedTabs.flagDocs && <span className='text-success ms-1'>✓</span>}
          </button>
        </li>
          <li className='nav-item'>
            <button
              className={`nav-link ${activeTab === 'other' ? 'active' : ''}`}
              onClick={() => safeSetActiveTab('other')}
            >
              Other Details {savedTabs.other && <span className='text-success ms-1'>✓</span>}
            </button>
          </li>
        </ul>

        <div className='custom-modal-body'>
          {error && <div className='alert alert-danger'>{error}</div>}

          <div className='row'>
            {activeTab === 'personal' && (
              <PersonalData
                presentRankId={presentRankId}
                setPresentRankId={setPresentRankId}
                rankAppliedForId={rankAppliedForId}
                setRankAppliedForId={setRankAppliedForId}
                familyName={familyName}
                setFamilyName={setFamilyName}
                telNo={telNo}
                setTelNo={setTelNo}
                name={name}
                setName={setName}
                contactNumber={contactNumber}
                setContactNumber={setContactNumber}
                email={email}
                setEmail={setEmail}
                alternateMobNo={alternateMobNo}
                setAlternateMobNo={setAlternateMobNo}
                dateOfBirth={dateOfBirth}
                setDateOfBirth={setDateOfBirth}
                skypeId={skypeId}
                setSkypeId={setSkypeId}
                nationality={nationality}
                setNationality={setNationality}
                placeOfBirth={placeOfBirth}
                setPlaceOfBirth={setPlaceOfBirth}
                dateOfAvailability={dateOfAvailability}
                setDateOfAvailability={setDateOfAvailability}
                maritalStatus={maritalStatus}
                setMaritalStatus={setMaritalStatus}
                department={department}
                setDepartment={setDepartment}
                willingToAcceptLowerRank={willingToAcceptLowerRank}
                setWillingToAcceptLowerRank={setWillingToAcceptLowerRank}
                boilerSuitSize={boilerSuitSize}
                setBoilerSuitSize={setBoilerSuitSize}
                heightCms={heightCms}
                setHeight={setHeight}
                weightKgs={weightKgs}
                setWeight={setWeight}
                bmiIndex={bmiIndex}
                setBmiIndex={setBmiIndex}
                bloodGroup={bloodGroup}
                setBloodGroup={setBloodGroup}
                shoeSize={shoeSize}
                setShoeSize={setShoeSize}
                address={address}
                setAddress={setAddress}
                notes={notes}
                setNotes={setNotes}
                roleId={roleId}
                selectedCompany={selectedCompany}
                setSelectedCompany={setSelectedCompany}
                selectedCompanyAdmin={selectedCompanyAdmin}
                setSelectedCompanyAdmin={setSelectedCompanyAdmin}
                companies={companies}
                companyAdmins={companyAdmins}
                companiesbyAdmin={companiesbyAdmin}
                fetchCompaniesByAdmin={fetchCompaniesByAdmin}
                roleEntityId={roleEntityId}
                fieldErrors={fieldErrors}
                ranks={ranks}
                bloodGroupOptions={bloodGroupOptions}
                lockCoreFields={true}   
                operatorActsLikeSuperadmin={operatorActsLikeSuperadmin}
                operatorActsLikeGroupAdmin={operatorActsLikeGroupAdmin}  
              />
            )}
            {activeTab === 'documents' && (
              <Documents
                documentForm={documentForm}
                handleDocumentFormChange={handleDocumentFormChange}
                fieldErrors={fieldErrors}
                existingDocument={existingDocument}
                crewId={crewId}
              />
            )}
            {activeTab === 'academic' && (
              <AcademicBackground
                academicBackgrounds={academicBackgrounds}
                handleAcademicBackgroundChange={handleAcademicBackgroundChange}
                handleAddAcademicBackground={handleAddAcademicBackground}
                handleRemoveAcademicBackground={handleRemoveAcademicBackground}
                existingAcademicDetails={existingAcademicDetails}
                fieldErrors={fieldErrors}
              />
            )}
            {activeTab === 'watchkeeping' && (
              <WatchkeepingCertificates
                crewId={crewId}
                watchkeepingCertificates={watchkeepingCertificates}
                handleWatchkeepingCertificateChange={handleWatchkeepingCertificateChange}
                fieldErrors={fieldErrors}
                existingWatchkeepingCertificates={existingWatchkeepingCertificates}
              />
            )}

            {activeTab === 'kin' && (
              <NextOfKin
                nextOfKin={nextOfKin}
                onChange={handleNextOfKinChange}
                onSubmit={handleNextOfKinSubmit}
                errors={fieldErrors}
              />
            )}
            {activeTab === 'courses' && (
  <CoursesCertificates
    crewId={crewId}
    courseCertificates={courseCertificates}
    handleCourseCertificateChange={handleCourseCertificateChange}
    fieldErrors={fieldErrors}
    existingCourseCertificates={existingCourseCertificates}
  />
)}

            {activeTab === 'seaService' && (
              <SeaService
                seaServices={seaServices}
                handleSeaServiceChange={handleSeaServiceChange}
                handleAddSeaService={handleAddSeaService}
                handleRemoveSeaService={handleRemoveSeaService}
                fieldErrors={fieldErrors}
              />
            )}
            {activeTab === 'flagDocs' && (
              <FlagDocuments
                ref={flagRef}
                crewId={crewId}
                fieldErrors={fieldErrors}
                markSaved={() => {
                  setSavedTabs((s) => ({...s, flagDocs: true}))
                  setIsFlagsDirty(false)
                }}
                setIsDirty={(dirty) => setIsFlagsDirty(dirty)}
                existingFlagDocuments={existingFlagDocuments}
              />
            )}
            {activeTab === 'other' && (
              <OtherDetails
                additionalDetails={additionalDetails}
                setAdditionalDetails={setAdditionalDetails}
                references={references}
                setReferences={setReferences}
                existingAdditionalDetails={existingAdditionalDetails}
                errors={fieldErrors}
                onSubmit={handleAdditionalDetailsSubmit}
              />
            )}
          </div>
        </div>

        <div className='d-flex gap-2 justify-content-end'>
          <button className='btn btn-secondary mt-4' onClick={onClose}>
            Cancel
          </button>

          {activeTab === 'personal' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button
                className='btn btn-primary'
                onClick={handleSavePersonal}
                disabled={!isPersonalDirty}
              >
                {'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'documents' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('personal')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleDocumentSubmit}
                disabled={!isDocumentDirty}
              >
                {existingDocument?.id ? 'Update & Next →' : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'academic' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('documents')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleAcademicSubmit}
                disabled={!isAcademicDirty}
              >
                {existingAcademicDetails.length > 0 ? 'Update & Next →' : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'watchkeeping' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('academic')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleWatchkeepingSubmit}
                disabled={!isWatchkeepingDirty}
              >
                {existingWatchkeepingCertificates.length > 0 ? 'Update & Next →' : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'kin' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('watchkeeping')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleNextOfKinSubmit}
                disabled={!isNextOfKinDirty}
              >
                {existingNextOfKin?.id ? 'Update & Next →' : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'courses' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('kin')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleCourseCertificatesSubmit}
                disabled={!isCoursesDirty}
              >
                {existingCourseCertificates?.length > 0 ? 'Update & Next →' : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'seaService' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('courses')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleSeaServiceSubmit}
                disabled={!isSeaServiceDirty}
              >
                {existingSeaServices?.length > 0 ? 'Update & Next →' : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'flagDocs' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              {/* Back to Sea Service */}
              <button className='btn btn-light' onClick={() => safeSetActiveTab('seaService')}>
                ← Back
              </button>

              {/* Save / Update (stay on this tab) */}
              <button
                className='btn btn-outline-primary'
                disabled={!isFlagsDirty}
                onClick={async () => {
                  if (!isFlagsDirty) return
                  const saved = await flagRef.current?.saveAll()
                  if (!saved) return
                  // stay on Flag tab, just show toast from inside saveAll
                }}
              >
                {existingFlagDocuments && existingFlagDocuments.length > 0 ? 'Update' : 'Save'}
              </button>

              {/* Save & Next / Update & Next */}
              <button
                className='btn btn-primary'
                onClick={async () => {
                  if (isFlagsDirty) {
                    const saved = await flagRef.current?.saveAll()
                    if (!saved) return // if save fails, don't go ahead
                  }
                  safeSetActiveTab('other')
                }}
              >
                {!isFlagsDirty
                  ? 'Next →'
                  : existingFlagDocuments && existingFlagDocuments.length > 0
                  ? 'Update & Next →'
                  : 'Save & Next →'}
              </button>
            </div>
          )}
          {activeTab === 'other' && (
            <div className='d-flex gap-2 justify-content-end mt-4'>
              <button className='btn btn-light' onClick={() => safeSetActiveTab('flagDocs')}>
                ← Back
              </button>
              <button
                className='btn btn-primary'
                onClick={handleAdditionalDetailsSubmit}
                disabled={!isAdditionalDetailsDirty}
              >
                {existingAdditionalDetails?.id ? 'Update' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EditCrewModal
