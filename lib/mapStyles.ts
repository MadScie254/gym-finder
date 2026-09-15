export const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#1b222c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1b222c" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b98a8" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#dce7f3" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8b98a8" }],
  },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#172017" }] },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b8f71" }],
  },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a3340" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1b222c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9eabba" }] },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3a4656" }],
  },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#202833" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c141c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4a5a6a" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
];
