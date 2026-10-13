/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_WHATSAPP?: string;
  readonly VITE_SUPPORT_EMAIL?: string;
}

declare module "@data/kenya-boundary.json" {
  const value: { polygons: number[][][][] };
  export default value;
}

declare module "@data/kenya-places.json" {
  const value: {
    generatedAt: string;
    source: string;
    count: number;
    places: Array<{
      id: string;
      name: string;
      kind: string;
      location: { lat: number; lng: number };
      population?: number;
    }>;
  };
  export default value;
}
