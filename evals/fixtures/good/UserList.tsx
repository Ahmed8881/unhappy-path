import { useQuery } from "@tanstack/react-query";

export function UserList() {
  const { data: users, error, isLoading, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }),
  });

  if (error) {
    return (
      <div role="alert">
        <p>We couldn't load your team. Check your connection and try again.</p>
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }
  if (isLoading) return <UserListSkeleton aria-busy="true" />;
  if (users.length === 0) {
    return <EmptyState title="No teammates yet" action={<InviteButton />} />;
  }
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id} className="min-w-0 truncate" title={u.name}>{u.name}</li>
      ))}
    </ul>
  );
}
