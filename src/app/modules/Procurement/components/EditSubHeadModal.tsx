import { FC, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getInventoryItemHeads } from '../core/_requests'
import { InventoryItemHead, InventoryItemSubHead } from '../core/_models'

interface EditSubHeadModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (id: number, payload: { name: string; inventoryItemHeadId: number }) => Promise<void>
  subHead: InventoryItemSubHead | null
}

const EditSubHeadModal: FC<EditSubHeadModalProps> = ({ visible, onClose, onSubmit, subHead }) => {
  const [name, setName] = useState('')
  const [inventoryItemHeadId, setInventoryItemHeadId] = useState<number | ''>('')
  const [heads, setHeads] = useState<InventoryItemHead[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHeads, setIsLoadingHeads] = useState(false)

  useEffect(() => {
    if (visible && subHead) {
      setName(subHead.name)
      setInventoryItemHeadId(subHead.inventoryItemHeadId)
      loadHeads()
    }
  }, [visible, subHead])

  const loadHeads = async () => {
    setIsLoadingHeads(true)
    try {
      const data = await getInventoryItemHeads()
      setHeads(data)
    } catch (error) {
      console.error('Error loading heads:', error)
      toast.error('Failed to load heads')
    } finally {
      setIsLoadingHeads(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subHead) return

    if (!name.trim()) {
      toast.error('Please enter a sub head name')
      return
    }

    if (!inventoryItemHeadId) {
      toast.error('Please select a head')
      return
    }

    setIsLoading(true)
    try {
      await onSubmit(subHead.id, {
        name: name.trim(),
        inventoryItemHeadId: Number(inventoryItemHeadId)
      })
      toast.success('Sub head updated successfully!')
      handleClose()
    } catch (error: any) {
      console.error('Error updating sub head:', error)
      toast.error(error.message || 'Failed to update sub head')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setInventoryItemHeadId('')
    onClose()
  }

  if (!visible || !subHead) return null

  return (
    <div
      className="modal fade show d-flex align-items-center justify-content-center"
      tabIndex={-1}
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1050,
      }}
    >
      <div className='modal-dialog modal-dialog-centered' role='document'>
        <div className='modal-content bg-white'>
          <div className='modal-header border-bottom'>
            <h3 className='modal-title fw-bold text-dark'>Edit Sub Head</h3>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              <div className='mb-4'>
                <label className='form-label fw-semibold text-muted fs-7 required'>Sub Head Name</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Enter sub head name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className='mb-4'>
                <label className='form-label fw-semibold text-muted fs-7 required'>Head</label>
                <select
                  className='form-select'
                  value={inventoryItemHeadId}
                  onChange={(e) => setInventoryItemHeadId(Number(e.target.value))}
                  required
                  disabled={isLoadingHeads}
                >
                  <option value=''>
                    {isLoadingHeads ? 'Loading heads...' : 'Select a head'}
                  </option>
                  {heads.map((head) => (
                    <option key={head.id} value={head.id}>
                      {head.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='modal-footer border-top'>
              <button
                type='button'
                className='btn btn-light'
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type='submit'
                className='btn btn_primary'
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Sub Head'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditSubHeadModal
