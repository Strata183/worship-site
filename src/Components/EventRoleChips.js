const roleColorClasses = {
  "Worship Leader": "event-role-chip-leader",
  "Lead Vocal": "event-role-chip-lead-vocal",
  "Backing Vocal": "event-role-chip-backing-vocal",
  "Acoustic Guitar": "event-role-chip-acoustic",
  "Electric Guitar": "event-role-chip-electric",
  Bass: "event-role-chip-bass",
  "Keys/Piano": "event-role-chip-keys",
  Drums: "event-role-chip-drums",
  Percussion: "event-role-chip-percussion",
  Violin: "event-role-chip-violin",
  Sound: "event-role-chip-sound",
  "Slides/Media": "event-role-chip-media",
};

function EventRoleChips({ roles = [] }) {
  if (roles.length === 0) return null;

  return (
    <div className="event-role-chips">
      {roles.map((role) => (
        <span
          className={`event-role-chip ${roleColorClasses[role] || "event-role-chip-default"}`}
          key={role}
        >
          {role}
        </span>
      ))}
    </div>
  );
}

export default EventRoleChips;
