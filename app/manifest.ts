import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAYA — Kenya Gym Finder",
    short_name: "KAYA",
    description: "Find gyms across Kenya on a free OpenStreetMap canvas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#080706",
    theme_color: "#080706",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
