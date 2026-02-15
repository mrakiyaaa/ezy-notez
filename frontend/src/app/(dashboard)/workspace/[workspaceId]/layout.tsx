export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return (
    <div className="space-y-4">
      {/* Workspace navigation */}
      <nav className="border-b pb-4">
        <div className="flex space-x-4">
          <a href={`/workspace/${workspaceId}`} className="font-medium">
            Dashboard
          </a>
          <a href={`/workspace/${workspaceId}/resources`}>Resources</a>
          <a href={`/workspace/${workspaceId}/quiz`}>Quiz</a>
          <a href={`/workspace/${workspaceId}/study-room`}>Study Room</a>
        </div>
      </nav>
      {children}
    </div>
  );
}
