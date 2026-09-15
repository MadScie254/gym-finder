export function gymCover(name: string): { from: string; to: string } {
  const palettes = [
    { from: "#FF4D1A", to: "#FF8A3D" },
    { from: "#D6FF3C", to: "#8BC34A" },
    { from: "#FF7A18", to: "#FF4D1A" },
    { from: "#B8FF4A", to: "#D6FF3C" },
    { from: "#FF5C2A", to: "#FFB347" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 33 + name.charCodeAt(i)) >>> 0;
  }
  return palettes[hash % palettes.length];
}

export function padIndex(index: number): string {
  return String(index + 1).padStart(2, "0");
}
