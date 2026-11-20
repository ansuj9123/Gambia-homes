// Shows the cover photo, or placeholder artwork until real photos are uploaded.
const PALETTE: Record<string, [string, string]> = {
  LAND: ["#d9c79a", "#7fa35b"],
  HOUSE: ["#9cc3e6", "#1f7a3a"],
  COMPOUND: ["#e8c9a0", "#a0522d"],
  APARTMENT: ["#b7c7e8", "#1b3a8a"],
  COMMERCIAL: ["#cfd5dd", "#475569"],
  SHORT_LET: ["#ffd8a8", "#0e7490"],
};

type Photo = { src: string; thumb?: string };

export function firstPhoto(photos?: string): Photo | undefined {
  try {
    const list = JSON.parse(photos ?? "[]") as (Photo | string)[];
    const p = list[0];
    return typeof p === "string" ? { src: p } : p && typeof p.src === "string" ? p : undefined;
  } catch {
    return undefined;
  }
}

export function PlaceholderArt({ type, area, className = "" }: { type: string; area: string; className?: string }) {
  const [sky, ground] = PALETTE[type] ?? PALETTE.HOUSE;
  return (
    <svg viewBox="0 0 400 250" role="img" aria-label={`Photo coming soon: ${area}`} className={className} preserveAspectRatio="xMidYMid slice">
      <rect width="400" height="250" fill={sky} />
      <circle cx="330" cy="60" r="26" fill="#fff6d5" opacity="0.9" />
      <rect y="170" width="400" height="80" fill={ground} />
      {type === "LAND" ? (
        <g stroke="#ffffff" strokeWidth="3" strokeDasharray="8 6" fill="none" opacity="0.9">
          <polygon points="110,215 290,215 260,180 140,180" />
        </g>
      ) : (
        <g fill="#ffffff" opacity="0.92">
          <rect x="140" y="120" width="120" height="70" />
          <polygon points="128,122 200,78 272,122" />
          <rect x="188" y="150" width="24" height="40" fill={ground} />
        </g>
      )}
      <text x="16" y="236" fill="#ffffff" fontSize="16" fontWeight="600" opacity="0.95">
        {area}
      </text>
    </svg>
  );
}

export function PropertyImage({
  type,
  area,
  photos,
  size = "thumb",
  className = "",
}: {
  type: string;
  area: string;
  photos?: string;
  size?: "thumb" | "full";
  className?: string;
}) {
  const photo = firstPhoto(photos);
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={size === "thumb" ? (photo.thumb ?? photo.src) : photo.src}
        alt={`${type.toLowerCase().replace("_", " ")} in ${area}`}
        loading="lazy"
        className={`object-cover ${className}`}
      />
    );
  }
  return <PlaceholderArt type={type} area={area} className={className} />;
}
