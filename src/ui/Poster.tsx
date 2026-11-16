import type { ReactNode } from "react";
import type { PhotoId } from "../assets/photos";
import { Photo } from "./Photo";
import styles from "./Poster.module.css";

export type PosterProps = {
  /** The picture. Without one the poster is a board, and its tab sits inside, above the text. */
  photo?: PhotoId;
  /** The `sizes` attribute for the picture. Say how wide the poster is drawn at each window width. */
  sizes?: string;
  /** Load the picture first. Only for the biggest picture on a page. */
  priority?: boolean;
  /** Painted across the seam between picture and board: one short, factual word or two, like "Today". */
  tab?: ReactNode;
  /** `stack` puts the picture above the board. `side` puts it beside the board from 760 px, and ignores the tab. */
  layout?: "stack" | "side";
  as?: "section" | "article" | "div";
  className?: string;
  "aria-labelledby"?: string;
  /** The board: what the poster says. */
  children: ReactNode;
};

/**
 * A painted sign board: a photograph above a board of text, a thick keyline round both, and a yellow tab lettered
 * across the seam. Text never sits on the picture, so the picture shows at full brightness with no darkening
 * over it, and the only lettering on it is the tab. It replaces the flat dark plates this app used before.
 */
export function Poster({ photo, sizes = "(min-width: 760px) 720px, 100vw", priority, tab, layout = "stack", as: Element = "section", className, children, ...aria }: PosterProps) {
  const lettered = tab != null && layout === "stack";
  return (
    <Element className={className ? `${styles.poster} ${className}` : styles.poster} data-layout={layout} data-photo={photo ? "" : undefined} {...aria}>
      {photo && (
        <div className={styles.picture}>
          <div className={styles.frame}>
            <Photo id={photo} sizes={sizes} priority={priority} />
          </div>
          {lettered && <span className={styles.tab}>{tab}</span>}
        </div>
      )}
      <div className={styles.board}>
        {lettered && !photo && <span className={styles.tab}>{tab}</span>}
        {children}
      </div>
    </Element>
  );
}
