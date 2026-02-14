export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50">
        <div className="p-4">
          <h1 className="text-xl font-bold">EzyNotez</h1>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
