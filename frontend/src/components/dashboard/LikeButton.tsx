import { HeartIcon as HeartSolid } from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutline } from "@heroicons/react/24/outline";

interface Props {
  liked: boolean;
  onToggle: () => void;
  size?: "sm" | "md";
}

export default function LikeButton({ liked, onToggle, size = "sm" }: Props) {
  const cls = size === "md" ? "w-6 h-6" : "w-5 h-5";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="shrink-0 transition-colors hover:scale-110 active:scale-95"
    >
      {liked ? (
        <HeartSolid className={`${cls} text-red-500`} />
      ) : (
        <HeartOutline className={`${cls} text-muted-foreground hover:text-red-400`} />
      )}
    </button>
  );
}
