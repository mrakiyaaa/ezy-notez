export default function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  return (
    <div className="space-y-4">
      {/* Workspace navigation */}
      <nav className="border-b pb-4">
        <div className="flex space-x-4">
          <a href={`/workspace/${params.workspaceId}`} className="font-medium">
            Dashboard
          </a>
          <a href={`/workspace/${params.workspaceId}/resources`}>Resources</a>
          <a href={`/workspace/${params.workspaceId}/quiz`}>Quiz</a>
          <a href={`/workspace/${params.workspaceId}/study-room`}>Study Room</a>
        </div>
      </nav>
      {children}
    </div>
  );
}
