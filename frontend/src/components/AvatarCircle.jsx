export default function AvatarCircle({ initials, size = 34, color, bg }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color, fontWeight: 800,
      fontSize: size * 0.33, display: "flex",
      alignItems: "center", justifyContent: "center",
      flexShrink: 0, fontFamily: "'Syne', sans-serif",
      userSelect: "none",
    }}>
      {initials}
    </div>
  );
}
