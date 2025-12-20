import React, { FC } from 'react';
import { KTSVG } from '../../../../_metronic/helpers';

interface BreadcrumbItem {
    id: string;
    title: string;
    path?: string;
}

interface BreadcrumbNavProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigate: (breadcrumb: BreadcrumbItem) => void;
}

const BreadcrumbNav: FC<BreadcrumbNavProps> = ({ breadcrumbs, onNavigate }) => {
  return (
    <nav aria-label="breadcrumb">
      <ol className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 mb-0">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.id} className="breadcrumb-item">
            {index === breadcrumbs.length - 1 ? (
              <span className="text-gray-800 fw-bold" style={{fontSize:'14px'}}>{crumb.title}</span>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-link p-0 text-muted hover-text-primary"
                  style={{ textDecoration: 'none', cursor: 'pointer',fontSize:'14px' }}
                  onClick={() => onNavigate(crumb)}
                >
                  {crumb.title}
                </button>
                <KTSVG
                  path="/media/icons/duotune/arrows/arr071.svg"
                  className="svg-icon-4 svg-icon-gray-500 mx-2"
                />
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export {BreadcrumbNav};