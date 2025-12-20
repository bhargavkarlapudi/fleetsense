import React, {FC, useState} from 'react'
import type {QhseInspectionKind, VesselLite} from '../core/_models'

type Option = { value: string; label: string }
const ALL_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const

interface MultiSelectProps {
  label: string
  options: Option[]
  selected: string[]
  onChange: (v: string[]) => void
  error?: string
}

const LABEL_CLS = 'form-label fw-semibold fs-6 mb-2 text-dark'
const WRAP_STYLE: React.CSSProperties = { background: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0, zIndex: 1050 }

const MultiSelect: FC<MultiSelectProps> = ({label, options, selected, onChange, error}) => {
  const [open, setOpen] = useState(false)
  const toggle = () => setOpen(o=>!o)
  const toggleItem = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v=>v!==val) : [...selected, val])
  }
  const display = selected.length ? `${selected.length} selected` : `Select ${label}`
  const all = options.map(o=>o.value)
  const toggleAll = () => onChange(selected.length === options.length ? [] : all)

  return (
    <div className='dropdown'>
      <button type='button' className={`form-control text-start d-flex justify-content-between align-items-center ${error?'is-invalid':''}`} onClick={toggle}>
        <span className='text-dark'>{display}</span><i className={`fas fa-chevron-${open?'up':'down'}`}/>
      </button>
      {open && (
        <div className='dropdown-menu show w-100' style={{maxHeight: 240, overflowY: 'auto'}}>
          <div className='px-3 py-2'>
            <div className='form-check'>
              <input className='form-check-input' type='checkbox' checked={selected.length===options.length} onChange={toggleAll}/>
              <label className='form-check-label text-dark'>Select All</label>
            </div>
          </div>
          <div className='dropdown-divider'/>
          {options.map(o=>(
            <div key={o.value} className='px-3 py-1'>
              <div className='form-check'>
                <input className='form-check-input' type='checkbox' checked={selected.includes(o.value)} onChange={()=>toggleItem(o.value)} id={`${label}-${o.value}`}/>
                <label className='form-check-label text-dark' htmlFor={`${label}-${o.value}`}>{o.label}</label>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className='invalid-feedback d-block'>{error}</div>}
    </div>
  )
}

type NewPlanData = {
  inspectionKindId: number
  vesselIds: number[]
  months: number[]   // 1..12
  year: number
}

interface AddPlanModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (data: NewPlanData, saveAndAddNew: boolean) => void
 kinds: QhseInspectionKind[]
  vessels: VesselLite[]          
}

const AddInspetionPlanModal: FC<AddPlanModalProps> = ({ visible, onClose, onSubmit, kinds, vessels }) => {
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [inspectionKind, setInspectionKind] = useState<string>('')
  const [selectedVesselIds, setSelectedVesselIds] = useState<string[]>([])
  const [selectedMonthLabels, setSelectedMonthLabels] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string,string>>({})

  const vesselOptions: Option[] = vessels.map(v=>({ value: String(v.id), label: v.name }))
  const monthOptions: Option[] = (ALL_MONTHS as readonly string[]).map(m=>({value:m,label:m}))

  const reset = () => {
    setInspectionKind('')
    setSelectedVesselIds([])
    setSelectedMonthLabels([])
    setErrors({})
  }
  const close = () => { reset(); onClose() }

  const validate = () => {
    const er: Record<string,string> = {}
    if (!inspectionKind) er.inspectionKind = 'Inspection is required'
    if (selectedVesselIds.length===0) er.vessels = 'Select at least one vessel'
    if (selectedMonthLabels.length===0) er.months = 'Select at least one month'
    setErrors(er)
    return Object.keys(er).length===0
  }

  const submit = (saveAndAddNew: boolean) => {
    if (!validate()) return
    const months = selectedMonthLabels.map(m=>ALL_MONTHS.indexOf(m as any)+1).filter(n=>n>0)
    onSubmit({
      year,
      inspectionKindId: Number(inspectionKind),
      vesselIds: selectedVesselIds.map(Number),
      months,
    }, saveAndAddNew)
    if (saveAndAddNew) reset(); else close()
  }

  if (!visible) return null

  return (
    <div className="modal fade show d-flex align-items-center justify-content-center" style={WRAP_STYLE}>
      <div className='modal-dialog modal-lg modal-dialog-centered'>
        <div className='modal-content bg-white text-dark'>
          <div className='modal-header'>
            <h5 className='modal-title text-dark'>Add Plan</h5>
            <button type='button' className='btn-close' onClick={close}/>
          </div>
          <div className='modal-body'>
            <div className='row g-5'>
              <div className='col-12'>
                <label className={LABEL_CLS}>Year</label>
                <select className='form-select text-dark' value={year} onChange={(e)=>setYear(parseInt(e.target.value,10))}>
                  {Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i).map(y=><option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div className='col-12'>
                <label className={LABEL_CLS}>Inspection <span className='text-danger'>*</span></label>
                <select
                  className={`form-select text-dark ${errors.inspectionKind?'is-invalid':''}`}
                  value={inspectionKind}
                  onChange={e=>setInspectionKind(e.target.value)}
                >
                  <option value="">Select Inspection</option>
                  {kinds.map(k => <option key={k.id} value={String(k.id)}>{k.name}</option>)}
                </select>
                {errors.inspectionKind && <div className='invalid-feedback'>{errors.inspectionKind}</div>}
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Vessels <span className='text-danger'>*</span></label>
                <MultiSelect
                  label="Vessels"
                  options={vesselOptions}
                  selected={selectedVesselIds}
                  onChange={setSelectedVesselIds}
                  error={errors.vessels}
                />
              </div>

              <div className='col-md-6'>
                <label className={LABEL_CLS}>Months <span className='text-danger'>*</span></label>
                <MultiSelect
                  label="Months"
                  options={monthOptions}
                  selected={selectedMonthLabels}
                  onChange={setSelectedMonthLabels}
                  error={errors.months}
                />
              </div>
            </div>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-light btn-sm' onClick={close}>Cancel</button>
            <button type='button' className='btn btn_primary btn-sm' onClick={()=>submit(true)}>Save & Add New</button>
            <button type='button' className='btn btn_primary' onClick={()=>submit(false)}>Save & Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddInspetionPlanModal
