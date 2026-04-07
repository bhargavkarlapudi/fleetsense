// VesselMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import { OSM, XYZ } from 'ol/source';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Fill, Icon, Stroke, Style } from 'ol/style';
import Overlay from 'ol/Overlay';
import { KTSVG } from '../../../../_metronic/helpers';
import GeoJSON from 'ol/format/GeoJSON';
import { Vessel, VesselDetails } from '../core/_models';
import { Geometry } from 'ol/geom';
import { get as getProjection } from 'ol/proj'
import { Text } from 'ol/style'
import { getVesselDetails } from '../core/_requests';
import { useAuth } from '../../../modules/auth';

interface ShipMarker {
  lat: string;
  lng: string;
  name: string;
  course: number;
  data: string;
  extraData?: any;  // Make extraData optional
}

interface MapViewProps {
  vesselMarkers: Vessel[];
    height?: string | number;      // NEW
  compact?: boolean;             // NEW
}

const MapView: React.FC<MapViewProps> = ({ vesselMarkers, height = '100%', compact = false  }) => {
  console.log(vesselMarkers);
  const { currentUser } = useAuth()
  const roleId = currentUser?.role?.id;
  // console.log("Coords sample:", vesselMarkers[0].coords);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<VesselDetails | null>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');
  const satelliteLayerRef = useRef<TileLayer | null>(null);
  const streetLayerRef = useRef<TileLayer | null>(null);
  // Add these refs
  const weatherLayerRefs = useRef<{ [key: string]: TileLayer<XYZ> }>({});
  const vectorSourceRef = useRef<VectorSource | null>(null);
  const vectorLayerRef = useRef<VectorLayer | null>(null);
  const [showWeatherOptions, setShowWeatherOptions] = useState(false);
  const [activeWeatherLayer, setActiveWeatherLayer] = useState<string | null>(null);
  const [showZoneOptions, setShowZoneOptions] = useState<boolean>(false);
  const zoneLayerRefs = useRef<Record<string, VectorLayer<VectorSource<Feature<Geometry>>>>>({});
  const [activeZoneLayer, setActiveZoneLayer] = useState<string | null>(null);
  const marpolLayerRef = useRef<VectorLayer | null>(null);
  const deckOverlayRef = useRef<HTMLDivElement | null>(null);
  const [shipMarkers, setShipMarkers] = useState<ShipMarker[]>([]);

  const formatToUTC = (dateStr?: string): string => {
    if (!dateStr) return "N/A";
    const dateObj = new Date(dateStr);
    return `${dateObj.getUTCFullYear()}-${(dateObj.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getUTCDate().toString().padStart(2, "0")} ${dateObj
        .getUTCHours()
        .toString()
        .padStart(2, "0")}:${dateObj.getUTCMinutes().toString().padStart(2, "0")} UTC`;
  };

  useEffect(() => {
    if (vesselMarkers?.length > 0) {
      buildShipMarkers();
    }
  }, [vesselMarkers]);

  const weatherLayersGLApiKey = 'F5KDT1GjYLegLxOkZtdA'; // Replace with your actual API key

  // 🔥 Add weather layers here after map creation:
  const apiKey = '1b2bd3064d0ba8f3fe01b596e8d8a7c5'; // replace this with your actual API key
  const weatherLayerConfigs = {
    wind: `wind_new`,
    pressure: `pressure_new`,
    temperature: `temp_new`
  };

  const zoneLayerConfigs = {
    MARITIME: `maritime_tile`,
    OCEANS: `oceans_tile`,
    MARPOL: `marpol_tile`,
  };

  console.log('Raw vesselMarkers:', vesselMarkers);

  // --- Replace isDecimalDegrees / dmsToDecimal / normalizeCoordinate with this ---

  function cleanDMS(input: string): string {
    // normalize various quote chars and remove extra spaces
    return input
      .trim()
      .replace(/[′’´]/g, "'")
      .replace(/[″”]/g, '"')
      .replace(/\s+/g, ' ');
  }

  function parseDMS(input: string): { deg: number; min: number; sec: number; dir?: 'N' | 'S' | 'E' | 'W' } | null {
    const s = cleanDMS(input);

    // 1) Decimal degrees like "37.7" or "37.7°"
    const dec = s.match(/^(-?\d+(?:\.\d+)?)°?$/);
    if (dec) {
      const val = parseFloat(dec[1]);
      return { deg: val, min: 0, sec: 0, dir: undefined };
    }

    // 2) DMS with optional minutes/seconds and optional direction
    // Examples: 15° 25' 30.5" N, 73°47' E, 73° 47'343" W (bad seconds we'll normalize)
    const m = s.match(/^(\d+)\s*°\s*(\d+)?\s*'?\s*(\d+(?:\.\d+)?)?\s*"?\s*([NSEW])?$/i);
    if (!m) return null;

    const deg = parseFloat(m[1]);
    const min = m[2] !== undefined ? parseFloat(m[2]) : 0;
    const sec = m[3] !== undefined ? parseFloat(m[3]) : 0;
    const dir = m[4] ? (m[4].toUpperCase() as 'N' | 'S' | 'E' | 'W') : undefined;

    return { deg, min, sec, dir };
  }

  function normalizeOverflow(d: number, m: number, s: number): { deg: number; min: number; sec: number } {
    // Carry overflow: seconds -> minutes, minutes -> degrees
    if (!isFinite(d) || !isFinite(m) || !isFinite(s)) return { deg: NaN, min: NaN, sec: NaN };

    if (s >= 60) { m += Math.floor(s / 60); s = s % 60; }
    if (m >= 60) { d += Math.floor(m / 60); m = m % 60; }
    return { deg: d, min: m, sec: s };
  }

  function dmsToDecimalSafe(input: string, axis: 'lat' | 'lon'): number | null {
    if (!input || typeof input !== 'string') return null;

    const parsed = parseDMS(input);
    if (!parsed) return null;

    let { deg, min, sec, dir } = parsed;

    // Decimal degrees case without explicit dir is allowed
    // Overflow fix (e.g., 34'343")
    ({ deg, min, sec } = normalizeOverflow(deg, min, sec));

    // Convert to decimal
    let decimal = Math.abs(deg) + min / 60 + sec / 3600;

    // Determine sign from direction or sign on degrees
    let sign = 1;
    if (dir === 'S' || dir === 'W') sign = -1;
    if (deg < 0) sign = -1; // negative degrees implies W/S if no dir

    decimal *= sign;

    // Range checks
    if (axis === 'lat' && (decimal < -90 || decimal > 90)) return null;
    if (axis === 'lon' && (decimal < -180 || decimal > 180)) return null;

    return isFinite(decimal) ? decimal : null;
  }

  function toDecimal(coord: string, axis: 'lat' | 'lon'): number | null {
    // Try simple decimal first
    const simple = coord?.trim().match(/^(-?\d+(?:\.\d+)?)°?$/);
    if (simple) {
      const val = parseFloat(simple[1]);
      if (axis === 'lat' && val >= -90 && val <= 90) return val;
      if (axis === 'lon' && val >= -180 && val <= 180) return val;
    }
    // Fallback to DMS
    return dmsToDecimalSafe(coord, axis);
  }

  // function isDecimalDegrees(value: string): boolean {
  //   return /^-?\d+(\.\d+)?$/.test(value.trim());
  // }

  // function normalizeCoordinate(coord: string): number {
  //   if (isDecimalDegrees(coord)) {
  //     return parseFloat(coord); // already in decimal
  //   } else {
  //     return dmsToDecimal(coord); // convert DMS to decimal
  //   }
  // }

  // function dmsToDecimal(input: string): number {
  //   if (!input) return NaN;

  //   input = input.trim();

  //   // Case 1: Decimal degrees (e.g., "37.7" or "37.7°")
  //   const decimalMatch = input.match(/^(-?\d+(\.\d+)?)°?$/);
  //   if (decimalMatch) {
  //     return parseFloat(decimalMatch[1]);
  //   }

  //   // Case 2: DMS format (degrees °, minutes ', seconds ", optional direction)
  //   const regex = /(\d+)°\s*(\d+)?['′]?\s*(\d+(?:\.\d+)?)?["″]?\s*([NSEW])?/i;
  //   const match = input.match(regex);

  //   if (!match) {
  //     console.error("Invalid DMS format:", input);
  //     return NaN;
  //   }

  //   let [, degrees, minutes = "0", seconds = "0", direction = ""] = match;

  //   let deg = parseFloat(degrees);
  //   let min = parseFloat(minutes);
  //   let sec = parseFloat(seconds);

  //   // ✅ Normalize invalid seconds or minutes
  //   if (sec >= 60) {
  //     min += Math.floor(sec / 60);
  //     sec = sec % 60;
  //   }

  //   if (min >= 60) {
  //     deg += Math.floor(min / 60);
  //     min = min % 60;
  //   }

  //   let decimal = deg + min / 60 + sec / 3600;

  //   direction = direction.toUpperCase();
  //   if (direction === "S" || direction === "W") {
  //     decimal *= -1;
  //   }

  //   return decimal;
  // }
  // const shipMarkers = (vesselMarkers || [])
  //   .filter(
  //     (v): v is Vessel & { coords: [number, number] } =>
  //       v !== undefined && Array.isArray(v.coords) && v.coords.length >= 2
  //   )
  //   .map(v => ({
  //     lat: v.coords[1],
  //     lng: v.coords[0],
  //     name: v.fleet_name,
  //     course: Math.floor(Math.random() * 360),
  //     data: `Vessel: ${v.fleet_name}<br>Port: ${v.port}<br>ETA: ${v.eta}<br>Status: ${v.status}`,
  //   }));

  // const buildShipMarkers = async () => {
  //   const validVessels = (vesselMarkers || []).filter(
  //     (v): v is Vessel & { coords: [number, number] } =>
  //       v !== undefined && Array.isArray(v.coords) && v.coords.length >= 2
  //   );

  //   const markersWithData = await Promise.all(
  //     validVessels.map(async (v) => {
  //       const extraData = await getVesselDetails(v.id);

  //       console.log(extraData);
  //       return {
  //         lat: extraData.latitude,
  //         lng: extraData.longitude,
  //         name: v.fleet_name,
  //         course: Math.floor(Math.random() * 360),
  //         data: `Vessel: ${v.fleet_name}<br>Port: ${v.port}<br>ETA: ${v.eta}<br>Status: ${v.status}`,
  //         extraData, // additional details from API
  //       };
  //     })
  //   );

  //   setShipMarkers(markersWithData); // store this state in your app
  // };

  const buildShipMarkers = async () => {
    const validVessels = (vesselMarkers || []).filter(
      (v): v is Vessel & { coords: [number, number] } =>
        v !== undefined && Array.isArray(v.coords) && v.coords.length >= 2
    );

    const markersWithData = await Promise.all(
      validVessels.map(async (v) => {
        const extraData = await getVesselDetails(v.id);

        // Try API first
        const apiLat = typeof extraData?.latitude === 'string' ? toDecimal(extraData.latitude, 'lat') : null;
        const apiLon = typeof extraData?.longitude === 'string' ? toDecimal(extraData.longitude, 'lon') : null;

        // Fallback to v.coords if API is invalid
        const fallbackLat = typeof v.coords?.[1] === 'number' ? v.coords[1] : null;
        const fallbackLon = typeof v.coords?.[0] === 'number' ? v.coords[0] : null;

        let latStr: string | null = null;
        let lonStr: string | null = null;
        let used = 'api';

        if (apiLat !== null && apiLon !== null) {
          latStr = String(apiLat);
          lonStr = String(apiLon);
        } else if (fallbackLat !== null && fallbackLon !== null) {
          latStr = String(fallbackLat);
          lonStr = String(fallbackLon);
          used = 'fallback';
        }

        // If both sources fail, skip this vessel by returning null
        if (latStr === null || lonStr === null) {
          console.warn(`[VesselMap] Skipping ${v.fleet_name}: no valid coordinates (API invalid, no usable fallback).`, {
            apiLat: extraData?.latitude, apiLon: extraData?.longitude, coords: v.coords
          });
          return null;
        }

        return {
          lat: latStr,
          lng: lonStr,
          name: v.fleet_name,
          course: Math.floor(Math.random() * 360),
          data: `Vessel: ${v.fleet_name}<br>Port: ${v.port}<br>ETA: ${v.eta}<br>Status: ${v.status}`,
          extraData: { ...extraData, __coordSource: used },
        } as ShipMarker;
      })
    );

    setShipMarkers(markersWithData.filter(Boolean) as ShipMarker[]);
  };

  // useEffect(() => {
  //   console.log(shipMarkers)
  // }, [shipMarkers])

  // const validShipMarkers = shipMarkers.filter(
  //   (marker) => marker.lat !== "--:--" && marker.lng !== "--:--"
  // );

  const validShipMarkers = shipMarkers.filter((m) => {
    if (!m || !m.lat || !m.lng) return false;
    const lat = toDecimal(m.lat, 'lat');
    const lon = toDecimal(m.lng, 'lon');
    return lat !== null && lon !== null;
  });

  // console.log(validShipMarkers);

  useEffect(() => {
    if (!showWeatherOptions) {
      // Loop through all weather layers and hide them
      Object.values(weatherLayerRefs.current).forEach((layer) => {
        layer.setVisible(false);
      });
    }
  }, [showWeatherOptions]);

  useEffect(() => {
    if (!showZoneOptions && marpolLayerRef.current) {
      marpolLayerRef.current.setVisible(false);
    }
  }, [showZoneOptions]);

  useEffect(() => {
    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
    });

    vectorSourceRef.current = vectorSource;
    vectorLayerRef.current = vectorLayer;

    const satelliteLayer = new TileLayer({
      source: new XYZ({
        url: 'https://mt{0-3}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', // s,h = satellite + labels
        attributions: '© Google Maps',
        wrapX: true
      }),
      visible: true,
    });

    satelliteLayerRef.current = satelliteLayer;

    // Street layer (to be toggled)
    const streetLayer = new TileLayer({
      source: new OSM({
        wrapX: true                        // ← disable infinite horizontal tiles
      }), // OpenStreetMap source for street layer
      visible: false, // Initially hidden

    });

    streetLayerRef.current = streetLayer;
    const WEBMERCATOR_WORLD_EXTENT: [number, number, number, number] = [
      -20037508.342789244,
      -20037508.342789244,
      20037508.342789244,
      20037508.342789244,
    ]

    const proj = getProjection('EPSG:3857')
    const worldExtent = proj
      ? proj.getExtent()
      : WEBMERCATOR_WORLD_EXTENT
    const olMap = new Map({
      target: mapRef.current!,
      layers: [satelliteLayer],
      view: new View({
        center: fromLonLat([0, 0]),  // Set the center to the equator (0, 0)
        zoom: 0,
        minZoom: 0,
        maxZoom: 18,
        //extent: worldExtent,
      }),
      controls: [],
    });

    // Add the street layer to the map
    olMap.addLayer(streetLayer);

    olMap.addLayer(vectorLayer);

    // Fix in useEffect after layers are created:
    Object.entries(weatherLayerConfigs).forEach(([key, layerName]) => {
      const layer = new TileLayer({
        source: new XYZ({
          url: `https://tile.openweathermap.org/map/${layerName}/{z}/{x}/{y}.png?appid=${apiKey}`,
        }),
        visible: false,
      });
      olMap.addLayer(layer);
      weatherLayerRefs.current[key] = layer;
    });

    // // Create WeatherLayers GL layers
    // Object.entries(weatherLayerConfigs).forEach(([key, layerType]) => {
    //   const layer = new TileLayer({
    //     source: new XYZ({
    //       url: `https://api.weatherlayers.com/v1/tile/{layerType}/{z}/{x}/{y}.png?key=${weatherLayersGLApiKey}&layerType=${layerType}`,
    //       attributions: '© WeatherLayers GL',
    //     }),
    //     visible: false,
    //     zIndex: 5,
    //     opacity: 0.8
    //   });
    //   olMap.addLayer(layer);
    //   weatherLayerRefs.current[key] = layer;
    // });


    olMap.on('pointermove', function (e) {
      const hit = olMap.hasFeatureAtPixel(e.pixel);
      olMap.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    // Remove Popup logic
    // Sidebar rendering handles the vessel info
    // Retain overlay addition for potential future uses
    const overlay = new Overlay({
      element: document.createElement('div'), // Temporary div as placeholder
      positioning: 'bottom-center',
      stopEvent: false,
      offset: [0, -20],
    });
    olMap.addOverlay(overlay);

    olMap.on('click', function (e) {
      // console.log("clicked");
      const features: Feature[] = [];
      olMap.forEachFeatureAtPixel(e.pixel, (feat) => {
        features.push(feat as Feature);
        return false;
      });

      const feature = features.find(f => f.get('name') && f.get('info') && f.get('extraData'));
      // console.log(feature);
      if (feature) {
        // console.log(feature);
        const name = feature.get('name');
        const info = feature.get('info');
        const extraData = feature.get('extraData');

        if (extraData && extraData.latitude && extraData.longitude) {
          console.log(extraData);
          try {

            setSelectedVessel({
              latitude: extraData?.latitude,
              longitude: extraData?.longitude,
              fleet_name: name,
              imoNumber: extraData.vesselImo,
              masterName: extraData.masterName,
              chiefEngineerName: extraData.chiefEngineerName,
              lastUpdated: extraData.lastUpdated,
              lastPort: extraData.lastPort,
              nextPort: extraData.nextPort,
              atd: extraData.atd,
              eta: extraData.eta,
              latLongSource: extraData.latLongSource,
              status: extraData.status,
            });
          } catch (err) {
            console.error("Invalid DMS format:", err);
            setSelectedVessel(null);
          }
        } else {
          setSelectedVessel(null);
        }
      } else {
        setSelectedVessel(null);
      }
    });

    setMap(olMap); // ✅ set the map state first
    // addShipMarkers(olMap, validShipMarkers); 
  }, []);

  useEffect(() => {
    if (map && validShipMarkers.length > 0) {
      addShipMarkers(map, validShipMarkers);
    }
  }, [map, validShipMarkers]);

  useEffect(() => {
    if (!map) return;

    const geojsonFiles: Record<string, string> = {
      MARPOL: '/marpolJson.geojson',
      MARITIME: '/eez_boundaries_v12.json',
      OCEANS: '/goas_v01.json',
    };

    Object.entries(geojsonFiles).forEach(([layerKey, filePath]) => {
      loadZoneLayerGeoJSON(layerKey, filePath, map, false); // 👈 Pass false to hide initially
    });
  }, [map]);

  useEffect(() => {
    if (!showZoneOptions) {
      // Hide all zone layers when options panel is closed
      Object.values(zoneLayerRefs.current).forEach((layer) => {
        layer.setVisible(false);
      });

      // Also remove MARPOL layer if it's currently added
      if (marpolLayerRef.current && map?.getLayers().getArray().includes(marpolLayerRef.current)) {
        map.removeLayer(marpolLayerRef.current);
      }

      setActiveZoneLayer(null); // Optional: clear selected state
    }
  }, [showZoneOptions]);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = () => {
    const mapContainer = mapContainerRef.current;

    if (!document.fullscreenElement) {
      mapContainer?.requestFullscreen().catch((err) => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const zoomIn = () => {
    if (map) {
      const view = map.getView();
      const currentZoom = view.getZoom();
      if (typeof currentZoom === 'number') {
        view.setZoom(currentZoom + 1);
      }
    }
  };

  const zoomOut = () => {
    if (map) {
      const view = map.getView();
      const currentZoom = view.getZoom();
      if (typeof currentZoom === 'number') {
        view.setZoom(currentZoom - 1);
      }
    }
  };

  const toggleMapType = () => {
    if (!map || !satelliteLayerRef.current || !streetLayerRef.current) return;

    const satelliteLayer = satelliteLayerRef.current;
    const streetLayer = streetLayerRef.current;

    console.log(mapType);
    // Toggle visibility based on current map type
    if (mapType === 'satellite') {
      // Set satellite layer visible to false and street layer visible to true
      satelliteLayer.setVisible(false);
      streetLayer.setVisible(true);

      setMapType('street');
    } else {
      // Set street layer visible to false and satellite layer visible to true
      streetLayer.setVisible(false);
      satelliteLayer.setVisible(true);

      setMapType('satellite');
    }
    // Important: Force vector layer refresh
    vectorLayerRef.current?.getSource()?.changed();

    map.render(); // Force a map re-render
  };


  // const addShipMarkers = (mapInstance: Map, shipMarkers: ShipMarker[]) => {
  //   const source = vectorSourceRef.current
  //   const layer = vectorLayerRef.current

  //   console.log(shipMarkers);

  //   if (!source || !layer || shipMarkers.length === 0) return

  //   // 1) Clear previous markers
  //   source.clear()

  //   // 2) Add each new marker
  //   shipMarkers.forEach((ship) => {
  //     console.log(ship.extraData);
  //     const feature = new Feature({
  //       geometry: new Point(fromLonLat([normalizeCoordinate(ship.lng), normalizeCoordinate(ship.lat)])),
  //       name: ship.name,
  //       info: ship.data,
  //       extraData: ship.extraData
  //     })

  //     feature.setStyle(
  //       new Style({
  //         // 1) the marker icon
  //         image: new Icon({
  //           src: '/media/map/marker.svg',
  //           scale: 0.9,
  //           rotation: (ship.course * Math.PI) / 180,
  //           anchor: [0.5, 0.5],
  //           crossOrigin: 'anonymous',
  //         }),
  //         // 2) the text label
  //         text: new Text({
  //           text: ship.name,
  //           font: '12px sans-serif',
  //           fill: new Fill({ color: '#000' }),
  //           stroke: new Stroke({ color: '#fff', width: 3 }),
  //           // offset the label so it sits *above* the icon
  //           offsetY: -25,
  //           overflow: true,   // allow label to draw even if it crosses tile boundaries
  //         }),
  //       })
  //     )

  //     source.addFeature(feature)
  //   })

  //   console.log(
  //     'Number of features in vector source:',
  //     source.getFeatures().length
  //   )

  //   if (shipMarkers.length > 0) {

  //     // Use actual positions and average for centering
  //     let longitudes = shipMarkers.map((s) => normalizeCoordinate(s.lng));
  //     let latitudes = shipMarkers.map((s) => normalizeCoordinate(s.lat));

  //     longitudes = longitudes.map((lon) => (lon < 0 ? lon + 360 : lon));
  //     let avgLon = longitudes.reduce((a, b) => a + b, 0) / longitudes.length;
  //     avgLon = avgLon > 180 ? avgLon - 360 : avgLon;

  //     const avgLat = latitudes.reduce((a, b) => a + b, 0) / latitudes.length;
  //     const centerCoordinate = fromLonLat([avgLon, avgLat]);

  //     mapInstance.getView().animate({
  //       center: centerCoordinate,
  //       zoom: shipMarkers.length === 1 ? 0 : 2,
  //       duration: 600,
  //     });

  //     shipMarkers.forEach((ship) => {
  //       const lon = normalizeCoordinate(ship.lng);
  //       const lat = normalizeCoordinate(ship.lat);
  //       const feature = new Feature({
  //         geometry: new Point(fromLonLat([lon, lat])),
  //         name: ship.name,
  //       });
  //     });
  //   }


  // }

  const addShipMarkers = (mapInstance: Map, markers: ShipMarker[]) => {
    const source = vectorSourceRef.current;
    const layer = vectorLayerRef.current;
    if (!source || !layer) return;

    source.clear();

    const validPoints: { lat: number; lon: number; ship: ShipMarker }[] = [];

    markers.forEach((ship) => {
      const lat = toDecimal(ship.lat, 'lat');
      const lon = toDecimal(ship.lng, 'lon');
      if (lat === null || lon === null) return; // skip invalids

      validPoints.push({ lat, lon, ship });

      const feature = new Feature({
        geometry: new Point(fromLonLat([lon, lat])),
        name: ship.name,
        info: ship.data,
        extraData: ship.extraData,
      });

      feature.setStyle(
        new Style({
          image: new Icon({
            src: '/media/map/marker.svg',
            scale: 0.9,
            rotation: (ship.course * Math.PI) / 180,
            anchor: [0.5, 0.5],
            crossOrigin: 'anonymous',
          }),
          text: new Text({
            text: ship.name,
            font: '12px sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({ color: '#fff', width: 3 }),
            offsetY: -25,
            overflow: true,
          }),
        })
      );

      source.addFeature(feature);
    });

    // If nothing valid, don't animate/center
    if (validPoints.length === 0) return;

    // Center: compute average only from valid numbers
    const avgLon =
      validPoints.reduce((s, p) => s + p.lon, 0) / validPoints.length;
    const avgLat =
      validPoints.reduce((s, p) => s + p.lat, 0) / validPoints.length;

    if (isFinite(avgLon) && isFinite(avgLat)) {
      mapInstance.getView().animate({
        center: fromLonLat([avgLon, avgLat]),
        zoom: validPoints.length === 1 ? 0 : 2,
        duration: 600,
      });
    }
  };

  type StatusConfig = {
    className: string
    style?: React.CSSProperties
    image?: string
    label: string
  }

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status) {
      case 'At Sea':
        return {
          className: 'badge ',
          style: { backgroundColor: '#D5F5F6' },
          image: '/media/icons/duotune/status/ship.svg',
          label: 'At Sea',
        }
      case 'Anchor':
        return {
          className: 'badge',
          style: { backgroundColor: '#FDF6B2' },
          image: '/media/icons/duotune/status/anchor.svg',
          label: 'Anchor',
        }
      case 'In Port':
        return {
          className: 'badge ',
          style: { backgroundColor: '#A5A6F6' },
          image: '/media/icons/duotune/status/port.svg',
          label: 'In Port',
        }
      default:
        return {
          className: 'badge bg-secondary text-white',
          image: '/media/icons/unknown.svg',
          label: status,
        }
    }
  }

  const loadZoneLayerGeoJSON = async (
    layerKey: string,
    filePath: string,
    map: Map | null,
    visible: boolean = true // 👈 default visible is true
  ) => {
    if (!map) return;

    try {
      const existingLayer = zoneLayerRefs.current[layerKey];

      if (existingLayer) {
        existingLayer.setVisible(visible);

        const mapLayers = map.getLayers().getArray();
        if (!mapLayers.includes(existingLayer)) {
          map.addLayer(existingLayer);
        }
        return;
      }

      const response = await fetch(filePath);
      if (!response.ok) throw new Error(`Failed to load ${filePath}`);

      const geojsonData = await response.json();
      const format = new GeoJSON();

      const features = format.readFeatures(geojsonData, {
        featureProjection: 'EPSG:3857',
      });

      const vectorSource = new VectorSource({ features });
      const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: new Style({
          stroke: new Stroke({ color: 'rgba(237, 178, 80, 1)', width: 2 }),
          fill: new Fill({ color: 'rgba(237, 178, 80, 0.1)' }),
        }),
        visible, // 👈 use the visible parameter
      });

      zoneLayerRefs.current[layerKey] = vectorLayer;
      map.addLayer(vectorLayer);

      // console.log(`${layerKey} GeoJSON layer loaded and added.`);
    } catch (error) {
      console.error(`Error loading ${layerKey} GeoJSON:`, error);
    }
  };


  const toggleWeather = () => {
    // setShowWeatherOptions(prev => !prev);
    setShowWeatherOptions((prev) => {
      if (!prev) setShowZoneOptions(false); // hide zone options when opening weather
      return !prev;
    });
  };

  const toggleLocation = () => {
    // setShowZoneOptions(prev => !prev);
    setShowZoneOptions((prev) => {
      if (!prev) setShowWeatherOptions(false); // hide weather options when opening zone
      return !prev;
    });
  };


  const toggleWeatherLayer = (layerKey: string) => {
    const layers = weatherLayerRefs.current;
    // console.log("layers ", layers);
    const targetLayer = layers[layerKey];

    if (!targetLayer) return;

    const isCurrentlyVisible = targetLayer.getVisible();
    const shouldShow = !isCurrentlyVisible;

    // Toggle the clicked layer
    targetLayer.setVisible(shouldShow);

    // Hide other layers
    Object.entries(layers).forEach(([key, layer]) => {
      if (key !== layerKey && layer.getVisible()) {
        layer.setVisible(false);
      }
    });

    // Update the active state
    setActiveWeatherLayer(shouldShow ? layerKey : null);
  };

  const handleZoneLayerToggle = async (layerKey: string) => {
    if (!map) return;

    const isCurrentlySelected = activeZoneLayer === layerKey;

    // Deselect all existing zone layers
    Object.entries(zoneLayerRefs.current).forEach(([key, layer]) => {
      layer.setVisible(false);
    });

    // Clear MARPOL layer if loaded separately
    if (marpolLayerRef.current) {
      map.removeLayer(marpolLayerRef.current);
      marpolLayerRef.current = null;
    }

    if (isCurrentlySelected) {
      // If clicked again, deselect
      setActiveZoneLayer(null);
    } else {
      setActiveZoneLayer(layerKey);

      const geojsonFiles: Record<string, string> = {
        MARPOL: '/marpolJson.geojson',
        MARITIME: '/eez_boundaries_v12.json',
        OCEANS: '/goas_v01.json', // Replace with your actual file path
      };

      const filePath = geojsonFiles[layerKey];
      if (filePath) {
        await loadZoneLayerGeoJSON(layerKey, filePath, map);
      } else {
        console.warn(`No GeoJSON file configured for ${layerKey}`);
      }
    }
  };


  return (
    <div ref={mapContainerRef} className="
    position-relative"
    style={{ height, width: '100%' }}   // <- key: let parent control the height
    >
      <div ref={mapRef} 
      // id='map'
       className="w-100 h-100 position-relative "
      style={{ height: '100%' }}        // <- fill the given height
      >
        {!compact && selectedVessel && (
          <div className="vessel-popup" style={{ backgroundColor: '#E1EFFE' }}>
            <button className="btn-close close-button" onClick={() => setSelectedVessel(null)} />

            <div className="info-row">
              <h6 className="info-label" style={{ fontSize: '14px' }}>Vessel Name</h6>
              <div className="info-value" style={{ fontSize: '14px' }}>{selectedVessel.fleet_name || "UNKNOWN"}</div>
            </div>

            <div className="info-row">
              <h6 className="info-label">Vessel IMO</h6>
              <div className="info-value" >{selectedVessel?.imoNumber}</div>
            </div>

            <div className="info-row">
              <h6 className="info-label">Vessel Status</h6>

              {(() => {
                const rawStatus = selectedVessel.status;

                // Don't show if status is "--:--"
                if (!rawStatus || rawStatus === "--:--") return null;

                const status = getStatusConfig(rawStatus || 'Unknown');
                return (
                  <div
                    className={`d-flex align-items-center gap-1 ${status.className}`}
                    style={{
                      ...status.style,
                      minWidth: 0,
                      maxWidth: '40%',
                    }}
                  >
                    {status.image && (
                      <img
                        src={status.image}
                        alt={status.label}
                        className="me-1"
                        style={{ height: '14px', flexShrink: 0 }}
                      />
                    )}
                    <span
                      className="text-truncate"
                      title={status.label}
                      style={{
                        display: 'inline-block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                        flexShrink: 1,
                      }}
                    >
                      {status.label}
                    </span>
                  </div>
                )
              })()}
            </div>


            <hr />

            <div className="info-pair mb-1">
              <h6 className="pair-label">Last Port</h6>
              <div className="pair-value">{selectedVessel.lastPort}</div>
            </div>
            <div className="info-pair mb-1">
              <h6 className="pair-label">ATD:</h6>
              <div className="pair-value"><div className="pair-value">
                {selectedVessel.atd && selectedVessel.atd !== '--:--'
                  ? new Date(selectedVessel.atd).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                  : '--'}
              </div>
              </div>
            </div>

            <div className="info-pair mb-1">
              <h6 className="pair-label">Next Port</h6>
              <div className="pair-value">{selectedVessel.nextPort}</div>
            </div>

            <div className="info-pair mb-1">
              <h6 className="pair-label">ETA:</h6>
              <div className="pair-value">
                {selectedVessel.eta && selectedVessel.eta !== '--:--'
                  ? new Date(selectedVessel.eta).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                  : '--'}
              </div>
            </div>

            <hr />

            <h6 className="pair-label">Ship Latitude and Longitude</h6>
            <div className="pair-value">{selectedVessel.latitude} {selectedVessel.longitude}</div>

            <h6 className="pair-label">Data Source: AIS/Noon Report</h6>
            <div className="pair-value">{selectedVessel.latLongSource}</div>

            <h6 className="pair-label">Last Updated time/date</h6>
            <div className="pair-value">
              {selectedVessel?.lastUpdated
                ? formatToUTC(selectedVessel.lastUpdated)
                : "2025-02-16 05:01 UTC"}
            </div>

            <hr />

            <h6 className="pair-label">Master Name</h6>
            <div className="pair-value">{selectedVessel.masterName && selectedVessel.masterName !== "--:--" ? selectedVessel.masterName : "N/A"}</div>

            <h6 className="pair-label">CE Name</h6>
            <div className="pair-value">{selectedVessel.chiefEngineerName && selectedVessel.chiefEngineerName !== "--:--" ? selectedVessel.chiefEngineerName : "N/A"}</div>
          </div>
        )}

        <div ref={deckOverlayRef} style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:10 }} />
      </div>
            {/* Controls */}
      {!compact && (
        <>
      <div className="custom-map-controls">
        <button onClick={handleFullscreen} className="map-btn">
          <KTSVG path='/media/map/full-screen.svg' className='svg-icon-1' />
        </button>
      </div>
      <div className="custom-map-controls1">
        <button onClick={zoomIn} className='map-btn' title="Zoom In">
          <KTSVG path='/media/map/zoom-in.svg' className='svg-icon-1' />
        </button>

        <button onClick={zoomOut} className="map-btn" title="Zoom Out">
          <KTSVG path='/media/map/zoom-out.svg' className='svg-icon-1' />
        </button>

        <button onClick={toggleMapType} className="map-btn" title="Toggle Map Type">
          <KTSVG path='/media/map/map-type.svg' className='svg-icon-1' />
        </button>

        <div className="weather-wrapper">
          <button onClick={toggleWeather} className={`map-btn ${showWeatherOptions ? 'active' : ''}`} title="Weather Layers">
            <KTSVG path='/media/map/weather.svg' className={`svg-icon-1 ${showWeatherOptions ? 'active' : ''}`} />
          </button>
          {showWeatherOptions && (
            <div className={`weather-options ${showWeatherOptions ? 'show' : ''}`}>
              {Object.keys(weatherLayerConfigs).map((layerKey) => (
                <button
                  key={layerKey}
                  onClick={() => toggleWeatherLayer(layerKey)}
                  className={`weather-btn map-btn ${activeWeatherLayer === layerKey ? 'active' : ''}`}
                >
                  {layerKey.charAt(0).toUpperCase() + layerKey.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>


        <div className="zone-wrapper">
          <button onClick={toggleLocation} id="location" className={`map-btn ${showZoneOptions ? 'active' : ''}`} title="Zone Layers">
            <KTSVG path='/media/map/location.svg' className={`svg-icon-1 ${showZoneOptions ? 'active' : 'inactive'}`} />
          </button>
          {showZoneOptions && (
            <div className={`weather-options ${showZoneOptions ? 'show' : ''}`}>
              {Object.keys(zoneLayerConfigs).map((layerKey) => (
                <button
                  key={layerKey}
                  onClick={() => handleZoneLayerToggle(layerKey)}
                  className={`weather-btn map-btn ${activeZoneLayer === layerKey ? 'active' : ''}`}
                >
                  {layerKey.charAt(0).toUpperCase() + layerKey.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>


        {/* <button id="settings" className="map-btn">
          <KTSVG path='/media/map/settings.svg' className='svg-icon-1' />
        </button> */}
      </div>

      <div className="custom-map-controls2">
        <button id="lat_long" className="map-btn1">
          Lat: 4 44’ 57.41”N, Lng: 107 40’ 25.54” W
        </button>

        <button id="time_stamp" className="map-btn1">
          UTC 13:40   LT 21:40
        </button>
      </div>
             </>
      )}
    </div>

  );
};

export default MapView;
