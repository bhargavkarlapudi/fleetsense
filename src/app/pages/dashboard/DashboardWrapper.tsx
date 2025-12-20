/* eslint-disable jsx-a11y/anchor-is-valid */
import { FC, useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { PageTitle } from '../../../_metronic/layout/core'
import MapView from './components/MapView'
import VesselsView from './components/VesselsView'
import { Route, Routes } from 'react-router-dom'
import { Vessel } from './core/_models'
import { useAuth } from '../../modules/auth'

const DashboardPage: FC = () => {
  // const roleId = sessionStorage.getItem('roleId'); // Fetch roleId from sessionStorage
  // const vesselName = sessionStorage.getItem('vesselName');
  // const vesselType = sessionStorage.getItem('vesselType');
  // const vesselId = sessionStorage.getItem('vesselId');
  // const imoNumber = sessionStorage.getItem('imoNumber');

  const { currentUser } = useAuth()
  const roleId = currentUser?.role?.id;
  const vesselId = currentUser?.vessel?.id;
  const vesselType = currentUser?.vessel?.vesselType;
  const vesselName = currentUser?.vessel?.fleet_name;
  const imoNumber = currentUser?.vessel?.imoNumber;

  const [filteredVessels, setFilteredVessels] = useState<Vessel[]>([]);
  useEffect(() => {
    const fetchVessels = async () => {
      try {

        const getRandomPacificCoords = (): [number, number] => {
          const lat = +(Math.random() * 120 - 60).toFixed(4); // -60 to +60 latitude
          const lon = +(Math.random() * 170 + 120).toFixed(4); // 120 to 290 longitude (wraps around globe)

          // Convert longitudes > 180 to negative values (for western hemisphere representation)
          const normalizedLon = lon > 180 ? lon - 360 : lon;

          return [normalizedLon, lat];
        };

        if (!vesselName ||
          !imoNumber ||
          !vesselType) {
          return;
        }

        const vesselsWithRandomData: Vessel = {
          id: Number(vesselId),
          fleet_name: vesselName,
          imoNumber,
          vesselType,
          status: "At Sea",
          port: "PORT SUDAN",
          eta: '2025-01-05, 08:00 UTC',
          coords: getRandomPacificCoords(),  // <- now generates lat/lon dynamically
        };


        setFilteredVessels([vesselsWithRandomData]);
      } catch (error) {
        console.error('Failed to fetch company list:', error);
      }
    };

    if (roleId === 4) {
      fetchVessels();
    }
  }, [roleId]);

  return (
    <>
      <div className='map-wrapper'>
        <div className="d-flex vh-100">
          {roleId !== 4 && <VesselsView setFilteredVessels={setFilteredVessels} />} {/* Conditionally render based on roleId */}
          <MapView vesselMarkers={filteredVessels} />
        </div>
      </div>
    </>
  );
};

const DashboardWrapper: FC = () => {
  const intl = useIntl()
  return (
    <>
      <PageTitle breadcrumbs={[]}>{intl.formatMessage({ id: 'MENU.DASHBOARD' })}</PageTitle>
      <Routes>
                <Route path='' element={<DashboardPage />} />

      </Routes>
      {/* <DashboardPage /> */}
    </>
  )
}

export { DashboardWrapper }
