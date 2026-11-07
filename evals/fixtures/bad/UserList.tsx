// Typical happy-path output: no loading, no empty, swallowed error, no overflow rule.
import { useEffect, useState } from "react";

export function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(console.error);
  }, []);
  return (
    <div className="flex gap-2">
      {users.length && <h2>Team</h2>}
      <ul>
        {users.map((u) => (
          <li key={u.id}>{u.name}</li>
        ))}
      </ul>
    </div>
  );
}
