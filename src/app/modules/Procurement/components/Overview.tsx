import { FC } from 'react'
import { KTSVG } from '../../../../_metronic/helpers'

const Overview: FC = () => {
  return (
    <div className='app-main flex-column flex-row-fluid' id='kt_app_main' style={{height: '100vh'}}>
      <div className='d-flex flex-column flex-column-fluid'>
        <div
          id='kt_app_content'
          className='app-content flex-column-fluid d-flex flex-column '
          style={{flex: 1}}
        >
          <div className='card flex-column-fluid d-flex flex-column justify-content-center align-items-center p-10' style={{flex: 1}}>
            {/* Title and Subtitle */}
            <div className='text-center mb-10'>
              <h1 className='fw-bold text-dark mb-4'>Feature Coming Soon</h1>
              <p className='text-muted fs-5'>We're actively working on this section. Please check back later!</p>
            </div>

            {/* Skeleton Screen Image */}
            <div className='mb-10 w-100 d-flex justify-content-center'>
              <img
                src='/media/stock/fleet/skeletonscreen.jpg'
                alt='Skeleton Preview'
                style={{maxWidth: '1000px', width: '100%', borderRadius: '12px', boxShadow: '0 0 10px rgba(0,0,0,0.1)'}}
              />
            </div>

            {/* Optional Go Back Button */}
            <button
              className='btn btn-light-primary fw-bold'
              onClick={() => window.history.back()}
            >
              <KTSVG path='/media/icons/duotune/arrows/arr02.svg' className='svg-icon-2 me-2' />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview
