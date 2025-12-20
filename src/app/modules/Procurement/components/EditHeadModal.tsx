import { FC, useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { getInventoryCategories, getAllInventoryCategoriesForAllCompanies } from '../core/_requests'
import { InventoryCategory, InventoryItemHead } from '../core/_models'
import { useAuth } from '../../auth'

interface EditHeadModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (id: number, payload: { name: string; inventoryItemCategoryId: number }) => Promise<void>
  head: InventoryItemHead | null
}

const EditHeadModal: FC<EditHeadModalProps> = ({ visible, onClose, onSubmit, head }) => {
  const { currentUser } = useAuth()
  const [name, setName] = useState('')
  const [inventoryItemCategoryId, setInventoryItemCategoryId] = useState<number | ''>('')
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)

  useEffect(() => {
    if (visible && head) {
      setName(head.name)
      setInventoryItemCategoryId(head.inventoryItemCategoryId)
      loadCategories()
    }
  }, [visible, head])

  const loadCategories = async () => {
    setIsLoadingCategories(true)
    try {
      const roleId = currentUser?.role?.id
      if (roleId === 1) {
        // Superadmin - load all categories
        const data = await getAllInventoryCategoriesForAllCompanies()
        setCategories(data)
      } else {
        // Company user - load categories for their company
        const cgaId = currentUser?.roleEntityId || (currentUser as any)?.companyGroupAdminId
        if (cgaId) {
          const data = await getInventoryCategories(Number(cgaId), 0)
          setCategories(data)
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error('Failed to load categories')
    } finally {
      setIsLoadingCategories(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!head) return

    if (!name.trim()) {
      toast.error('Please enter a head name')
      return
    }

    if (!inventoryItemCategoryId) {
      toast.error('Please select a category')
      return
    }

    setIsLoading(true)
    try {
      await onSubmit(head.id, {
        name: name.trim(),
        inventoryItemCategoryId: Number(inventoryItemCategoryId)
      })
      toast.success('Head updated successfully!')
      handleClose()
    } catch (error: any) {
      console.error('Error updating head:', error)
      toast.error(error.message || 'Failed to update head')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setInventoryItemCategoryId('')
    onClose()
  }

  if (!visible || !head) return null

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
            <h3 className='modal-title fw-bold text-dark'>Edit Head</h3>
            <button type='button' className='btn-close' onClick={handleClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className='modal-body'>
              <div className='mb-4'>
                <label className='form-label fw-semibold text-muted fs-7 required'>Head Name</label>
                <input
                  type='text'
                  className='form-control'
                  placeholder='Enter head name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className='mb-4'>
                <label className='form-label fw-semibold text-muted fs-7 required'>Category</label>
                <select
                  className='form-select'
                  value={inventoryItemCategoryId}
                  onChange={(e) => setInventoryItemCategoryId(Number(e.target.value))}
                  required
                  disabled={isLoadingCategories}
                >
                  <option value=''>
                    {isLoadingCategories ? 'Loading categories...' : 'Select a category'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
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
                {isLoading ? 'Updating...' : 'Update Head'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default EditHeadModal
