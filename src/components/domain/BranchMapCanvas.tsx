"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { divIcon, type Marker as LeafletMarker } from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { BranchMapProps } from "@/types/branch-map";
import { getBranchCoordinate, roundCoordinate } from "@/lib/validators/branch";
const savedIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#176a52;border:3px solid #fff;box-shadow:0 2px 7px #0005"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
  popupAnchor: [0, -22],
});
const draftIcon = divIcon({
  className: "",
  html: '<span style="display:block;width:26px;height:26px;border-radius:50%;background:#c66722;border:4px solid white;box-shadow:0 0 0 2px #c66722,0 2px 9px #0005"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});
function MapBehavior({ branches, point, focus, onPointChange }: BranchMapProps) {
  const map = useMap();
  useMapEvents({
    click(event) {
      onPointChange?.(roundCoordinate({ latitude: event.latlng.lat, longitude: event.latlng.lng }));
    },
  });
  const coordinates = useMemo(
    () =>
      branches.flatMap((branch) => {
        const p = getBranchCoordinate(branch);
        return p ? [[p.latitude, p.longitude] as [number, number]] : [];
      }),
    [branches],
  );
  useEffect(() => {
    if (focus) map.setView([focus.latitude, focus.longitude], 14, { animate: false });
    else if (point) map.panTo([point.latitude, point.longitude], { animate: false });
    else {
      if (coordinates.length)
        map.fitBounds(coordinates, { padding: [40, 40], maxZoom: 13, animate: false });
      else map.setView([15.5, -90.3], 7, { animate: false });
    }
  }, [map, coordinates, point, focus]);
  return null;
}
export default function BranchMapCanvas(props: BranchMapProps) {
  const marker = useRef<LeafletMarker>(null);
  const { onPointChange } = props;
  const [tileError, setTileError] = useState(false);
  const handlers = useMemo(
    () => ({
      dragend() {
        const position = marker.current?.getLatLng();
        if (position)
          onPointChange?.(roundCoordinate({ latitude: position.lat, longitude: position.lng }));
      },
    }),
    [onPointChange],
  );
  const url =
    process.env["NEXT_PUBLIC_MAP_TILE_URL"] ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    process.env["NEXT_PUBLIC_MAP_ATTRIBUTION"] ??
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  return (
    <>
      <MapContainer
        center={[15.5, -90.3]}
        zoom={7}
        scrollWheelZoom={false}
        className="h-[400px] w-full sm:h-[460px]"
        style={{ height: 460, width: "100%" }}
        aria-label="Mapa interactivo de Guatemala"
      >
        <TileLayer
          url={url}
          attribution={attribution}
          referrerPolicy="strict-origin-when-cross-origin"
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <MapBehavior {...props} />
        {props.branches.map((branch) => {
          const position = getBranchCoordinate(branch);
          return position ? (
            <Marker
              key={branch.id}
              position={[position.latitude, position.longitude]}
              icon={savedIcon}
              title={branch.name}
              alt={`Sucursal ${branch.name}`}
            >
              <Popup>
                <strong>{branch.name}</strong>
                <br />
                {[branch.municipalityName, branch.departamentName].filter(Boolean).join(", ")}
                <br />
                {branch.indication ?? ""}
              </Popup>
            </Marker>
          ) : null;
        })}
        {props.point && (
          <Marker
            ref={marker}
            position={[props.point.latitude, props.point.longitude]}
            icon={draftIcon}
            draggable={!!props.onPointChange}
            eventHandlers={handlers}
            title="Ubicación seleccionada"
            alt="Ubicación seleccionada"
          >
            <Popup>Ubicación seleccionada. Arrastra el marcador para ajustarla.</Popup>
          </Marker>
        )}
      </MapContainer>
      {tileError && (
        <p
          role="status"
          className="border-t border-[var(--tg-line)] bg-[var(--tg-paper)] p-3 text-xs"
        >
          El mapa base no pudo cargarse. Puedes indicar las coordenadas en el formulario.
        </p>
      )}
    </>
  );
}
