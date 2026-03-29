import { Link } from "react-router-dom";
import { Calendar, MapPin, Users, Image } from "lucide-react";
import { FirestoreEvent, EventStatus } from "@/types";
import StatusBadge from "./StatusBadge";
import CategoryTag from "./ui/CategoryTag";
import { cn, toIST } from "@/lib/utils";
import { getCategoryColor } from "@/lib/constants";

const normalizeStatus = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";

interface EventCardProps {
  event: FirestoreEvent;
  compact?: boolean;
  className?: string;
}

function formatDate(ts: number) {
  return toIST(ts).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function getDescriptionText(description?: string): string {
  if (!description) return "";
  if (!isNaN(Number(description))) return "";
  if (description.trim().length < 3) return "";
  return description.length > 90
    ? description.substring(0, 90).trim() + "…"
    : description;
}

export default function EventCard({ event, compact = false, className }: EventCardProps) {
  const safeStatus = normalizeStatus(event.status) || "Planned";
  const safeCategory = event.category || "Other";
  const safeStartDate = event.startDate ? formatDate(event.startDate) : "Date TBD";
  const safeLocation = event.location || "";
  const accentColor = getCategoryColor(safeCategory);
  const firstPhoto = event.coverPhotoUrl
    ? { url: event.coverPhotoUrl }
    : event.photos?.[0];

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        "group block rounded-2xl overflow-hidden transition-all duration-300",
        "glass-card !p-0 hover:-translate-y-1",
        className
      )}
      aria-label={`View event: ${event.title}`}
    >
      {/* Image / Color header */}
      <div
        className="relative aspect-video overflow-hidden"
        style={{
          background: firstPhoto ? undefined : `${accentColor}25`,
        }}
      >
        {firstPhoto ? (
          <img
            src={firstPhoto.url}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            style={{
                objectPosition: event.coverPosition || "center",
                transform: `scale(${event.coverZoom || 1})`,
                transformOrigin: event.coverPosition || "center",
              }}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${accentColor}25` }}
            >
              <Calendar className="h-6 w-6" style={{ color: accentColor }} />
            </div>
          </div>
        )}

        {/* Always-present bottom gradient + title overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <CategoryTag category={safeCategory} />
          <h3 className="font-bold text-white line-clamp-1 leading-tight text-sm mt-1 drop-shadow">
            {event.title}
          </h3>
        </div>

        {/* Status badge top-right */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={safeStatus as EventStatus} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!firstPhoto && (
          <>
            <CategoryTag category={safeCategory} />
            <h3 className="font-bold text-foreground line-clamp-2 leading-tight text-sm mt-1.5 mb-1">
              {event.title}
            </h3>
          </>
        )}
        {!compact && getDescriptionText(event.description) && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {getDescriptionText(event.description)}
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" />
            {safeStartDate}
          </span>
          {safeLocation && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[110px]">{safeLocation}</span>
            </span>
          )}
        </div>

        {(event.assignedTo?.length > 0 || event.photos?.length > 0) && (
          <div className="flex gap-3 mt-2">
            {event.assignedTo?.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{event.assignedTo.length}</span>
              </div>
            )}
            {event.photos?.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Image className="h-3 w-3" />
                <span>{event.photos.length}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
