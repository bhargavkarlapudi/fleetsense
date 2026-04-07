import React, { FC, useEffect, useState, useMemo } from 'react'
import { KTSVG } from '../../../../../_metronic/helpers'
import { useAuth } from '../../../auth'
import { useNavigate } from 'react-router-dom'
import { searchPmsJobs, getRunningHourCounters, getPmsPlans, getPmsPlanLines, generateDueJobs, getComplianceReport, getJobHistoryReport, getOverhaulHistoryReport, getSparesConsumptionReport, getDefectsIntegrationReport, exportComplianceReport, exportJobHistoryReport, exportOverhaulHistoryReport, exportSparesConsumptionReport, exportDefectsIntegrationReport } from '../../core/pms/_requests'
import { PmsJobRecord, PmsJobState, PmsPlanDto, PmsPlanLineDto, ComplianceReportDto, JobHistoryReportDto, OverhaulHistoryReportDto, SparesConsumptionReportDto, DefectsIntegrationReportDto } from '../../core/pms/_models'
import { toast } from 'react-toastify'
import Chart from 'react-apexcharts'
import { getVesselList } from '../../../Management/core/_requests'
import type { Vessel } from '../../../Management/core/_models'

const PmsDashboard: FC = () => {
  const { currentUser, auth } = useAuth()
  const navigate = useNavigate()
  const roleId = Number((auth?.userDetails as any)?.roleId ?? (currentUser?.role?.id ?? 0)) || 0
  const isCrew = roleId === 4

  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalJobs: 0,
    dueJobs: 0,
    overdueJobs: 0,
    upcomingJobs: 0,
    compliancePercent: 0,
  })
  const [recentJobs, setRecentJobs] = useState<PmsJobRecord[]>([])
  const [topOverdueJobs, setTopOverdueJobs] = useState<Array<PmsJobRecord & { overdueDays: number }>>([])
  const [planCompliance, setPlanCompliance] = useState<Array<{
    plan: PmsPlanDto
    totalLines: number
    completedLines: number
    compliancePercent: number
  }>>([])
  const [runningHoursData, setRunningHoursData] = useState<Array<{
    name: string
    data: Array<{ x: string; y: number }>
  }>>([])
  const [alerts, setAlerts] = useState<{
    overdueJobs: number
    lowCompliancePlans: number
    countersNearLimit: number
  }>({
    overdueJobs: 0,
    lowCompliancePlans: 0,
    countersNearLimit: 0,
  })
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard')
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [reportFilters, setReportFilters] = useState({
    vesselId: '',
    fromDate: '',
    toDate: '',
    state: '' as PmsJobState | '',
  })
  const [complianceReport, setComplianceReport] = useState<ComplianceReportDto | null>(null)
  const [jobHistoryReport, setJobHistoryReport] = useState<JobHistoryReportDto[]>([])
  const [overhaulHistoryReport, setOverhaulHistoryReport] = useState<OverhaulHistoryReportDto[]>([])
  const [sparesConsumptionReport, setSparesConsumptionReport] = useState<SparesConsumptionReportDto[]>([])
  const [defectsIntegrationReport, setDefectsIntegrationReport] = useState<DefectsIntegrationReportDto | null>(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [showComplianceModal, setShowComplianceModal] = useState(false)
  const [nonCompliantLines, setNonCompliantLines] = useState<PmsPlanLineDto[]>([])
  const [loadingNonCompliant, setLoadingNonCompliant] = useState(false)

  useEffect(() => {
    loadDashboardData()
    loadVessels()
  }, [])

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports()
    }
  }, [activeTab, reportFilters])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Load jobs
      const jobs = await searchPmsJobs(undefined, undefined, undefined, undefined)
      
      const total = jobs.length
      const due = jobs.filter(j => 
        (j.state === 'PLANNED' || j.state === 'IN_PROGRESS') &&
        j.dueDate && j.dueDate <= today
      ).length
      const overdue = jobs.filter(j => 
        (j.state === 'PLANNED' || j.state === 'IN_PROGRESS') &&
        j.dueDate && j.dueDate < today
      ).length
      const upcoming = jobs.filter(j => 
        j.state === 'PLANNED' && 
        j.dueDate && 
        j.dueDate > today && 
        j.dueDate <= nextWeek
      ).length

      // Get compliance from backend API
      let compliancePercent = 0
      try {
        const complianceReport = await getComplianceReport(undefined, undefined, undefined)
        compliancePercent = Math.round(complianceReport.compliancePercent || 0)
        setAlerts(prev => ({
          ...prev,
          overdueJobs: complianceReport.overdueJobs || overdue,
        }))
      } catch (error) {
        console.error('Error loading compliance report:', error)
        // Fallback to job-based calculation
        const completed = jobs.filter(j => j.state === 'CLOSED' || j.state === 'VERIFIED').length
        compliancePercent = total > 0 ? Math.round((completed / total) * 100) : 0
        setAlerts(prev => ({
          ...prev,
          overdueJobs: overdue,
        }))
      }

      // Recent jobs (last 10)
      const sortedJobs = [...jobs].sort((a, b) => {
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0
        return bDate - aDate
      })
      setRecentJobs(sortedJobs.slice(0, 10))

      // Top Overdue Jobs (for widget)
      const overdueJobsList = jobs
        .filter(j => 
          (j.state === 'PLANNED' || j.state === 'IN_PROGRESS') &&
          j.dueDate && j.dueDate < today
        )
        .map(j => {
          const dueDate = j.dueDate ? new Date(j.dueDate) : new Date()
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          dueDate.setHours(0, 0, 0, 0)
          const overdueDays = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          return { ...j, overdueDays }
        })
        .sort((a, b) => {
          // Sort by overdue days (descending)
          return b.overdueDays - a.overdueDays
        })
        .slice(0, 10)
      setTopOverdueJobs(overdueJobsList)

      setStats({
        totalJobs: total,
        dueJobs: due,
        overdueJobs: overdue,
        upcomingJobs: upcoming,
        compliancePercent,
      })

      // Load plans and calculate compliance
      const plans = await getPmsPlans()
      const complianceData: Array<{
        plan: PmsPlanDto
        totalLines: number
        completedLines: number
        compliancePercent: number
      }> = []

      for (const plan of plans.slice(0, 10)) { // Top 10 plans
        try {
          const lines = await getPmsPlanLines(plan.id!)
          const activeLines = lines.filter(l => l.active !== false)
          const completedLines = activeLines.filter(l => 
            l.lastDoneDate && l.nextDueDate && new Date(l.lastDoneDate) >= new Date(l.nextDueDate)
          ).length
          const compliance = activeLines.length > 0 
            ? Math.round((completedLines / activeLines.length) * 100) 
            : 0

          complianceData.push({
            plan,
            totalLines: activeLines.length,
            completedLines,
            compliancePercent: compliance,
          })
        } catch (error) {
          console.error(`Error loading plan lines for plan ${plan.id}:`, error)
        }
      }

      setPlanCompliance(complianceData)
      setAlerts(prev => ({
        ...prev,
        lowCompliancePlans: complianceData.filter(p => p.compliancePercent < 80).length,
      }))

      // Load running hours data for chart and near-limit calculation
      const counters = await getRunningHourCounters()
      const topCounters = counters
        .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
        .slice(0, 5)

      // Calculate counters near limit
      const countersNearLimit = counters.filter(counter => {
        if (!counter.maxDailyJumpLimit || counter.maxDailyJumpLimit <= 0) return false
        // Simplified: if current value is high, flag as near limit
        // In a real scenario, you'd compare with last reading to calculate remaining capacity
        const ratio = counter.currentValue / (counter.maxDailyJumpLimit * 365) // Rough estimate
        return ratio > 0.8 // 80% of annual limit
      }).length

      setAlerts(prev => ({
        ...prev,
        countersNearLimit,
      }))

      // For chart, we'll show current values (in a real scenario, you'd load historical data)
      const chartData = topCounters.map(counter => ({
        name: counter.name,
        data: [{
          x: new Date().toISOString().split('T')[0],
          y: counter.currentValue || 0,
        }],
      }))

      setRunningHoursData(chartData)

      // Check for counters near limit
      const nearLimit = counters.filter(c => {
        if (!c.maxDailyJumpLimit) return false
        // This is simplified - in reality you'd check recent readings
        return true
      }).length
      setAlerts(prev => ({ ...prev, countersNearLimit: nearLimit }))

    } catch (error) {
      console.error('Error loading PMS dashboard:', error)
      toast.error('Failed to load dashboard data', { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const chartOptions = {
    chart: {
      type: 'line' as const,
      toolbar: { show: false },
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2,
    },
    xaxis: {
      type: 'datetime' as const,
    },
    yaxis: {
      title: { text: 'Running Hours' },
    },
    legend: {
      position: 'top' as const,
    },
    colors: ['#009ef7', '#7239ea', '#ffc700', '#f1416c', '#50cd89'],
  }

  const getStateBadgeClass = (state: PmsJobState) => {
    switch (state) {
      case 'PLANNED': return 'badge badge-light-primary'
      case 'IN_PROGRESS': return 'badge badge-light-warning'
      case 'COMPLETED': return 'badge badge-light-info'
      case 'VERIFIED': return 'badge badge-light-success'
      case 'CLOSED': return 'badge badge-light-success'
      case 'DEFERRED': return 'badge badge-light-secondary'
      case 'CANCELLED': return 'badge badge-light-danger'
      default: return 'badge badge-light'
    }
  }

  const getComplianceBadgeClass = (percent: number) => {
    if (percent >= 90) return 'badge badge-light-success'
    if (percent >= 80) return 'badge badge-light-info'
    if (percent >= 60) return 'badge badge-light-warning'
    return 'badge badge-light-danger'
  }

  const loadVessels = async () => {
    try {
      const data = await getVesselList()
      setVessels(data)
    } catch (error) {
      console.error('Error loading vessels:', error)
    }
  }

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const vesselId = reportFilters.vesselId ? Number(reportFilters.vesselId) : undefined
      const fromDate = reportFilters.fromDate || undefined
      const toDate = reportFilters.toDate || undefined
      const state = reportFilters.state || undefined

      const [compliance, jobHistory, overhaulHistory] = await Promise.all([
        getComplianceReport(vesselId, fromDate, toDate),
        getJobHistoryReport(vesselId, fromDate, toDate, state),
        getOverhaulHistoryReport(vesselId, fromDate, toDate),
      ])

      setComplianceReport(compliance)
      setJobHistoryReport(jobHistory)
      setOverhaulHistoryReport(overhaulHistory)
    } catch (error: any) {
      console.error('Error loading reports:', error)
      toast.error(error.message || 'Failed to load reports', { position: 'top-center' })
    } finally {
      setLoadingReports(false)
    }
  }

  const loadNonCompliantLines = async () => {
    setLoadingNonCompliant(true)
    try {
      const plans = await getPmsPlans()
      const allNonCompliant: PmsPlanLineDto[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const plan of plans) {
        try {
          const lines = await getPmsPlanLines(plan.id!)
          const activeLines = lines.filter(l => l.active !== false)
          
          // Find non-compliant lines (overdue or not completed on time)
          const nonCompliant = activeLines.filter(line => {
            if (line.nextDueDate) {
              const dueDate = new Date(line.nextDueDate)
              dueDate.setHours(0, 0, 0, 0)
              // Overdue: due date has passed and no completion recorded after due date
              if (dueDate < today) {
                if (!line.lastDoneDate) return true // Never done
                const lastDone = new Date(line.lastDoneDate)
                lastDone.setHours(0, 0, 0, 0)
                return lastDone < dueDate // Done before due date (non-compliant)
              }
            }
            return false
          })
          
          allNonCompliant.push(...nonCompliant)
        } catch (error) {
          console.error(`Error loading plan lines for plan ${plan.id}:`, error)
        }
      }

      setNonCompliantLines(allNonCompliant)
    } catch (error) {
      console.error('Error loading non-compliant lines:', error)
      toast.error('Failed to load non-compliant plan lines', { position: 'top-center' })
    } finally {
      setLoadingNonCompliant(false)
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to export', { position: 'top-center' })
      return
    }

    const headers = Object.keys(data[0])
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        return value != null ? `"${String(value).replace(/"/g, '""')}"` : ''
      }).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className='d-flex justify-content-center py-5'>
        <div className='spinner-border' role='status'>
          <span className='visually-hidden'>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main'>
      <div className='d-flex flex-column flex-column-fluid'>
        <div id='kt_app_content' className='app-content flex-column-fluid bg-white'>
          <div className='card'>
            <div className='card-header border-0 pt-6 d-flex justify-content-between bg-white'>
              <div>
                <h3 className='card-label text-dark fw-bold'>PMS Dashboard</h3>
                <span className='text-muted fs-7'>
                  Overview of planned maintenance activities and compliance
                </span>
              </div>
              <div className='card-toolbar d-flex gap-2'>
                {activeTab === 'dashboard' && (
                  <>
                    <button
                      type='button'
                      className='btn btn-sm btn-success'
                      onClick={async () => {
                        try {
                          const result = await generateDueJobs()
                          toast.success(result.message || `Generated ${result.generated} jobs`)
                          loadDashboardData()
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to generate jobs')
                        }
                      }}
                    >
                      <KTSVG path='/media/icons/duotune/arrows/arr075.svg' className='svg-icon-2' />
                      Generate Due Jobs
                    </button>
                    <button
                      type='button'
                      className='btn btn-sm btn-primary'
                      onClick={() => navigate('/technical/pms/jobs')}
                    >
                      View All Jobs
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className='card-header border-0 pt-0'>
              <ul className='nav nav-stretch nav-line-tabs nav-line-tabs-2x border-transparent fs-5 fw-bold'>
                <li className='nav-item mt-2'>
                  <button
                    className={`nav-link text-active-primary ms-0 me-10 ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    Dashboard
                  </button>
                </li>
                <li className='nav-item mt-2'>
                  <button
                    className={`nav-link text-active-primary me-10 ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                  >
                    Reports
                  </button>
                </li>
              </ul>
            </div>

            <div className='card-body pt-0'>
              {activeTab === 'dashboard' ? (
                <>
                  {/* Quick Links */}
                  <div className='row g-3 mb-6'>
                    <div className='col-md-3'>
                      <div className='card card-hover h-100 cursor-pointer' onClick={() => navigate('/technical/pms/jobs')} style={{ cursor: 'pointer' }}>
                        <div className='card-body text-center'>
                          <KTSVG path='/media/icons/duotune/general/gen025.svg' className='svg-icon-3x text-primary mb-3' />
                          <div className='fw-bold fs-5'>View All Jobs</div>
                          <div className='text-muted fs-7'>Manage and track maintenance jobs</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-3'>
                      <div className='card card-hover h-100 cursor-pointer' onClick={() => navigate('/technical/pms/plans')} style={{ cursor: 'pointer' }}>
                        <div className='card-body text-center'>
                          <KTSVG path='/media/icons/duotune/files/fil012.svg' className='svg-icon-3x text-success mb-3' />
                          <div className='fw-bold fs-5'>Manage Plans</div>
                          <div className='text-muted fs-7'>Create and manage maintenance plans</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-3'>
                      <div className='card card-hover h-100 cursor-pointer' onClick={() => navigate('/technical/pms/running-hours')} style={{ cursor: 'pointer' }}>
                        <div className='card-body text-center'>
                          <KTSVG path='/media/icons/duotune/general/gen032.svg' className='svg-icon-3x text-info mb-3' />
                          <div className='fw-bold fs-5'>Running Hours</div>
                          <div className='text-muted fs-7'>Track equipment running hours</div>
                        </div>
                      </div>
                    </div>
                    <div className='col-md-3'>
                      <div className='card card-hover h-100 cursor-pointer' onClick={() => navigate('/technical/pms/templates')} style={{ cursor: 'pointer' }}>
                        <div className='card-body text-center'>
                          <KTSVG path='/media/icons/duotune/files/fil013.svg' className='svg-icon-3x text-warning mb-3' />
                          <div className='fw-bold fs-5'>Templates</div>
                          <div className='text-muted fs-7'>Manage maintenance templates</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className='row g-6 g-xl-9 mb-6'>
                <div className='col-md-6 col-xl-3'>
                  <div className='card bg-light-primary h-100'>
                    <div className='card-body d-flex flex-column justify-content-between'>
                      <div className='d-flex align-items-center mb-2'>
                        <span className='text-gray-400 fw-semibold fs-6 me-1'>Total Jobs</span>
                      </div>
                      <span className='text-gray-800 fw-bold fs-2qx'>{stats.totalJobs}</span>
                    </div>
                  </div>
                </div>
                <div className='col-md-6 col-xl-3'>
                  <div className='card bg-light-danger h-100'>
                    <div className='card-body d-flex flex-column justify-content-between'>
                      <div className='d-flex align-items-center mb-2'>
                        <span className='text-gray-400 fw-semibold fs-6 me-1'>Overdue</span>
                      </div>
                      <span className='text-gray-800 fw-bold fs-2qx'>{stats.overdueJobs}</span>
                    </div>
                  </div>
                </div>
                <div className='col-md-6 col-xl-3'>
                  <div className='card bg-light-warning h-100'>
                    <div className='card-body d-flex flex-column justify-content-between'>
                      <div className='d-flex align-items-center mb-2'>
                        <span className='text-gray-400 fw-semibold fs-6 me-1'>Due</span>
                      </div>
                      <span className='text-gray-800 fw-bold fs-2qx'>{stats.dueJobs}</span>
                    </div>
                  </div>
                </div>
                <div className='col-md-6 col-xl-3'>
                  <div className='card bg-light-info h-100'>
                    <div className='card-body d-flex flex-column justify-content-between'>
                      <div className='d-flex align-items-center mb-2'>
                        <span className='text-gray-400 fw-semibold fs-6 me-1'>Upcoming (7 days)</span>
                      </div>
                      <span className='text-gray-800 fw-bold fs-2qx'>{stats.upcomingJobs}</span>
                    </div>
                  </div>
                </div>
                <div className='col-md-6 col-xl-3'>
                  <div 
                    className='card bg-light-success h-100 cursor-pointer' 
                    onClick={async () => {
                      setShowComplianceModal(true)
                      await loadNonCompliantLines()
                    }}
                    style={{ cursor: 'pointer' }}
                    title='Click to view non-compliant plan lines'
                  >
                    <div className='card-body d-flex flex-column justify-content-between'>
                      <div className='d-flex align-items-center mb-2'>
                        <span className='text-gray-400 fw-semibold fs-6 me-1'>Compliance</span>
                        <KTSVG path='/media/icons/duotune/arrows/arr071.svg' className='svg-icon-2 text-gray-400' />
                      </div>
                      <span className='text-gray-800 fw-bold fs-2qx'>{stats.compliancePercent}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts Widget */}
              {(alerts.overdueJobs > 0 || alerts.lowCompliancePlans > 0 || alerts.countersNearLimit > 0) && (
                <div className='card mb-6'>
                  <div className='card-header border-0'>
                    <h5 className='card-title text-dark fw-bold'>Alerts</h5>
                  </div>
                  <div className='card-body'>
                    <div className='d-flex flex-wrap gap-3'>
                      {alerts.overdueJobs > 0 && (
                        <div className='alert alert-danger d-flex align-items-center p-3'>
                          <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-2 me-3' />
                          <div>
                            <div className='fw-bold'>{alerts.overdueJobs} Overdue Jobs</div>
                            <div className='fs-7'>Requires immediate attention</div>
                          </div>
                          <button
                            className='btn btn-sm btn-light-danger ms-auto'
                            onClick={() => navigate('/technical/pms/jobs?state=PLANNED')}
                          >
                            View
                          </button>
                        </div>
                      )}
                      {alerts.lowCompliancePlans > 0 && (
                        <div className='alert alert-warning d-flex align-items-center p-3'>
                          <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-2 me-3' />
                          <div>
                            <div className='fw-bold'>{alerts.lowCompliancePlans} Plans with Low Compliance</div>
                            <div className='fs-7'>Compliance below 80%</div>
                          </div>
                          <button
                            className='btn btn-sm btn-light-warning ms-auto'
                            onClick={() => navigate('/technical/pms/plans')}
                          >
                            View
                          </button>
                        </div>
                      )}
                      {alerts.countersNearLimit > 0 && (
                        <div className='alert alert-info d-flex align-items-center p-3'>
                          <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-2 me-3' />
                          <div>
                            <div className='fw-bold'>{alerts.countersNearLimit} Counters Near Limit</div>
                            <div className='fs-7'>Approaching max daily jump threshold</div>
                          </div>
                          <button
                            className='btn btn-sm btn-light-info ms-auto'
                            onClick={() => navigate('/technical/pms/running-hours')}
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Overdue Jobs Widget */}
              {topOverdueJobs.length > 0 && (
                <div className='card mb-6'>
                  <div className='card-header border-0 d-flex justify-content-between'>
                    <h5 className='card-title text-dark fw-bold'>Top Overdue Jobs</h5>
                    <button
                      className='btn btn-sm btn-light'
                      onClick={() => navigate('/technical/pms/jobs')}
                    >
                      View All Jobs
                    </button>
                  </div>
                  <div className='card-body'>
                    <div className='table-responsive'>
                      <table className='table table-hover align-middle'>
                        <thead>
                          <tr>
                            <th>Job Code</th>
                            <th>Title</th>
                            <th>Vessel</th>
                            <th>Due Date</th>
                            <th>Overdue Days</th>
                            <th>State</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topOverdueJobs.map((job) => (
                            <tr key={job.id}>
                              <td className='fw-semibold'>{job.jobCode || `Job #${job.id}`}</td>
                              <td>{job.title || '-'}</td>
                              <td>{job.vesselName || '-'}</td>
                              <td>{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-'}</td>
                              <td>
                                <span className='badge badge-light-danger'>
                                  {job.overdueDays} days
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${getStateBadgeClass(job.state)}`}>
                                  {job.state}
                                </span>
                              </td>
                              <td>
                                <button
                                  className='btn btn-sm btn-light-primary'
                                  onClick={() => {
                                    // Open job detail - you may need to add a callback or navigate
                                    navigate(`/technical/pms/jobs`)
                                  }}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className='row g-6'>
                {/* Running Hours Chart */}
                <div className='col-xl-6'>
                  <div className='card'>
                    <div className='card-header border-0'>
                      <h5 className='card-title text-dark fw-bold'>Top 5 Running Hour Counters</h5>
                    </div>
                    <div className='card-body'>
                      {runningHoursData.length > 0 ? (
                        <Chart
                          options={chartOptions}
                          series={runningHoursData}
                          type='line'
                          height={300}
                        />
                      ) : (
                        <div className='text-center py-5 text-muted'>No running hour data available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Jobs */}
                <div className='col-xl-6'>
                  <div className='card'>
                    <div className='card-header border-0 d-flex justify-content-between'>
                      <h5 className='card-title text-dark fw-bold'>Recent Jobs</h5>
                      <button
                        className='btn btn-sm btn-light'
                        onClick={() => navigate('/technical/pms/jobs')}
                      >
                        View All
                      </button>
                    </div>
                    <div className='card-body'>
                      {recentJobs.length > 0 ? (
                        <div className='table-responsive'>
                          <table className='table table-hover align-middle'>
                            <thead>
                              <tr>
                                <th>Job Code</th>
                                <th>Title</th>
                                <th>Due Date</th>
                                <th>State</th>
                              </tr>
                            </thead>
                            <tbody>
                              {recentJobs.map(job => (
                                <tr
                                  key={job.id}
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => navigate(`/technical/pms/jobs/${job.id}`)}
                                >
                                  <td className='fw-semibold'>{job.jobCode || '-'}</td>
                                  <td>{job.title}</td>
                                  <td>{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-'}</td>
                                  <td>
                                    <span className={getStateBadgeClass(job.state)}>
                                      {job.state}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className='text-center py-5 text-muted'>No recent jobs</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Plan Compliance Table */}
              <div className='card mt-6'>
                <div className='card-header border-0 d-flex justify-content-between'>
                  <h5 className='card-title text-dark fw-bold'>Plan Compliance</h5>
                  <button
                    className='btn btn-sm btn-light'
                    onClick={() => navigate('/technical/pms/plans')}
                  >
                    View All Plans
                  </button>
                </div>
                <div className='card-body'>
                  {planCompliance.length > 0 ? (
                    <div className='table-responsive'>
                      <table className='table table-hover align-middle'>
                        <thead>
                          <tr>
                            <th>Plan Name</th>
                            <th>Vessel</th>
                            <th>Status</th>
                            <th>Total Lines</th>
                            <th>Completed</th>
                            <th>Compliance</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planCompliance.map(({ plan, totalLines, completedLines, compliancePercent }) => (
                            <tr key={plan.id}>
                              <td className='fw-semibold'>{plan.name}</td>
                              <td>{plan.vesselName || '-'}</td>
                              <td>
                                <span className={`badge badge-light-${
                                  plan.status === 'ACTIVE' ? 'success' :
                                  plan.status === 'DRAFT' ? 'warning' :
                                  plan.status === 'SUSPENDED' ? 'danger' : 'secondary'
                                }`}>
                                  {plan.status}
                                </span>
                              </td>
                              <td>{totalLines}</td>
                              <td>{completedLines}</td>
                              <td>
                                <span className={getComplianceBadgeClass(compliancePercent)}>
                                  {compliancePercent}%
                                </span>
                              </td>
                              <td>
                                <button
                                  className='btn btn-sm btn-light'
                                  onClick={() => navigate(`/technical/pms/plans/${plan.id}`)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className='text-center py-5 text-muted'>No plans available</div>
                  )}
                </div>
              </div>
                </>
            ) : (
              /* Reports Tab */
              <div>
                {/* Report Filters */}
                <div className='card mb-6'>
                  <div className='card-body'>
                    <div className='row g-3'>
                      <div className='col-md-3'>
                        <label className='form-label fw-semibold fs-6 mb-2 text-dark'>Vessel</label>
                        <select
                          className='form-select'
                          value={reportFilters.vesselId}
                          onChange={(e) => setReportFilters({ ...reportFilters, vesselId: e.target.value })}
                        >
                          <option value=''>All Vessels</option>
                          {vessels.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.fleet_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='col-md-3'>
                        <label className='form-label fw-semibold fs-6 mb-2 text-dark'>From Date</label>
                        <input
                          type='date'
                          className='form-control'
                          value={reportFilters.fromDate}
                          onChange={(e) => setReportFilters({ ...reportFilters, fromDate: e.target.value })}
                        />
                      </div>
                      <div className='col-md-3'>
                        <label className='form-label fw-semibold fs-6 mb-2 text-dark'>To Date</label>
                        <input
                          type='date'
                          className='form-control'
                          value={reportFilters.toDate}
                          onChange={(e) => setReportFilters({ ...reportFilters, toDate: e.target.value })}
                        />
                      </div>
                      <div className='col-md-3'>
                        <label className='form-label fw-semibold fs-6 mb-2 text-dark'>Job State</label>
                        <select
                          className='form-select'
                          value={reportFilters.state}
                          onChange={(e) => setReportFilters({ ...reportFilters, state: e.target.value as PmsJobState | '' })}
                        >
                          <option value=''>All States</option>
                          <option value='PLANNED'>Planned</option>
                          <option value='IN_PROGRESS'>In Progress</option>
                          <option value='COMPLETED'>Completed</option>
                          <option value='VERIFIED'>Verified</option>
                          <option value='CLOSED'>Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {loadingReports ? (
                  <div className='text-center py-5'>
                    <div className='spinner-border' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className='row g-6'>
                    {/* Compliance Report */}
                    <div className='col-12'>
                      <div className='card'>
                        <div className='card-header border-0 d-flex justify-content-between'>
                          <h5 className='card-title text-dark fw-bold'>Compliance Report</h5>
                          {complianceReport && (
                            <button
                              className='btn btn-sm btn-light'
                              onClick={async () => {
                                try {
                                  const vesselId = reportFilters.vesselId ? Number(reportFilters.vesselId) : undefined
                                  await exportComplianceReport(vesselId, reportFilters.fromDate || undefined, reportFilters.toDate || undefined)
                                  toast.success('Compliance report exported successfully', { position: 'top-center' })
                                } catch (error: any) {
                                  toast.error(error?.message || 'Failed to export report', { position: 'top-center' })
                                }
                              }}
                            >
                              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
                              Export CSV
                            </button>
                          )}
                        </div>
                        <div className='card-body'>
                          {complianceReport ? (
                            <div className='row g-3'>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Total Plan Lines</div>
                                <div className='fw-bold fs-3'>{complianceReport.totalPlanLines}</div>
                              </div>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Completed Lines</div>
                                <div className='fw-bold fs-3'>{complianceReport.completedPlanLines}</div>
                              </div>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Compliance %</div>
                                <div className={`fw-bold fs-3 ${getComplianceBadgeClass(complianceReport.compliancePercent).replace('badge ', '')}`}>
                                  {complianceReport.compliancePercent.toFixed(1)}%
                                </div>
                              </div>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Overdue Jobs</div>
                                <div className='fw-bold fs-3 text-danger'>{complianceReport.overdueJobs}</div>
                              </div>
                            </div>
                          ) : (
                            <div className='text-center py-5 text-muted'>No compliance data available</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Job History Report */}
                    <div className='col-12'>
                      <div className='card'>
                        <div className='card-header border-0 d-flex justify-content-between'>
                          <h5 className='card-title text-dark fw-bold'>Job History Report</h5>
                          {jobHistoryReport.length > 0 && (
                            <button
                              className='btn btn-sm btn-light'
                              onClick={async () => {
                                try {
                                  const vesselId = reportFilters.vesselId ? Number(reportFilters.vesselId) : undefined
                                  await exportJobHistoryReport(vesselId, reportFilters.fromDate || undefined, reportFilters.toDate || undefined, reportFilters.state || undefined)
                                  toast.success('Job history report exported successfully', { position: 'top-center' })
                                } catch (error: any) {
                                  toast.error(error?.message || 'Failed to export report', { position: 'top-center' })
                                }
                              }}
                            >
                              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
                              Export CSV
                            </button>
                          )}
                        </div>
                        <div className='card-body'>
                          {jobHistoryReport.length > 0 ? (
                            <div className='table-responsive'>
                              <table className='table table-bordered align-middle'>
                                <thead>
                                  <tr>
                                    <th>Job Code</th>
                                    <th>Vessel</th>
                                    <th>Title</th>
                                    <th>Equipment</th>
                                    <th>Component</th>
                                    <th>State</th>
                                    <th>Due Date</th>
                                    <th>Completion Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {jobHistoryReport.map((job) => (
                                    <tr key={job.jobId}>
                                      <td>{job.jobCode || '-'}</td>
                                      <td>{job.vesselName || '-'}</td>
                                      <td>{job.title || '-'}</td>
                                      <td>{job.equipmentName || '-'}</td>
                                      <td>{job.componentName || '-'}</td>
                                      <td>
                                        <span className={getStateBadgeClass(job.state as PmsJobState)}>
                                          {job.state || '-'}
                                        </span>
                                      </td>
                                      <td>{job.dueDate ? new Date(job.dueDate).toLocaleDateString() : '-'}</td>
                                      <td>{job.actualCompletionDate ? new Date(job.actualCompletionDate).toLocaleDateString() : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className='text-center py-5 text-muted'>No job history data available</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Overhaul History Report */}
                    <div className='col-12'>
                      <div className='card'>
                        <div className='card-header border-0 d-flex justify-content-between'>
                          <h5 className='card-title text-dark fw-bold'>Overhaul History Report</h5>
                          {overhaulHistoryReport.length > 0 && (
                            <button
                              className='btn btn-sm btn-light'
                              onClick={async () => {
                                try {
                                  const vesselId = reportFilters.vesselId ? Number(reportFilters.vesselId) : undefined
                                  await exportOverhaulHistoryReport(vesselId, reportFilters.fromDate || undefined, reportFilters.toDate || undefined)
                                  toast.success('Overhaul history report exported successfully', { position: 'top-center' })
                                } catch (error: any) {
                                  toast.error(error?.message || 'Failed to export report', { position: 'top-center' })
                                }
                              }}
                            >
                              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
                              Export CSV
                            </button>
                          )}
                        </div>
                        <div className='card-body'>
                          {overhaulHistoryReport.length > 0 ? (
                            <div className='table-responsive'>
                              <table className='table table-bordered align-middle'>
                                <thead>
                                  <tr>
                                    <th>Job Code</th>
                                    <th>Vessel</th>
                                    <th>Title</th>
                                    <th>Equipment</th>
                                    <th>Component</th>
                                    <th>Completion Date</th>
                                    <th>Running Hours</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {overhaulHistoryReport.map((overhaul) => (
                                    <tr key={overhaul.jobId}>
                                      <td>{overhaul.jobCode || '-'}</td>
                                      <td>{overhaul.vesselName || '-'}</td>
                                      <td>{overhaul.title || '-'}</td>
                                      <td>{overhaul.equipmentName || '-'}</td>
                                      <td>{overhaul.componentName || '-'}</td>
                                      <td>{overhaul.completionDate ? new Date(overhaul.completionDate).toLocaleDateString() : '-'}</td>
                                      <td>{overhaul.runningHoursAtCompletion ? `${overhaul.runningHoursAtCompletion} hrs` : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className='text-center py-5 text-muted'>No overhaul history data available</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Spares Consumption Report */}
                    <div className='col-12'>
                      <div className='card'>
                        <div className='card-header border-0 d-flex justify-content-between'>
                          <h5 className='card-title text-dark fw-bold'>Spares Consumption Report</h5>
                          {sparesConsumptionReport.length > 0 && (
                            <button
                              className='btn btn-sm btn-light'
                              onClick={async () => {
                                try {
                                  const vesselId = reportFilters.vesselId ? Number(reportFilters.vesselId) : undefined
                                  await exportSparesConsumptionReport(vesselId, undefined, undefined, reportFilters.fromDate || undefined, reportFilters.toDate || undefined)
                                  toast.success('Spares consumption report exported successfully', { position: 'top-center' })
                                } catch (error: any) {
                                  toast.error(error?.message || 'Failed to export report', { position: 'top-center' })
                                }
                              }}
                            >
                              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
                              Export CSV
                            </button>
                          )}
                        </div>
                        <div className='card-body'>
                          {sparesConsumptionReport.length > 0 ? (
                            <div className='table-responsive'>
                              <table className='table table-bordered align-middle'>
                                <thead>
                                  <tr>
                                    <th>Item Name</th>
                                    <th>Part Number</th>
                                    <th>Total Quantity</th>
                                    <th>Total Cost</th>
                                    <th>Job Count</th>
                                    <th>Vessel</th>
                                    <th>Equipment</th>
                                    <th>Component</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sparesConsumptionReport.map((item) => (
                                    <tr key={item.inventoryItemId}>
                                      <td>{item.inventoryItemName || '-'}</td>
                                      <td>{item.partNumber || '-'}</td>
                                      <td>{item.totalQuantity}</td>
                                      <td>${item.totalCost.toFixed(2)}</td>
                                      <td>{item.jobCount}</td>
                                      <td>{item.vesselName || '-'}</td>
                                      <td>{item.equipmentName || '-'}</td>
                                      <td>{item.componentName || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className='table-light'>
                                    <td colSpan={2} className='text-end fw-bold'>Grand Total:</td>
                                    <td className='fw-bold'>{sparesConsumptionReport.reduce((sum, item) => sum + item.totalQuantity, 0)}</td>
                                    <td className='fw-bold'>${sparesConsumptionReport.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}</td>
                                    <td colSpan={4}></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          ) : (
                            <div className='text-center py-5 text-muted'>No spares consumption data available</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Defects Integration Report */}
                    <div className='col-12'>
                      <div className='card'>
                        <div className='card-header border-0 d-flex justify-content-between'>
                          <h5 className='card-title text-dark fw-bold'>Defects Integration Report</h5>
                          {defectsIntegrationReport && (
                            <button
                              className='btn btn-sm btn-light'
                              onClick={async () => {
                                try {
                                  const vesselId = reportFilters.vesselId ? Number(reportFilters.vesselId) : undefined
                                  await exportDefectsIntegrationReport(vesselId, reportFilters.fromDate || undefined, reportFilters.toDate || undefined)
                                  toast.success('Defects integration report exported successfully', { position: 'top-center' })
                                } catch (error: any) {
                                  toast.error(error?.message || 'Failed to export report', { position: 'top-center' })
                                }
                              }}
                            >
                              <KTSVG path='/media/icons/duotune/files/fil021.svg' className='svg-icon-2' />
                              Export CSV
                            </button>
                          )}
                        </div>
                        <div className='card-body'>
                          {defectsIntegrationReport ? (
                            <div className='row g-3'>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Total Jobs</div>
                                <div className='fw-bold fs-3'>{defectsIntegrationReport.totalJobs}</div>
                              </div>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Jobs from Defects</div>
                                <div className='fw-bold fs-3'>{defectsIntegrationReport.jobsCreatedFromDefects}</div>
                                <div className='text-muted fs-7'>{defectsIntegrationReport.jobsFromDefectsPercent.toFixed(1)}% of total</div>
                              </div>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Defects Resolved via PMS</div>
                                <div className='fw-bold fs-3'>{defectsIntegrationReport.defectsResolvedViaPms}</div>
                              </div>
                              <div className='col-md-3'>
                                <div className='fw-semibold text-muted fs-7 mb-1'>Avg Resolution Time</div>
                                <div className='fw-bold fs-3'>{defectsIntegrationReport.averageResolutionDays.toFixed(1)} days</div>
                              </div>
                            </div>
                          ) : (
                            <div className='text-center py-5 text-muted'>No defects integration data available</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Drill-Down Modal */}
      {showComplianceModal && (
        <div
          className='modal fade show d-flex align-items-center justify-content-center'
          style={{ background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050 }}
          onClick={(e) => e.target === e.currentTarget && setShowComplianceModal(false)}
        >
          <div className='modal-dialog modal-xl modal-dialog-centered'>
            <div className='modal-content bg-white text-dark'>
              <div className='modal-header'>
                <h5 className='modal-title'>Non-Compliant Plan Lines</h5>
                <button type='button' className='btn-close' onClick={() => setShowComplianceModal(false)} />
              </div>
              <div className='modal-body'>
                {loadingNonCompliant ? (
                  <div className='text-center py-5'>
                    <div className='spinner-border' role='status'>
                      <span className='visually-hidden'>Loading...</span>
                    </div>
                  </div>
                ) : nonCompliantLines.length === 0 ? (
                  <div className='text-muted text-center py-4'>
                    <KTSVG path='/media/icons/duotune/general/gen044.svg' className='svg-icon-5x text-success mb-3' />
                    <div className='fw-bold fs-5'>All plan lines are compliant!</div>
                    <div className='fs-7'>No overdue or non-compliant plan lines found.</div>
                  </div>
                ) : (
                  <div className='table-responsive'>
                    <table className='table table-bordered align-middle'>
                      <thead>
                        <tr>
                          <th>Plan</th>
                          <th>Task Description</th>
                          <th>Component/SubComponent</th>
                          <th>Due Date</th>
                          <th>Last Done</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nonCompliantLines.map((line) => {
                          const dueDate = line.nextDueDate ? new Date(line.nextDueDate) : null
                          const lastDone = line.lastDoneDate ? new Date(line.lastDoneDate) : null
                          const isOverdue = dueDate && dueDate < new Date()
                          
                          return (
                            <tr key={line.id} className={isOverdue ? 'table-danger' : ''}>
                              <td>{line.planName || `Plan #${line.planId}`}</td>
                              <td>{line.taskDescription}</td>
                              <td>
                                {line.subComponentName 
                                  ? `SubComponent: ${line.subComponentName}`
                                  : line.componentName
                                  ? `Component: ${line.componentName}`
                                  : '-'}
                              </td>
                              <td>
                                {dueDate ? (
                                  <span className={isOverdue ? 'text-danger fw-bold' : ''}>
                                    {dueDate.toLocaleDateString()}
                                    {isOverdue && <span className='badge badge-light-danger ms-2'>Overdue</span>}
                                  </span>
                                ) : '-'}
                              </td>
                              <td>{lastDone ? lastDone.toLocaleDateString() : 'Never'}</td>
                              <td>
                                <span className={`badge ${line.active ? 'badge-light-success' : 'badge-light-secondary'}`}>
                                  {line.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className='modal-footer'>
                <button type='button' className='btn btn-light' onClick={() => setShowComplianceModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PmsDashboard
