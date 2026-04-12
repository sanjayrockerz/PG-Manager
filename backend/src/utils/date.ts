export function getTodayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function getTimestampedNote(note: string) {
  const timestamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `[${timestamp}] ${note}`;
}
