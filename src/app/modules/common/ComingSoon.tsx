// src/app/modules/common/ComingSoon.tsx
import React, {FC} from 'react'
import {KTSVG} from '../../../_metronic/helpers'

export const ComingSoon: FC<{title: string}> = ({title}) => (
  <div className='d-flex flex-column align-items-center justify-content-center h-100 text-center p-10'>
    <div className='mb-5'>
      <KTSVG
        path='/media/icons/duotune/general/gen008.svg'
        className='svg-icon-4x text-muted'
      />
    </div>
    <h3 className='fw-bold mb-3'>{title}</h3>
    <p className='text-muted fs-6 mb-0' style={{maxWidth: 480}}>
      This module is coming soon. Our team is working on the {title.toLowerCase()} workflow.
      You’ll see it here once it’s ready.
    </p>
<br />
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
)
