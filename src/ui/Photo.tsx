import { PHOTOS, type PhotoId } from "../assets/photos";
import styles from "./Photo.module.css";

export type PhotoProps = {
  id: PhotoId;
  /** The `sizes` attribute: how wide the picture is drawn at each window width, so the browser picks a file. */
  sizes: string;
  /** Load now and first. Only for the biggest picture on a page, the one the page waits for. */
  priority?: boolean;
  /** Read the picture out to screen readers. Off by default: a picture here is an illustration, not content. */
  describe?: boolean;
  className?: string;
};

/**
 * One of the free-licence photographs in src/assets/photos.ts, as an illustration: never a picture of a listed gym.
 * The picture fills its parent and is cropped to fit, around the point that keeps its subject in frame. Its average
 * colour shows behind it while it loads, and stays if it never does (offline before a first view).
 */
export function Photo({ id, sizes, priority = false, describe = false, className }: PhotoProps) {
  const photo = PHOTOS[id];
  const middle = photo.files[Math.min(1, photo.files.length - 1)];
  return (
    <img
      className={className ? `${styles.photo} ${className}` : styles.photo}
      src={middle.src}
      srcSet={photo.files.map((file) => `${file.src} ${file.w}w`).join(", ")}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={describe ? photo.alt : ""}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      style={{ backgroundColor: photo.tone, objectPosition: photo.focus }}
    />
  );
}
