import type { CSSProperties, ReactNode } from "react";

type Props = {
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  imageCredit?: string;
  children: ReactNode;
};

export function PageHero({ image, imageAlt, imagePosition, imageCredit, children }: Props) {
  const photo = Boolean(image);
  const objectStyle: CSSProperties | undefined = imagePosition
    ? { objectPosition: imagePosition }
    : undefined;

  return (
    <section className={photo ? "page-hero is-photo" : "page-hero"}>
      {photo ? (
        <>
          <div className="page-hero-media">
            <img src={image} alt="" style={objectStyle} />
          </div>
          <div className="page-hero-veil" aria-hidden />
        </>
      ) : null}
      <div className="wrap page-hero-copy">
        {children}
        {photo && imageAlt ? (
          <p className="page-hero-caption">
            {imageAlt}
            {imageCredit ? <span>{imageCredit}</span> : null}
          </p>
        ) : null}
      </div>
    </section>
  );
}
