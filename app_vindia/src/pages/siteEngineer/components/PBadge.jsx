export default function PBadge({ p }) {
  const map = {
    critical: "red",
    high: "orange",
    medium: "blue",
    low: "gray",
  };

  return (
    <span style={{ color: map[p] || "gray" }}>
      {p || "medium"}
    </span>
  );
}