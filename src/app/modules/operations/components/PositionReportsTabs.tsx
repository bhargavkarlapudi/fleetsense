import React, {FC} from 'react'
import {useSearchParams} from 'react-router-dom'
import {KTSVG} from '../../../../_metronic/helpers'
import PositionReport from './PositionReportNew'
import {OperationsList} from './OperationsList'
import {useAuth} from '../../auth'

/**
 * One page with two tabs:
 * - View 1: PositionReportNew
 * - View 2: OperationsList
 *
 * Uses ?tab=view1|view2 to deep-link the active tab.
 */
const PositionReportsTabs: FC = () => {
  const [params, setParams] = useSearchParams()
  const activeTab = (params.get('tab') === 'view2' ? 'view2' : 'view1') as 'view1' | 'view2'
  const setActive = (tab: 'view1' | 'view2') => {
    const next = new URLSearchParams(params)
    next.set('tab', tab)
    setParams(next, {replace: true})
  }

  // Optional: role-based actions (e.g., show Create Report when View 2 is active)
  const {currentUser} = useAuth() as any
  const roleId = currentUser?.role?.id
  const isCrew = roleId === 4

  // === CREW: no tabs, only operations list ===
  if (isCrew) {
    return (
      <div
        className='app-main flex-column flex-row-fluid'
        id='kt_app_main'
        style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}
      >
        <div className='d-flex flex-column flex-column-fluid' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
          <div id='kt_app_content' className='app-content flex-column-fluid d-flex flex-column' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
            <div className='card flex-column-fluid d-flex flex-column' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
              {/* Simple header without tabs */}
              <div className='px-5 py-3 border-bottom d-flex align-items-center justify-content-between bg-white'>
                <h3 className='card-title fw-bold text-dark m-0'>Operations</h3>
                <button
                  className='btn btn_primary btn-sm'
                  onClick={() => document.dispatchEvent(new CustomEvent('opslist-open-create-modal'))}
                >
                  Create report
                </button>
              </div>

              {/* Only OperationsList */}
              <div style={{flex: 1, minHeight: 0, overflow: 'hidden'}}>
                <OperationsList embedded />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // === NON-CREW: keep tabs behavior ===
  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
      <div className='d-flex flex-column flex-column-fluid' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
        <div id='kt_app_content' className='app-content flex-column-fluid d-flex flex-column' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
          <div className='card flex-column-fluid d-flex flex-column' style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0}}>
            <div className='px-5 py-3 border-bottom d-flex align-items-center justify-content-between bg-white'>
              <h3 className='card-title fw-bold text-dark m-0'>Position Reports</h3>

              {/* Tabs on the top right */}
              <div className='d-flex align-items-center gap-3'>
                <div className='btn-group btn-group-sm' role='group' aria-label='View switch'>
                  <button
                    type='button'
                    className={`btn btn-sm ${activeTab === 'view1' ? 'btn_primary' : 'btn-light border border-secondary'}`}
                    onClick={() => setActive('view1')}
                    title='Position Report New'
                  >
                    View 1
                  </button>
                  <button
                    type='button'
                    className={`btn btn-sm ${activeTab === 'view2' ? 'btn_primary' : 'btn-light border border-secondary'}`}
                    onClick={() => setActive('view2')}
                    title='Operations List'
                  >
                    View 2
                  </button>
                </div>
              </div>
            </div>

            {/* Body swaps */}
            <div style={{flex: 1, minHeight: 0, overflow: 'hidden'}}>
              <div style={{display: activeTab === 'view1' ? 'block' : 'none', height: '100%'}}>
                <PositionReport embedded />
              </div>
              <div style={{display: activeTab === 'view2' ? 'block' : 'none', height: '100%'}}>
                <OperationsList embedded />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PositionReportsTabs