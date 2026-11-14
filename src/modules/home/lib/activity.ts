export function activityIconName(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("meeting") && t.includes("start")) return "play";
  if (t.includes("meeting") && t.includes("complete")) return "check-circle";
  if (t.includes("meeting")) return "calendar";
  if (t.includes("agent")) return "bot";
  if (t.includes("transcript") || t.includes("recording")) return "file-text";
  return "activity";
}

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "just now";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return date.toLocaleDateString();
}

export function shouldHideDescription(title: string, description: string | null | undefined): boolean {
  if (!description) return true;
  const t = title.trim().toLowerCase();
  const d = description.trim().toLowerCase();
  return t === d || d.startsWith(t) || t.startsWith(d);
}