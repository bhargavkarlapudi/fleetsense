import React, {FC, useEffect, useState} from 'react'
import {toast} from 'react-toastify'
import {KTSVG} from '../../../../_metronic/helpers'
import {useLocation, useNavigate} from 'react-router-dom'
import CreateReportModal from './CreateReportModal'
import {Company, CompanyAdmin, CreatedReports, Voyage} from '../core/_models'
import {
  getAssignmentById,
  getCompanyList,
  getCreatedReportById,
  getVoyageList,
} from '../core/_requests'
import DeleteCreatedReportModal from './DeleteCreatedReportModal'
import {getCompanyAdminList, getVesselList} from '../../Management/core/_requests'
import {Vessel} from '../../Management/core/_models'
import AddVoyageModal from './AddVoyageModal'
import isEqual from 'lodash/isEqual'
import {useAuth} from '../../auth'
import * as XLSX from 'xlsx'
// import PositionReportNew from './PositionReportNew'
// ✅ ADD THIS near the top-level of the file (after imports) once per project
declare global {
  interface DocumentEventMap {
    'opslist-open-create-modal': CustomEvent<void>;
  }
}

const OperationsList: FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  // ---------------- NEW HELPERS START ----------------
  // label normalizer to match "Report Date Time" robustly
  const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

  // cache to avoid refetching same assignment repeatedly
  const assignmentCache = new Map<number, any>()

  // find the fieldId(s) inside an assignment template that correspond to "Report Date Time"
  const getReportDateFieldIds = (assignment: any): number[] => {
    const tmpl = assignment?.template ?? assignment?.customTemplate
    if (!tmpl?.menus) return []
    const ids: number[] = []
    for (const menu of tmpl.menus || []) {
      for (const sub of menu.submenus || []) {
        for (const f of sub.fields || []) {
          const label = norm(f.label || '')
          const isTarget =
            label === 'report date time' ||
            label.includes('report date') || // tolerant
            (f.fieldType === 'datetime' && label.includes('report'))
          if (isTarget) ids.push(f.id)
        }
      }
    }
    return ids
  }

  // read the reportDateTime from report.values by matching the field id(s)
  const pickReportDateFromValues = (report: any, reportDateFieldIds: number[]): string | null => {
    if (!Array.isArray(report?.values) || reportDateFieldIds.length === 0) return null
    // prefer exact label match if multiple
    for (const v of report.values) {
      if (reportDateFieldIds.includes(v.field)) {
        return v.valueText || null
      }
    }
    return null
  }

  // ISO date safe parser
  const toIsoOrNull = (s?: string | null) => {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  // enrich a single report with reportDateTime (fallbacks to submitted -> created)
  const enrichOneReport = async (r: any): Promise<any> => {
    let assignment = assignmentCache.get(r?.assignment?.id)
    if (!assignment && r?.assignment?.id) {
      assignment = await getAssignmentById(r.assignment.id)
      assignmentCache.set(r.assignment.id, assignment)
    }
    const fieldIds = getReportDateFieldIds(assignment)
    const fromValues = pickReportDateFromValues(r, fieldIds)

    const reportDateTime =
      toIsoOrNull(fromValues) ||
      toIsoOrNull(r?.submittedDateTime) ||
      toIsoOrNull(r?.createdDateTime) ||
      null

    return {...r, reportDateTime}
  }

  // small concurrency pool (no extra deps)
  const parallelMap = async <T, R>(
    arr: T[],
    limit: number,
    fn: (x: T) => Promise<R>
  ): Promise<R[]> => {
    const ret: R[] = new Array(arr.length)
    let i = 0
    const workers = new Array(Math.min(limit, arr.length)).fill(0).map(async () => {
      while (i < arr.length) {
        const cur = i++
        ret[cur] = await fn(arr[cur])
      }
    })
    await Promise.all(workers)
    return ret
  }
  // ---------------- NEW HELPERS END ----------------

  const {pathname} = useLocation()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false)
  const [isDeleteCreatedReportModalOpen, setIsDeleteCreatedReportModalOpen] =
    useState<boolean>(false)
  const openModal = () => {
    setIsCreateModalOpen(true)
  }
  const closeModal = () => setIsCreateModalOpen(false)
  useEffect(() => {
  const handler = () => openModal()
  // TS-safe: our declaration above lets the event name type-check
  document.addEventListener('opslist-open-create-modal', handler as EventListener)

  return () => {
    document.removeEventListener('opslist-open-create-modal', handler as EventListener)
  }
}, [])

  const [voyages, setVoyages] = useState<Voyage[]>([])
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [vesselName, setVesselName] = useState('')
  const [vesselType, setVesselType] = useState('')
  const [imoNumber, setImoNumber] = useState('')
  const [selectedVoyage, setSelectedVoyage] = useState<Voyage | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVessel, setSelectedVessel] = useState<Vessel>()

  const [companies, setCompanies] = useState<Company[]>([])
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([])
  const [didUserSelectVoyage, setDidUserSelectVoyage] = useState(false)
  const [expandedCompanyAdminId, setExpandedCompanyAdminId] = useState<number | null>(null)
  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null)
  const [expandedVesselId, setExpandedVesselId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [draftReportId, setDraftReportId] = useState(0)
  const [reports, setReports] = useState<any[]>([])
  const [isAddVoyageModalOpen, setIsAddVoyageModalOpen] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'view1' | 'view2'>('view1')
  // const roleId = sessionStorage.getItem("roleId");
  const {currentUser} = useAuth()
  const roleId = currentUser?.role?.id
  const companyGroupAdminId = currentUser?.companyGroupAdminId
  const roleEntityId = currentUser?.roleEntityId
  const navigate = useNavigate()
  const [hasWarningsTrue, setHasWarningsTrue] = useState(0)
  const [hasWarningsFalse, setHasWarningsFalse] = useState(0)
  const indexOfLast = currentPage * rowsPerPage
  const indexOfFirst = indexOfLast - rowsPerPage
  const currentReports = reports.slice(indexOfFirst, indexOfLast)
  // const roleEntityId = sessionStorage.getItem("roleEntityId");
  const totalPages = Math.ceil(reports.length / rowsPerPage)
  const [sortConfig, setSortConfig] = useState<{
    key: 'reportType' | 'legId' | 'reportDateTime' | 'createdBy' | 'status' | null
    direction: 'asc' | 'desc'
  }>({
    key: 'reportDateTime', // default sort by Report Date & Time
    direction: 'desc', // latest first
  })
  const handleSort = (key: typeof sortConfig.key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value))
    setCurrentPage(1) // reset to first page
  }

  useEffect(() => {
    if (selectedVoyage !== null) {
      setSearchTerm('')
    }
  }, [selectedVoyage])

  useEffect(() => {
    fetchVoyages()
    if (roleId === 1 || (roleId === 6 && companyGroupAdminId == null)) {
      fetchCompanyAdmins()
    }
    fetchCompanies()
    fetchVessels()
  }, [])

  useEffect(() => {
    setDidUserSelectVoyage(false)
  }, [pathname])

  useEffect(() => {
    console.log('current reports', currentReports)
  }, [currentReports])

  useEffect(() => {
    console.log('role entity id', roleEntityId)
  }, [roleEntityId])

  useEffect(() => {
    if (!voyages.length) return

    // Select the first voyage
    const firstVoyage = voyages[0]
    setSelectedVoyage(firstVoyage) // Set the selected voyage
    setDidUserSelectVoyage(true)

    // Expand the relevant accordions based on the selected voyage
    if (firstVoyage.companyGroupAdminId) {
      setExpandedCompanyAdminId(firstVoyage.companyGroupAdminId) // Expand company group admin accordion
      console.log('expanded companyid: ', firstVoyage.companyGroupAdminId)
    }
    if (firstVoyage.companyAdminId) {
      setExpandedCompanyId(firstVoyage.companyAdminId) // Expand company admin accordion
      console.log('expanded sub companyid: ', firstVoyage.companyAdminId)
    }
    setExpandedVesselId(firstVoyage.vessel!.id) // Expand the vessel accordion
    console.log('expanded vessel id: ', firstVoyage.vessel!.id)
  }, [voyages])

  useEffect(() => {
    if (selectedVoyage) {
      setImoNumber(selectedVoyage?.vessel.imoNumber)
      setVesselType(selectedVoyage?.vessel.vesselType)
      setVesselName(selectedVoyage?.vessel.fleet_name)
      fetchCreatedReportsList()
      console.log(selectedVoyage)
    }
  }, [selectedVoyage])

  useEffect(() => {
    if (!reports || reports.length === 0) return

    const {hasWarningsTrue, hasWarningsFalse} = reports.reduce(
      (acc, report) => {
        if (report.hasWarnings) {
          acc.hasWarningsTrue += 1
        } else {
          acc.hasWarningsFalse += 1
        }
        return acc
      },
      {hasWarningsTrue: 0, hasWarningsFalse: 0}
    )

    setHasWarningsTrue(hasWarningsTrue)
    setHasWarningsFalse(hasWarningsFalse)
  }, [reports])

  useEffect(() => {
    fetchCreatedReportsList()
  }, [searchTerm])
  useEffect(() => {
    console.log(voyages)
  }, [voyages])

  useEffect(() => {
    if (!sortConfig.key) return

    const key = sortConfig.key
    const dir = sortConfig.direction === 'asc' ? 1 : -1

    const sorted = [...reports].sort((a: any, b: any) => {
      let valA: any
      let valB: any

      if (key === 'createdBy') {
        valA = a.createdBy?.rank || ''
        valB = b.createdBy?.rank || ''
        valA = valA.toString().toLowerCase()
        valB = valB.toString().toLowerCase()
      } else if (key === 'reportDateTime') {
        const da = a.reportDateTime ? new Date(a.reportDateTime).getTime() : 0
        const db = b.reportDateTime ? new Date(b.reportDateTime).getTime() : 0
        return (da - db) * dir
      } else {
        valA = a[key] ?? ''
        valB = b[key] ?? ''
        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()
      }

      if (valA < valB) return -1 * dir
      if (valA > valB) return 1 * dir
      return 0
    })

    setReports(sorted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortConfig.key, sortConfig.direction]) // avoid depending on reports.length to prevent loops

  const handleSearchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vesselName = e.target.value
    setSearchTerm(vesselName)

    // Only search for vessels if vesselName is not empty
    if (vesselName.trim() !== '') {
      const searchedVessel = vessels.filter((vessel: any) =>
        vessel.fleet_name.toLowerCase().includes(vesselName.toLowerCase())
      )

      // Only set the selected vessel if there's at least one match
      if (searchedVessel.length > 0) {
        setSelectedVessel(searchedVessel[0]) // Set the first matching vessel
      } else {
        setSelectedVessel(undefined) // Reset if no matches found
      }

      setVesselName(searchedVessel[0].fleet_name)
      setImoNumber(searchedVessel[0].imoNumber)
      setVesselType(searchedVessel[0].vesselType)
      setSelectedVoyage(null)

      console.log(searchedVessel) // Log the filtered vessels
    } else {
      // If the search term is empty, reset the selected vessel
      setSelectedVessel(undefined)
      const firstVoyage = voyages[0]
      setSelectedVoyage(firstVoyage)
    }
  }

  const filteredVessels = vessels.filter((vessel) =>
    vessel.fleet_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const fetchCompanyAdmins = async () => {
    try {
      const companyList = await getCompanyAdminList()
      console.log('Company List:', companyList)

      const activeCompanies = companyList.filter((company) => company.active === true)

      setCompanyAdmins(activeCompanies)
    } catch (error) {
      console.error('Failed to fetch company list:', error)
    }
  }

  const mapCreatedValuesToFormData = (
    values: CreatedReports['values'],
    menus:
      | CreatedReports['assignment']['template']['menus']
      | CreatedReports['assignment']['customTemplate']['menus']
  ) => {
    console.log('Menus:', menus)
    console.log('Menus:', menus)
    const result: {
      [submenuId: number]: {
        [id: number]: {
          fieldLabel: string
          value: any
        }
      }
    } = {}

    console.log('Draft values:', values)
    console.log('Menus structure:', menus)

    for (const entry of values) {
      const fieldId = entry.field
      const fieldValue = entry.valueText

      for (const menu of menus) {
        for (const submenu of menu.submenus) {
          const matchingField = submenu.fields?.find((field) => field.id === fieldId)

          if (matchingField) {
            console.log(`Matched field ${matchingField.label} in submenu ${submenu.name}`)

            if (!result[submenu.id]) {
              result[submenu.id] = {}
            }

            result[submenu.id][matchingField.id] = {
              fieldLabel: matchingField.label,
              value: fieldValue,
            }
          }
        }
      }
    }

    console.log('Mapped result:', result)
    return result
  }

  const handlePreviewReportView = async (draftReport: CreatedReports) => {
    try {
      if (!draftReport?.assignment?.id) return

      const assignment = await getAssignmentById(draftReport.assignment.id)
      const templateData = assignment?.template ?? assignment?.customTemplate

      if (!templateData || !templateData.menus) {
        toast.error('No valid report template found.')
        return
      }

      const flattenedSubmenus = templateData.menus.flatMap((menu) => menu.submenus || [])
      const activeSubmenus = templateData.menus
        .filter((menu) => menu.isActive)
        .flatMap((menu) => menu.submenus.filter((submenu) => submenu.isActive))

      const mappedFormData = mapCreatedValuesToFormData(draftReport.values, templateData.menus)

      console.log(draftReport)
      navigate('/operations/report-preview', {
        state: {
          formData: mappedFormData,
          tabs: activeSubmenus,
          assignmentId: assignment.id,
          selectedVoyage: selectedVoyage,
          selectedReport: draftReport,
          reportDate: draftReport.submittedDateTime || new Date().toISOString(),
          stepCompletionStatus: [],
          readOnly: true,
          allValues: draftReport.values,
          vesselId: selectedVoyage?.vessel?.id, // pass explicitly
        },
      })
    } catch (err) {
      console.error('Error while preparing preview:', err)
      toast.error('Failed to open preview.')
    }
  }

  const handleDownload = async (draftReport: CreatedReports) => {
    try {
      if (!draftReport?.assignment?.id) return

      // ✅ Fetch assignment & template
      const assignment = await getAssignmentById(draftReport.assignment.id)
      const templateData = assignment?.template ?? assignment?.customTemplate

      if (!templateData || !templateData.menus) {
        toast.error('No valid report template found.')
        return
      }

      // ✅ Filter active submenus
      const activeSubmenus = templateData.menus
        .filter((menu) => menu.isActive)
        .flatMap((menu) => menu.submenus.filter((submenu) => submenu.isActive))

      // ✅ Map values into form data
      const mappedFormData = mapCreatedValuesToFormData(draftReport.values, templateData.menus)

      const pdfContainer = document.getElementById('pdf-preview')
      if (!pdfContainer) return

      pdfContainer.innerHTML = ''
      const content = document.createElement('div')

      // Header section
      let html = `
            <div style="font-family: Arial, sans-serif; font-size: 14px;">
                <h2>${draftReport.reportType}</h2>
                <p><strong>Vessel Name:</strong> ${selectedVoyage?.vessel?.fleet_name ?? '--'}</p>
                <p><strong>IMO Number:</strong> ${selectedVoyage?.vessel?.imoNumber ?? '--'}</p>
                <p><strong>Vessel Type:</strong> ${selectedVoyage?.vessel?.vesselType ?? '--'}</p>
                <p><strong>Voyage:</strong> ${selectedVoyage?.voyageNumber ?? '--'} | ${
        selectedVoyage?.departurePort ?? ''
      } - ${selectedVoyage?.arrivalPort ?? ''}</p>
                <p><strong>Date:</strong> ${
                  draftReport.submittedDateTime || new Date().toISOString()
                }</p>
                <hr />
        `

      // ✅ Process each active submenu
      activeSubmenus.forEach((tab) => {
        const fieldValues = mappedFormData[tab.id] || {}
        const tabFields = tab.fields || []

        if (tabFields.length === 0) {
          html += `<h3 style="margin-top: 20px;">${tab.name}</h3><p>No fields defined.</p>`
          return
        }

        html += `<h3 style="margin-top: 20px;">${tab.name}</h3>`

        // === Start/Stop Lat/Lon like preview ===

        // Helper to merge labels/values (keep your existing block if already present)
        const mergedFields = tabFields.map((field) => {
          const value = fieldValues?.[field.id]?.value ?? '--'
          return [field.label, value] as [string, string]
        })

        // Helpers
        const norm = (s: string) => s.toLowerCase().replace(/postion/g, 'position') // fix common typo
        const isPart = (l: string) => /(deg|min|sec|direction)/i.test(l)

        const pick = (kind: 'latitude' | 'longitude', which: 'start' | 'stop' | 'generic') =>
          mergedFields.filter(([label]) => {
            const l = norm(label)
            if (!(l.includes(kind) && isPart(l))) return false
            if (which === 'start') return l.includes('start')
            if (which === 'stop') return l.includes('stop')
            return !l.includes('start') && !l.includes('stop')
          })

        const formatDMS = (pairs: [string, string][]) => {
          const getVal = (needle: 'deg' | 'min' | 'sec' | 'direction') =>
            pairs.find(([lbl]) => norm(lbl).includes(needle))?.[1] ?? '--'
          const deg = getVal('deg'),
            min = getVal('min'),
            sec = getVal('sec'),
            dir = getVal('direction')
          if (deg === '--' && min === '--' && sec === '--' && dir === '--') return '--°--′--″--'
          return `${deg}°${min}′${sec}″${dir}`
        }

        // Split into Start / Stop / Generic
        const latStart = pick('latitude', 'start')
        const latStop = pick('latitude', 'stop')
        const latGeneric = pick('latitude', 'generic')

        const lonStart = pick('longitude', 'start')
        const lonStop = pick('longitude', 'stop')
        const lonGeneric = pick('longitude', 'generic')

        const hasLat = latStart.length || latStop.length || latGeneric.length
        const hasLon = lonStart.length || lonStop.length || lonGeneric.length

        // Row 1: Latitude (Start | Stop)
        if (hasLat) {
          html += `<div style="display:flex; gap:20px; margin-bottom:10px;">`
          if (latStart.length || latGeneric.length) {
            const label = latStart.length ? 'Start Position Latitude' : 'Latitude'
            const value = formatDMS(latStart.length ? latStart : latGeneric)
            html += `<div style="flex:1;"><div style="color:#888;">${label}:</div><strong>${value}</strong></div>`
          }
          if (latStop.length) {
            html += `<div style="flex:1;"><div style="color:#888;">Stop Position Latitude:</div><strong>${formatDMS(
              latStop
            )}</strong></div>`
          }
          html += `</div>`
        }

        // Row 2: Longitude (Start | Stop)
        if (hasLon) {
          html += `<div style="display:flex; gap:20px; margin-bottom:10px;">`
          if (lonStart.length || lonGeneric.length) {
            const label = lonStart.length ? 'Start Position Longitude' : 'Longitude'
            const value = formatDMS(lonStart.length ? lonStart : lonGeneric)
            html += `<div style="flex:1;"><div style="color:#888;">${label}:</div><strong>${value}</strong></div>`
          }
          if (lonStop.length) {
            html += `<div style="flex:1;"><div style="color:#888;">Stop Position Longitude:</div><strong>${formatDMS(
              lonStop
            )}</strong></div>`
          }
          html += `</div>`
        }

        // Remaining fields (exclude only the DMS parts)
        const filteredFields = mergedFields.filter(([label]) => {
          const l = norm(label)
          return !((l.includes('latitude') || l.includes('longitude')) && isPart(l))
        })

        // Render remaining fields in rows of 4
        const chunkSize = 4
        for (let i = 0; i < filteredFields.length; i += chunkSize) {
          const chunk = filteredFields.slice(i, i + chunkSize)
          html += `<div style="display:flex; gap:20px; margin-bottom:10px;">`
          chunk.forEach(([label, value]) => {
            html += `
      <div style="flex:1;">
        <div style="color:#888;">${label}:</div>
        <strong>${value}</strong>
      </div>
    `
          })
          html += `</div>`
        }
      })

      html += `</div>`

      content.innerHTML = html
      pdfContainer.appendChild(content)

      // ✅ Generate the PDF
      setTimeout(() => {
        import('html2pdf.js').then((html2pdf) => {
          html2pdf
            .default()
            .from(pdfContainer)
            .set({
              margin: 0.5,
              filename: `${draftReport.reportType || ''}_${
                draftReport.submittedDateTime || new Date().toISOString()
              }.pdf`,
              html2canvas: {scale: 2},
              jsPDF: {unit: 'in', format: 'a4', orientation: 'portrait'},
            })
            .save()
        })
      }, 300)
    } catch (err) {
      console.error('Error while preparing preview:', err)
      toast.error('Failed to open preview.')
    }
  }

  const fetchCompanies = async () => {
    try {
      const companyList = await getCompanyList()
      console.log(companyList)

      setCompanies(companyList)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    }
  }

  const fetchVessels = async () => {
    try {
      const vesselList = await getVesselList()
      console.log('Vessel List:', vesselList)

      setVessels(vesselList)
    } catch (error) {
      console.error('Failed to fetch company list:', error)
    }
  }

  const fetchVoyages = async () => {
    try {
      const voyageList = await getVoyageList()

      setVoyages(voyageList)
    } catch (error) {
      console.error('Failed to fetch voyage list:', error)
    }
  }

  const fetchCreatedReportsList = async () => {
    try {
      // 1) Fetch the raw list
      const reportsList = await getCreatedReportById()

      // 2) Filter by the selected voyage or vessel search
      const currentVoyageId = selectedVoyage?.id
      let filteredReports = reportsList

      if (searchTerm) {
        filteredReports = reportsList.filter(
          (report: any) => report.vesselId === selectedVessel?.id
        )
      } else {
        filteredReports = reportsList.filter((report: any) => report.voyage === currentVoyageId)
      }

      // 3) Remove drafts for certain roles
      if ([1, 2, 5].includes(roleId!)) {
        filteredReports = filteredReports.filter((report: any) => report.status !== 'DRAFT')
      }

      // 4) Enrich each report with reportDateTime from assignment/template values
      const enriched = await parallelMap(filteredReports, 4, enrichOneReport)

      // 5) Default sort: latest first on reportDateTime
      enriched.sort((a, b) => {
        const da = a.reportDateTime ? new Date(a.reportDateTime).getTime() : 0
        const db = b.reportDateTime ? new Date(b.reportDateTime).getTime() : 0
        return db - da
      })

      // 6) Only update state if the array really changed
      setReports((prev) => (isEqual(prev, enriched) ? prev : enriched))
    } catch (error) {
      console.error('Failed to fetch created reports list:', error)
    }
  }

  const handleExcelDownload = () => {
    const table = document.querySelector('.report-table table') as HTMLTableElement
    if (!table) return

    const workbook = XLSX.utils.table_to_book(table, {sheet: 'reports'})
    XLSX.writeFile(workbook, 'reports.xlsx')
  }

  return (
    <div
      className='app-main flex-column flex-row-fluid'
      id='kt_app_main'
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <div
        className='d-flex flex-column flex-column-fluid'
        style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}
      >
        <div
          id='kt_app_content'
          className='app-content flex-column-fluid d-flex flex-column '
          style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}
        >
          <div
            className='card flex-column-fluid d-flex flex-column'
            style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}
          >
            {/* Header */}
            <div className='d-flex border-top' style={{flex: 1, minHeight: 0, overflow: 'hidden'}}>
              <div
                className={`border-end pt-3 ps-1 overflow-auto`}
                style={{
                  maxHeight: 'calc(100vh - 60px)',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff',
                  maxWidth: '18rem',
                }}
              >
                <div className='px-5 mb-4'>
                  <div className='d-flex justify-content-between align-items-center'>
                    {roleId === 4 && (
                      <>
                        <h6 className='mb-3'>Voyage List</h6>
                        <p style={{color: '#6B7280', fontWeight: '400'}}>
                          {voyages.length} Voyages
                        </p>
                      </>
                    )}
                    {roleId === 1 ||
                      (roleId === 6 && companyGroupAdminId == null && (
                        <>
                          <h6 className='mb-3'>Vessels</h6>
                          <p style={{color: '#6B7280', fontWeight: '400'}}>
                            {vessels.length} vessels
                          </p>
                        </>
                      ))}
                  </div>
                  <div className='d-flex align-items-center gap-2'>
                    {roleId === 4 && (
                      <select
                        className='form-select'
                        value={searchTerm}
                        onChange={handleSearchChange}
                      >
                        {<option value=''>Select Vessel</option>}
                        {vessels.map((vessel, index) => (
                          <option key={index} value={vessel.fleet_name}>
                            {vessel.fleet_name}
                          </option>
                        ))}
                      </select>
                    )}
                    {/* <input type="text" className="form-control cp_search_input" placeholder=" Search" value={searchTerm}
                                             /> */}
                    {/* <KTSVG path='/media/icons/duotune/general/filter.svg' className='svg-icon-2x' /> */}
                  </div>
                </div>
                {/* <div className='d-flex justify-content-end py-4 pe-5 gap-1'>
                                    <KTSVG path='/media/map/complete.svg' className='svg-icon-2' /><span className='text-muted pe-1'>{hasWarningsTrue}</span>
                                    <KTSVG path='/media/map/Incomplete.svg' className='svg-icon-2' /><span className='text-muted'>{hasWarningsFalse}</span>
                                </div> */}
                {/* <h5 className="mt-6 mb-3">Vessel Name</h5> */}
                {/* Crew member */}
                {selectedVessel && (
                  <div className='accordion' id='vesselAccordionRole2'>
                    <div key={selectedVessel.id} className='accordion-item'>
                      <h2 className='accordion-header' id={`heading-vessel-${selectedVessel.id}`}>
                        <button
                          className='accordion-button'
                          type='button'
                          data-bs-toggle='collapse'
                          data-bs-target={`#collapse-vessel-${selectedVessel.id}`}
                          aria-expanded={true}
                          aria-controls={`collapse-vessel-${selectedVessel.id}`}
                        >
                          {selectedVessel.fleet_name}
                        </button>
                      </h2>

                      <div
                        id={`collapse-vessel-${selectedVessel.id}`}
                        className='accordion-collapse show' // Ensures the accordion is open
                        aria-labelledby={`heading-vessel-${selectedVessel.id}`}
                        data-bs-parent='#vesselAccordionRole2'
                      >
                        <div className='accordion-body'>
                          {/* Display voyages for the selected vessel */}
                          <ul className='list-group list-group-flush'>
                            {voyages
                              .filter((v) => v.vessel?.id === selectedVessel.id)
                              .map((voyage) => {
                                const isActive = selectedVoyage?.id === voyage.id
                                return (
                                  <li
                                    key={voyage.id}
                                    className={`list-group-item ${isActive ? 'current' : ''}`}
                                    style={{cursor: 'pointer', border: 'none'}}
                                    onClick={() => {
                                      setSelectedVoyage(voyage)
                                      setDidUserSelectVoyage(true)
                                      // Keep the vessel expanded on selection
                                      setExpandedVesselId(selectedVessel.id)
                                    }}
                                  >
                                    <div
                                      className='fw-bold'
                                      // The title attribute shows the full text on hover
                                      title={`${voyage.voyageNumber}: ${voyage.departurePort} – ${voyage.arrivalPort}`}
                                      style={{
                                        color: '#111928',
                                        whiteSpace: 'nowrap', // Prevents text from wrapping to a new line
                                        overflow: 'hidden', // Hides the overflowing text
                                        textOverflow: 'ellipsis', // Adds the "..."
                                        display: 'block', // Ensures the element behaves correctly for overflow
                                      }}
                                    >
                                      {voyage.voyageNumber}: {voyage.departurePort} –{' '}
                                      {voyage.arrivalPort}
                                    </div>
                                    <div className='text-muted'>
                                      {new Date(voyage.startDate).toLocaleDateString('en-GB')} –{' '}
                                      {new Date(voyage.endDate).toLocaleDateString('en-GB')}
                                    </div>
                                    {voyage.active && (
                                      <div className='badge bg-warning text-dark mt-1'>Current</div>
                                    )}
                                  </li>
                                )
                              })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {roleId === 4 && !selectedVessel && (
                  <ul className='list-group'>
                    {voyages.map((voyage, i) => {
                      const isCurrent = voyage.active
                      const isActive = selectedVoyage?.id === voyage.id
                      return (
                        <li
                          key={i}
                          className={`list-group-item ${isActive ? 'current' : ''}`}
                          onClick={() => {
                            setSelectedVoyage(voyage)
                            setDidUserSelectVoyage(true)
                          }}
                          style={{cursor: 'pointer', border: 'none'}}
                        >
                          <div
                            className='title pb-1'
                            title={`${voyage.voyageNumber}: ${voyage.departurePort} - ${voyage.arrivalPort}`}
                            style={{
                              color: '#111928',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'block',
                              maxWidth: '100%', // Ensures it doesn't overflow container
                            }}
                          >
                            {voyage.voyageNumber}: {voyage.departurePort} - {voyage.arrivalPort}
                          </div>

                          <div className='details pb-1'>
                            {new Date(voyage.startDate).toLocaleDateString('en-GB')} -{' '}
                            {voyage?.endDate
                              ? new Date(voyage.endDate).toLocaleDateString('en-GB')
                              : ''}
                          </div>

                          {isCurrent && (
                            <div className='badge' style={{backgroundColor: '#FDF6B2'}}>
                              Current
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
                {/* Superadmin */}
                {(roleId === 1 || (roleId === 6 && companyGroupAdminId == null)) &&
                  !selectedVessel && (
                    <div className='accordion' id='companyAdminAccordion'>
                      {companyAdmins.map((admin) => {
                        const isAdminOpen = expandedCompanyAdminId === admin.id
                        const adminVessels = vessels.filter(
                          (v) => v.companyGroupAdmin?.id === admin.id && v.active
                        )
                        const orphanVessels = adminVessels.filter((v) => !v.companyAdmin?.id)
                        const adminCompanies = companies.filter(
                          (c) => c.cga?.id === admin.id && c.active
                        )

                        return (
                          <div key={admin.id} className='accordion-item'>
                            <h2 className='accordion-header' id={`heading-admin-${admin.id}`}>
                              <button
                                className={`accordion-button ${isAdminOpen ? '' : 'collapsed'}`}
                                type='button'
                                data-bs-toggle='collapse'
                                data-bs-target={`#collapse-admin-${admin.id}`}
                                aria-expanded={isAdminOpen}
                                aria-controls={`collapse-admin-${admin.id}`}
                                onClick={() =>
                                  setExpandedCompanyAdminId(isAdminOpen ? null : admin.id)
                                }
                              >
                                <div style={{maxWidth: '180px'}}>
                                  <span
                                    className='fw-semibold small text-truncate'
                                    title={admin.name}
                                    style={{
                                      maxWidth: '100%',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-block',
                                    }}
                                  >
                                    {admin.name}
                                  </span>
                                </div>
                              </button>
                            </h2>
                            <div
                              id={`collapse-admin-${admin.id}`}
                              className={`accordion-collapse collapse ${isAdminOpen ? 'show' : ''}`}
                              aria-labelledby={`heading-admin-${admin.id}`}
                              data-bs-parent='#companyAdminAccordion'
                            >
                              <div className='accordion-body py-3'>
                                {/* 1) Orphan vessels */}
                                {orphanVessels.map((vessel) => {
                                  const isOrphanOpen = expandedVesselId === vessel.id
                                  const vesselVoyages = voyages.filter(
                                    (vo) => vo.vessel?.id === vessel.id
                                  )

                                  return (
                                    <div key={vessel.id} className='accordion mb-3'>
                                      <div className='accordion-item'>
                                        <h2
                                          className='accordion-header'
                                          id={`heading-orphan-${vessel.id}`}
                                        >
                                          <button
                                            className={`accordion-button ${
                                              isOrphanOpen ? '' : 'collapsed'
                                            }`}
                                            type='button'
                                            data-bs-toggle='collapse'
                                            data-bs-target={`#collapse-orphan-${vessel.id}`}
                                            aria-expanded={isOrphanOpen}
                                            aria-controls={`collapse-orphan-${vessel.id}`}
                                            onClick={() =>
                                              setExpandedVesselId(isOrphanOpen ? null : vessel.id)
                                            }
                                            style={{minWidth: 0}} // Allow text to shrink
                                          >
                                            <span
                                              className='text-truncate'
                                              title={vessel.fleet_name}
                                              style={{
                                                display: 'inline-block',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: '100%', // or a fixed value like '200px'
                                              }}
                                            >
                                              {vessel.fleet_name}
                                            </span>
                                          </button>
                                        </h2>
                                        <div
                                          id={`collapse-orphan-${vessel.id}`}
                                          className={`accordion-collapse collapse ${
                                            isOrphanOpen ? 'show' : ''
                                          }`}
                                          aria-labelledby={`heading-orphan-${vessel.id}`}
                                          data-bs-parent={`#collapse-admin-${admin.id}`}
                                        >
                                          <div className='accordion-body'>
                                            <ul className='list-group list-group-flush'>
                                              {vesselVoyages.map((voyage) => {
                                                const isActive = selectedVoyage?.id === voyage.id
                                                return (
                                                  <li
                                                    key={voyage.id}
                                                    className={`list-group-item ${
                                                      isActive ? 'current' : ''
                                                    }`}
                                                    style={{cursor: 'pointer', border: 'none'}}
                                                    onClick={() => {
                                                      setSelectedVoyage(voyage)
                                                      setDidUserSelectVoyage(true)
                                                    }}
                                                  >
                                                    <div
                                                      className='fw-bold'
                                                      // The title attribute shows the full text on hover
                                                      title={`${voyage.voyageNumber}: ${voyage.departurePort} – ${voyage.arrivalPort}`}
                                                      style={{
                                                        color: '#111928',
                                                        whiteSpace: 'nowrap', // Prevents text from wrapping to a new line
                                                        overflow: 'hidden', // Hides the overflowing text
                                                        textOverflow: 'ellipsis', // Adds the "..."
                                                        display: 'block', // Ensures the element behaves correctly for overflow
                                                      }}
                                                    >
                                                      {voyage.voyageNumber}: {voyage.departurePort}{' '}
                                                      – {voyage.arrivalPort}
                                                    </div>
                                                    <div className='text-muted'>
                                                      {new Date(
                                                        voyage.startDate
                                                      ).toLocaleDateString('en-GB')}{' '}
                                                      –{' '}
                                                      {voyage?.endDate
                                                        ? new Date(
                                                            voyage.endDate
                                                          ).toLocaleDateString('en-GB')
                                                        : ''}
                                                    </div>
                                                    {voyage.active && (
                                                      <div className='badge bg-warning text-dark mt-1'>
                                                        Current
                                                      </div>
                                                    )}
                                                  </li>
                                                )
                                              })}
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}

                                {/* 2) Per-company accordions */}
                                <div className='accordion' id={`companyAccordion-${admin.id}`}>
                                  {adminCompanies.map((company) => {
                                    const isCompanyOpen = expandedCompanyId === company.id
                                    const companyVessels = vessels.filter(
                                      (v) => v.companyAdmin?.id === company.id && v.active
                                    )

                                    return (
                                      <div key={company.id} className='accordion-item mb-3'>
                                        <h2
                                          className='accordion-header'
                                          id={`heading-company-${company.id}`}
                                        >
                                          <button
                                            className={`accordion-button ${
                                              isCompanyOpen ? '' : 'collapsed'
                                            }`}
                                            type='button'
                                            data-bs-toggle='collapse'
                                            data-bs-target={`#collapse-company-${company.id}`}
                                            aria-expanded={isCompanyOpen}
                                            aria-controls={`collapse-company-${company.id}`}
                                            onClick={() =>
                                              setExpandedCompanyId(
                                                isCompanyOpen ? null : company.id
                                              )
                                            }
                                          >
                                            {company.name}
                                          </button>
                                        </h2>
                                        <div
                                          id={`collapse-company-${company.id}`}
                                          className={`accordion-collapse collapse ${
                                            isCompanyOpen ? 'show' : ''
                                          }`}
                                          aria-labelledby={`heading-company-${company.id}`}
                                          data-bs-parent={`#companyAccordion-${admin.id}`}
                                        >
                                          <div className='accordion-body py-3'>
                                            <div
                                              className='accordion'
                                              id={`vesselAccordion-${company.id}`}
                                            >
                                              {companyVessels.map((vessel) => {
                                                const isVesselOpen = expandedVesselId === vessel.id
                                                const vesselVoyages = voyages.filter(
                                                  (vo) => vo.vessel?.id === vessel.id
                                                )

                                                return (
                                                  <div
                                                    key={vessel.id}
                                                    className='accordion-item mb-2'
                                                  >
                                                    <h2
                                                      className='accordion-header'
                                                      id={`heading-vessel-${vessel.id}`}
                                                    >
                                                      <button
                                                        className={`accordion-button ${
                                                          isVesselOpen ? '' : 'collapsed'
                                                        }`}
                                                        type='button'
                                                        data-bs-toggle='collapse'
                                                        data-bs-target={`#collapse-vessel-${vessel.id}`}
                                                        aria-expanded={isVesselOpen}
                                                        aria-controls={`collapse-vessel-${vessel.id}`}
                                                        onClick={() =>
                                                          setExpandedVesselId(
                                                            isVesselOpen ? null : vessel.id
                                                          )
                                                        }
                                                      >
                                                        {vessel.fleet_name}
                                                      </button>
                                                    </h2>
                                                    <div
                                                      id={`collapse-vessel-${vessel.id}`}
                                                      className={`accordion-collapse collapse ${
                                                        isVesselOpen ? 'show' : ''
                                                      }`}
                                                      aria-labelledby={`heading-vessel-${vessel.id}`}
                                                      data-bs-parent={`#vesselAccordion-${company.id}`}
                                                    >
                                                      <div className='accordion-body'>
                                                        <ul className='list-group list-group-flush'>
                                                          {vesselVoyages.map((voyage) => {
                                                            const isActive =
                                                              selectedVoyage?.id === voyage.id
                                                            return (
                                                              <li
                                                                key={voyage.id}
                                                                className={`list-group-item ${
                                                                  isActive ? 'current' : ''
                                                                }`}
                                                                style={{
                                                                  cursor: 'pointer',
                                                                  border: 'none',
                                                                }}
                                                                onClick={() => {
                                                                  setSelectedVoyage(voyage)
                                                                  setDidUserSelectVoyage(true)
                                                                }}
                                                              >
                                                                <div
                                                                  className='fw-bold'
                                                                  // The title attribute shows the full text on hover
                                                                  title={`${voyage.voyageNumber}: ${voyage.departurePort} – ${voyage.arrivalPort}`}
                                                                  style={{
                                                                    color: '#111928',
                                                                    whiteSpace: 'nowrap', // Prevents text from wrapping to a new line
                                                                    overflow: 'hidden', // Hides the overflowing text
                                                                    textOverflow: 'ellipsis', // Adds the "..."
                                                                    display: 'block', // Ensures the element behaves correctly for overflow
                                                                  }}
                                                                >
                                                                  {voyage.voyageNumber}:{' '}
                                                                  {voyage.departurePort} –{' '}
                                                                  {voyage.arrivalPort}
                                                                </div>
                                                                <div className='text-muted'>
                                                                  {new Date(
                                                                    voyage.startDate
                                                                  ).toLocaleDateString(
                                                                    'en-GB'
                                                                  )}{' '}
                                                                  –{' '}
                                                                  {voyage?.endDate
                                                                    ? new Date(
                                                                        voyage.endDate
                                                                      ).toLocaleDateString('en-GB')
                                                                    : ''}
                                                                </div>
                                                                {voyage.active && (
                                                                  <div className='badge bg-warning text-dark mt-1'>
                                                                    Current
                                                                  </div>
                                                                )}
                                                              </li>
                                                            )
                                                          })}
                                                        </ul>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                {/* Company */}
                {(roleId === 5 || (roleId === 6 && companyGroupAdminId != null)) &&
                  !selectedVessel && (
                    <>
                      {/* 1) Orphan vessels */}
                      <div className='accordion' id='accordion-orphans'>
                        {vessels
                          .filter((v) => {
                            const targetId =
                              roleId === 5
                                ? Number(roleEntityId)
                                : roleId === 6
                                ? Number(companyGroupAdminId)
                                : null

                            return (
                              v.companyGroupAdmin?.id === targetId &&
                              v.active &&
                              !v.companyAdmin?.id
                            )
                          })
                          .map((vessel) => {
                            const isOrphanOpen = expandedVesselId === vessel.id
                            const vesselVoyages = voyages.filter(
                              (vo) => vo.vessel?.id === vessel.id
                            )

                            return (
                              <div key={vessel.id} className='accordion-item'>
                                <h2 className='accordion-header' id={`heading-orphan-${vessel.id}`}>
                                  <button
                                    className={`accordion-button ${
                                      isOrphanOpen ? '' : 'collapsed'
                                    }`}
                                    type='button'
                                    data-bs-toggle='collapse'
                                    data-bs-target={`#collapse-orphan-${vessel.id}`}
                                    aria-expanded={isOrphanOpen}
                                    aria-controls={`collapse-orphan-${vessel.id}`}
                                  >
                                    {vessel.fleet_name}
                                  </button>
                                </h2>
                                <div
                                  id={`collapse-orphan-${vessel.id}`}
                                  className={`accordion-collapse collapse ${
                                    isOrphanOpen ? 'show' : ''
                                  }`}
                                  aria-labelledby={`heading-orphan-${vessel.id}`}
                                  data-bs-parent='#accordion-orphans'
                                >
                                  <div className='accordion-body'>
                                    <ul className='list-group list-group-flush'>
                                      {vesselVoyages.map((voyage) => {
                                        const isActive = selectedVoyage?.id === voyage.id
                                        return (
                                          <li
                                            key={voyage.id}
                                            className={`list-group-item ${
                                              isActive ? 'current' : ''
                                            }`}
                                            style={{cursor: 'pointer', border: 'none'}}
                                            onClick={() => {
                                              setSelectedVoyage(voyage)
                                              setDidUserSelectVoyage(true)
                                            }}
                                          >
                                            <div
                                              className='fw-bold'
                                              // The title attribute shows the full text on hover
                                              title={`${voyage.voyageNumber}: ${voyage.departurePort} – ${voyage.arrivalPort}`}
                                              style={{
                                                color: '#111928',
                                                whiteSpace: 'nowrap', // Prevents text from wrapping to a new line
                                                overflow: 'hidden', // Hides the overflowing text
                                                textOverflow: 'ellipsis', // Adds the "..."
                                                display: 'block', // Ensures the element behaves correctly for overflow
                                              }}
                                            >
                                              {voyage.voyageNumber}: {voyage.departurePort} –{' '}
                                              {voyage.arrivalPort}
                                            </div>
                                            <div className='text-muted'>
                                              {new Date(voyage.startDate).toLocaleDateString(
                                                'en-GB'
                                              )}{' '}
                                              –{' '}
                                              {voyage?.endDate
                                                ? new Date(voyage.endDate).toLocaleDateString(
                                                    'en-GB'
                                                  )
                                                : ''}
                                            </div>
                                            {voyage.active && (
                                              <div className='badge bg-warning text-dark mt-1'>
                                                Current
                                              </div>
                                            )}
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>

                      {/* 2) Company‐grouped vessels */}
                      <div className='accordion' id='companyAccordionRole5'>
                        {companies
                          .filter(
                            (c) =>
                              c.cga?.id ===
                                (roleId === 5
                                  ? Number(roleEntityId)
                                  : roleId === 6
                                  ? Number(companyGroupAdminId)
                                  : null) && c.active
                          )
                          .map((company) => {
                            const isCompanyOpen = expandedCompanyId === company.id
                            const companyVessels = vessels.filter(
                              (v) => v.companyAdmin?.id === company.id && v.active
                            )

                            return (
                              <div key={company.id} className='accordion-item'>
                                <h2
                                  className='accordion-header'
                                  id={`heading-company-${company.id}`}
                                >
                                  <button
                                    className={`accordion-button ${
                                      isCompanyOpen ? '' : 'collapsed'
                                    }`}
                                    type='button'
                                    data-bs-toggle='collapse'
                                    data-bs-target={`#collapse-companyRole5-${company.id}`}
                                    aria-expanded={isCompanyOpen}
                                    aria-controls={`collapse-companyRole5-${company.id}`}
                                  >
                                    {company.name}
                                  </button>
                                </h2>
                                <div
                                  id={`collapse-companyRole5-${company.id}`}
                                  className={`accordion-collapse collapse ${
                                    isCompanyOpen ? 'show' : ''
                                  }`}
                                  aria-labelledby={`heading-company-${company.id}`}
                                  data-bs-parent='#companyAccordionRole5'
                                >
                                  <div className='accordion-body py-3'>
                                    <div className='accordion' id={`vesselAccordion-${company.id}`}>
                                      {companyVessels.map((vessel) => {
                                        const isVesselOpen = expandedVesselId === vessel.id
                                        const vesselVoyages = voyages.filter(
                                          (vo) => vo.vessel?.id === vessel.id
                                        )

                                        return (
                                          <div key={vessel.id} className='accordion-item'>
                                            <h2
                                              className='accordion-header'
                                              id={`heading-vessel-${vessel.id}`}
                                            >
                                              <button
                                                className={`accordion-button ${
                                                  isVesselOpen ? '' : 'collapsed'
                                                }`}
                                                type='button'
                                                data-bs-toggle='collapse'
                                                data-bs-target={`#collapse-vessel-${vessel.id}`}
                                                aria-expanded={isVesselOpen}
                                                aria-controls={`collapse-vessel-${vessel.id}`}
                                              >
                                                {vessel.fleet_name}
                                              </button>
                                            </h2>
                                            <div
                                              id={`collapse-vessel-${vessel.id}`}
                                              className={`accordion-collapse collapse ${
                                                isVesselOpen ? 'show' : ''
                                              }`}
                                              aria-labelledby={`heading-vessel-${vessel.id}`}
                                              data-bs-parent={`#vesselAccordion-${company.id}`}
                                            >
                                              <div className='accordion-body'>
                                                <ul className='list-group list-group-flush'>
                                                  {vesselVoyages.map((voyage) => {
                                                    const isActive =
                                                      selectedVoyage?.id === voyage.id
                                                    return (
                                                      <li
                                                        key={voyage.id}
                                                        className={`list-group-item ${
                                                          isActive ? 'current' : ''
                                                        }`}
                                                        style={{cursor: 'pointer', border: 'none'}}
                                                        onClick={() => {
                                                          setSelectedVoyage(voyage)
                                                          setDidUserSelectVoyage(true)
                                                        }}
                                                      >
                                                        <div
                                                          className='fw-bold'
                                                          // The title attribute shows the full text on hover
                                                          title={`${voyage.voyageNumber}: ${voyage.departurePort} – ${voyage.arrivalPort}`}
                                                          style={{
                                                            color: '#111928',
                                                            whiteSpace: 'nowrap', // Prevents text from wrapping to a new line
                                                            overflow: 'hidden', // Hides the overflowing text
                                                            textOverflow: 'ellipsis', // Adds the "..."
                                                            display: 'block', // Ensures the element behaves correctly for overflow
                                                          }}
                                                        >
                                                          {voyage.voyageNumber}:{' '}
                                                          {voyage.departurePort} –{' '}
                                                          {voyage.arrivalPort}
                                                        </div>
                                                        <div className='text-muted'>
                                                          {new Date(
                                                            voyage.startDate
                                                          ).toLocaleDateString('en-GB')}{' '}
                                                          –{' '}
                                                          {voyage?.endDate
                                                            ? new Date(
                                                                voyage.endDate
                                                              ).toLocaleDateString('en-GB')
                                                            : ''}
                                                        </div>
                                                        {voyage.active && (
                                                          <div className='badge bg-warning text-dark mt-1'>
                                                            Current
                                                          </div>
                                                        )}
                                                      </li>
                                                    )
                                                  })}
                                                </ul>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </>
                  )}
                {/* Sub Company */}
                {roleId === 2 && !selectedVessel && (
                  <div className='accordion' id='vesselAccordionRole2'>
                    {vessels
                      .filter((vessel) => vessel.companyAdmin?.id === roleEntityId && vessel.active)
                      .map((vessel) => {
                        const vesselVoyages = voyages.filter((v) => v.vessel?.id === vessel.id)
                        const isOpen = expandedVesselId === vessel.id

                        return (
                          <div key={vessel.id} className='accordion-item'>
                            <h2 className='accordion-header' id={`heading-vessel-${vessel.id}`}>
                              <button
                                className={`accordion-button ${isOpen ? '' : 'collapsed'}`}
                                type='button'
                                data-bs-toggle='collapse'
                                data-bs-target={`#collapse-vessel-${vessel.id}`}
                                aria-expanded={isOpen}
                                aria-controls={`collapse-vessel-${vessel.id}`}
                              >
                                {vessel.fleet_name}
                              </button>
                            </h2>

                            <div
                              id={`collapse-vessel-${vessel.id}`}
                              className={`accordion-collapse collapse ${isOpen ? 'show' : ''}`}
                              aria-labelledby={`heading-vessel-${vessel.id}`}
                              data-bs-parent='#vesselAccordionRole2'
                            >
                              <div className='accordion-body'>
                                <ul className='list-group list-group-flush'>
                                  {vesselVoyages.map((voyage) => {
                                    const isActive = selectedVoyage?.id === voyage.id
                                    return (
                                      <li
                                        key={voyage.id}
                                        className={`list-group-item ${isActive ? 'current' : ''}`}
                                        style={{cursor: 'pointer', border: 'none'}}
                                        onClick={() => {
                                          setSelectedVoyage(voyage)
                                          setDidUserSelectVoyage(true)
                                          // also re-expand this vessel
                                          setExpandedVesselId(vessel.id)
                                        }}
                                      >
                                        <div
                                          className='fw-bold'
                                          // The title attribute shows the full text on hover
                                          title={`${voyage.voyageNumber}: ${voyage.departurePort} – ${voyage.arrivalPort}`}
                                          style={{
                                            color: '#111928',
                                            whiteSpace: 'nowrap', // Prevents text from wrapping to a new line
                                            overflow: 'hidden', // Hides the overflowing text
                                            textOverflow: 'ellipsis', // Adds the "..."
                                            display: 'block', // Ensures the element behaves correctly for overflow
                                          }}
                                        >
                                          {voyage.voyageNumber}: {voyage.departurePort} –{' '}
                                          {voyage.arrivalPort}
                                        </div>
                                        <div className='text-muted'>
                                          {new Date(voyage.startDate).toLocaleDateString('en-GB')} –{' '}
                                          {new Date(voyage.endDate).toLocaleDateString('en-GB')}
                                        </div>
                                        {voyage.active && (
                                          <div className='badge bg-warning text-dark mt-1'>
                                            Current
                                          </div>
                                        )}
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
              <div
                id='pdf-preview-wrapper'
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: -1,
                  opacity: 0,
                  pointerEvents: 'none',
                }}
              >
                <div id='pdf-preview' />
              </div>
              <div style={{flex: 5, backgroundColor: '#FFFFFF'}}>
                {!embedded && (
                <div className='px-5 py-3' style={{backgroundColor: '#ffffff'}}>
                  <div className='d-flex justify-content-between'>
                    <h3 className='card-title fw-bold text-dark '>Operations</h3>
                    {roleId === 4 && (
                      <div className='d-flex align-items-center gap-4'>
                        <button className='btn p-0 m-0' onClick={handleExcelDownload}>
                          <KTSVG
                            path='/media/icons/duotune/general/download.svg'
                            className='svg-icon-2x'
                          />
                        </button>{' '}
                        {/* <button className='btn btn_primary'
                                            onClick={() => {
                                                setIsAddVoyageModalOpen(true);
                                            }}
                                        >
                                            <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-2' />Add Voyage
                                        </button> */}
                        <button className='btn btn_primary' onClick={openModal}>
                          Create report
                        </button>
                      </div>
                    )}
                  </div>
                  <div className='d-flex mt-3' style={{gap: '6rem'}}>
                    <p>
                      <span className='op_title'>Vessel name:</span>{' '}
                      <span style={{fontWeight: '500'}}>{vesselName}</span>
                    </p>
                    <p>
                      <span className='op_title'>IMO number:</span>{' '}
                      <span style={{fontWeight: '500'}}>{imoNumber}</span>
                    </p>
                    <p>
                      <span className='op_title'>Vessel type:</span>{' '}
                      <span style={{fontWeight: '500'}}>{vesselType}</span>
                    </p>
                    {selectedVoyage && (
                      <p>
                        <span>{selectedVoyage.voyageNumber}:</span>{' '}
                        <span style={{fontWeight: '500'}}>
                          {selectedVoyage.departurePort} - {selectedVoyage.arrivalPort}
                        </span>
                      </p>
                    )}
                    {/* ---- Tabs just below voyage info ---- */}
{/* <div className='mt-3'> */}
  {roleId !== 4 && (
  <ul className='nav nav-tabs'>
    <li className='nav-item'>
      <button
        type='button'
        className={`nav-link ${activeTab === 'view1' ? 'active' : ''}`}
        onClick={() => setActiveTab('view1')}
      >
        View 1
      </button>
    </li>
    <li className='nav-item'>
      <button
        type='button'
        className={`nav-link ${activeTab === 'view2' ? 'active' : ''}`}
        onClick={() => setActiveTab('view2')}
      >
        View 2
      </button>
    </li>
  </ul>
)}
{/* </div> */}
                  </div>
                </div>
                )}
                {/* Summary Cards */}
                <div className='border-top pt-5 px-5'>
                  {/* <div className="row mb-4">
                                        {[
                                            { title: "Average Fuel Consumption (MT)", value: "21", path: "/media/map/fuel-consumption.svg" },
                                            { title: "Average Speed (kn)", value: "15", path: "/media/map/Speed.svg" },
                                            { title: "Average RPM", value: "90.5", path: "/media/map/rpm.svg" },
                                            { title: "Speed required to make good ETA (kn)", value: "15.5", path: "/media/map/eta.svg" },
                                        ].map((card, index) => (
                                            <div key={index} className="col-md-3 mb-3">
                                                <div className="custom-card p-3">
                                                    <div className='d-flex justify-content-between'>
                                                        <div>
                                                            <h2 className="fw-bold mb-1">{card.value}</h2>
                                                            <h6 className="card-title">{card.title}</h6>
                                                        </div>
                                                        <KTSVG path={card.path} className='svg-icon svg-icon-2x' />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div> */}

                  {/* Reports Table */}
                  <div className='report-table table-responsive'>
                    <table className='table table-bordered align-middle'>
                      <thead className='table-header text-start'>
                        <tr>
                          <th
                            onClick={() => handleSort('reportType')}
                            className='cursor-pointer'
                            style={{paddingLeft: '3rem'}}
                          >
                            REPORT NAME
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'reportType'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </th>

                          <th onClick={() => handleSort('legId')} className='cursor-pointer'>
                            LEG ID
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'legId'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </th>

                          <th
                            onClick={() => handleSort('reportDateTime')}
                            className='cursor-pointer'
                          >
                            REPORT DATE & TIME
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'reportDateTime'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </th>

                          <th onClick={() => handleSort('createdBy')} className='cursor-pointer'>
                            CREATED BY
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'createdBy'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </th>

                          <th onClick={() => handleSort('status')} className='cursor-pointer'>
                            STATUS
                            <KTSVG
                              path={`/media/map/sort-col-${
                                sortConfig.key === 'status'
                                  ? sortConfig.direction === 'asc'
                                    ? 'up-black'
                                    : 'down-black'
                                  : 'grey'
                              }.svg`}
                              className='svg-icon ms-2 custom-sort-icon'
                            />
                          </th>

                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className='table-body text-start'>
                        {currentReports.length === 0 ? (
                          <tr>
                            <td colSpan={6} className='text-center text-muted py-3'>
                              No reports created for the selected voyage.
                            </td>
                          </tr>
                        ) : (
                          currentReports.map((row, idx) => (
                            <tr
                              key={idx}
                              // style={
                              //     row.remark?.trim() !== ""
                              //         ? { backgroundColor: "#fff3cd" } // light yellow
                              //         : undefined
                              // }
                            >
                              <td>
                                {row.hasWarnings ? (
                                  <KTSVG path='/media/map/Incomplete.svg' className='svg-icon-2' />
                                ) : (
                                  <KTSVG path='/media/map/complete.svg' className='svg-icon-2' />
                                )}
                                <span className='ps-2'>{row.reportType}</span>
                              </td>
                              <td>{row.legId}</td>
                              <td>
                                {row.reportDateTime
                                  ? `${new Date(row.reportDateTime)
                                      .toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      })
                                      .replace(/ /g, '-')}`
                                  : '--'}{' '}
                                {row.reportDateTime
                                  ? new Date(row.reportDateTime).toLocaleTimeString('en-GB')
                                  : ''}
                              </td>

                              <td>{row?.createdBy?.rank}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    row.status === 'DRAFT' ? 'draft' : 'submitted'
                                  }`}
                                >
                                  {row.status === 'SUBMITTED' ? 'Submitted' : 'Draft'}
                                </span>
                              </td>
                              <td>
                                {/* <button
                                                                    onClick={() => {
                                                                        if (row.assignment?.id) {
                                                                            navigate(`/operations/create/${row.assignment.id}`, {
                                                                                state: {
                                                                                    draftReport: row,
                                                                                    isEditMode: true,
                                                                                    selectedVoyage,
                                                                                },
                                                                            });
                                                                        } else {
                                                                            console.error("No assignment ID found");
                                                                        }
                                                                    }}
                                                                    className="btn btn-sm px-0"
                                                                >
                                                                    <KTSVG path="/media/map/edit-active.svg" />
                                                                </button> */}
                                {row.status === 'SUBMITTED' && (
                                  <>
                                    {row.hasWarnings || (row.remark && roleId === 4) ? (
                                      <button
                                        onClick={() => {
                                          if (row.assignment?.id) {
                                            navigate(`/operations/create/${row.assignment.id}`, {
                                              state: {
                                                draftReport: row,
                                                isEditMode: true,
                                                selectedVoyage,
                                              },
                                            })
                                          } else {
                                            console.error('No assignment ID found')
                                          }
                                        }}
                                        className='btn btn-sm px-0'
                                      >
                                        <KTSVG path='/media/map/edit-active.svg' />
                                      </button>
                                    ) : (
                                      <button
                                        className='btn btn-sm px-0'
                                        disabled
                                        title='No warnings or remarks – editing disabled'
                                      >
                                        <KTSVG path='/media/map/edit.svg' />
                                      </button>
                                    )}

                                    {/* <button
                                                                            onClick={() => setIsDeleteCreatedReportModalOpen(true)}
                                                                            className="btn btn-sm px-0"
                                                                            style={{ visibility: "hidden" }}
                                                                        >
                                                                            <KTSVG path="/media/map/trash.svg" />
                                                                        </button> */}

                                    {/* {roleId !== 4 && ( */}
                                    <button
                                      className='btn btn-sm px-0'
                                      onClick={() => handlePreviewReportView(row)}
                                    >
                                      <KTSVG path='/media/map/ph_eye.svg' />
                                    </button>
                                    <button
                                      className='btn btn-sm px-0'
                                      onClick={() => handleDownload(row)}
                                    >
                                      <KTSVG
                                        path='/media/map/DownloadSimple.svg'
                                        className='svg-icon-2'
                                      />
                                    </button>
                                    {/* )} */}
                                  </>
                                )}

                                {row.status === 'DRAFT' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        if (row.assignment?.id) {
                                          navigate(`/operations/create/${row.assignment.id}`, {
                                            state: {
                                              draftReport: row,
                                              isEditMode: true,
                                              selectedVoyage,
                                            },
                                          })
                                        } else {
                                          console.error('No assignment ID found')
                                        }
                                      }}
                                      className='btn btn-sm px-0'
                                    >
                                      <KTSVG path='/media/map/edit-active.svg' />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setIsDeleteCreatedReportModalOpen(true)
                                        setDraftReportId(row.id)
                                      }}
                                      className='btn btn-sm px-0'
                                    >
                                      <KTSVG path='/media/map/trash.svg' />
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {/* Pagination */}
                    <div className='pagination-wrapper d-flex justify-content-between align-items-center py-3'>
                      <div className='d-flex align-items-center'>
                        <span className='text-muted me-2'>Rows per page</span>
                        <select
                          className='form-select'
                          style={{
                            borderRadius: '20px',
                            width: '70px',
                            border: '1px solid #dee2e6',
                            fontSize: '14px',
                            padding: '4px 8px',
                          }}
                          value={rowsPerPage}
                          onChange={handleRowsPerPageChange}
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>

                      <div className='d-flex align-items-center'>
                        <span className='text-muted me-3' style={{fontSize: '14px'}}>
                          Showing{' '}
                          <strong>
                            {(currentPage - 1) * rowsPerPage + 1}-
                            {Math.min(currentPage * rowsPerPage, reports.length)}
                          </strong>{' '}
                          of <strong>{reports.length}</strong>
                        </span>

                        <nav>
                          <ul className='pagination pagination-sm mb-0' style={{gap: '2px'}}>
                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px',
                                }}
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                              >
                                ‹
                              </button>
                            </li>

                            {(() => {
                              const pages = []
                              const showPages = 5 // Show 5 page numbers at most
                              let startPage = Math.max(1, currentPage - 2)
                              let endPage = Math.min(totalPages, startPage + showPages - 1)

                              // Adjust start if we're near the end
                              if (endPage - startPage < showPages - 1) {
                                startPage = Math.max(1, endPage - showPages + 1)
                              }

                              // Add first page and ellipsis if needed
                              if (startPage > 1) {
                                pages.push(
                                  <li key={1} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                      }}
                                      onClick={() => handlePageChange(1)}
                                    >
                                      1
                                    </button>
                                  </li>
                                )

                                if (startPage > 2) {
                                  pages.push(
                                    <li key='ellipsis1' className='page-item disabled'>
                                      <span
                                        className='page-link border-0 text-muted'
                                        style={{backgroundColor: 'transparent', padding: '4px 8px'}}
                                      >
                                        ...
                                      </span>
                                    </li>
                                  )
                                }
                              }

                              // Add page numbers
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(
                                  <li
                                    key={i}
                                    className={`page-item ${currentPage === i ? 'active' : ''}`}
                                  >
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor:
                                          currentPage === i ? '#F4F9FF' : 'transparent',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                        outline: 'none',
                                        boxShadow: 'none',
                                      }}
                                      onClick={() => handlePageChange(i)}
                                    >
                                      {i}
                                    </button>
                                  </li>
                                )
                              }

                              // Add ellipsis and last page if needed
                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push(
                                    <li key='ellipsis2' className='page-item disabled'>
                                      <span
                                        className='page-link border-0 text-muted'
                                        style={{backgroundColor: 'transparent', padding: '4px 8px'}}
                                      >
                                        ...
                                      </span>
                                    </li>
                                  )
                                }

                                pages.push(
                                  <li key={totalPages} className='page-item'>
                                    <button
                                      className='page-link text-muted'
                                      style={{
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        minWidth: '40px',
                                        borderRadius: '6px',
                                      }}
                                      onClick={() => handlePageChange(totalPages)}
                                    >
                                      {totalPages}
                                    </button>
                                  </li>
                                )
                              }

                              return pages
                            })()}

                            <li
                              className={`page-item ${
                                currentPage === totalPages ? 'disabled' : ''
                              }`}
                            >
                              <button
                                className='page-link text-muted'
                                style={{
                                  backgroundColor: '#f8f9fa',
                                  border: '1px solid #dee2e6',
                                  padding: '8px 12px',
                                  fontSize: '14px',
                                  borderRadius: '6px',
                                }}
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                              >
                                ›
                              </button>
                            </li>
                          </ul>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isCreateModalOpen && (
          <CreateReportModal
            isOpen={isCreateModalOpen}
            onClose={closeModal}
            selectedVoyage={selectedVoyage}
          />
        )}
        {isAddVoyageModalOpen && (
          <AddVoyageModal
            isOpen={isAddVoyageModalOpen}
            onClose={() => {
              setIsAddVoyageModalOpen(false)
            }}
            onVoyageAdded={fetchVoyages}
          />
        )}
        {isDeleteCreatedReportModalOpen && (
          <DeleteCreatedReportModal
            isOpen={isDeleteCreatedReportModalOpen}
            onClose={() => setIsDeleteCreatedReportModalOpen(false)}
            reportId={draftReportId}
            onReportDeleted={fetchCreatedReportsList}
          />
        )}
      </div>
    </div>
  )
}

export {OperationsList}
