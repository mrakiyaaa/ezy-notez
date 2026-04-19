import type { Activity } from "@/types/activity";

interface UpcomingActivitiesProps {
  activities: Activity[];
  isLoading?: boolean;
}

const statusStyles: Record<Activity["status"], string> = {
  pending: "text-amber-300",
  "in-progress": "text-sky-300",
  done: "text-emerald-300",
};

function SkeletonItem() {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-white/10" />
          <div className="h-2.5 w-24 rounded bg-white/5" />
        </div>
        <div className="h-3 w-16 rounded bg-white/5" />
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-white/5" />
      <div className="mt-2 h-2.5 w-20 rounded bg-white/5" />
    </div>
  );
}

export default function UpcomingActivities({
  activities,
  isLoading = false,
}: UpcomingActivitiesProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-bg-card p-5 shadow-[0_18px_50px_rgba(15,23,42,0.4)]">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-text-primary">Upcoming Activities</h3>
        <span className="text-xs text-white/50">Across your workspaces</span>
      </div>
      <div className="mt-4 space-y-4">
        {isLoading ? (
          <>
            <SkeletonItem />
            <SkeletonItem />
          </>
        ) : activities.length === 0 ? (
          <p className="text-sm text-white/50">All caught up.</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="rounded-xl border border-white/10 bg-slate-950/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-text-primary truncate">{activity.title}</p>
                  <p className="text-xs text-white/50">{activity.category}</p>
                </div>
                <span className={`text-xs shrink-0 ${statusStyles[activity.status]}`}>
                  {activity.status.replace("-", " ")}
                </span>
              </div>
              {activity.progress > 0 && (
                <div className="mt-3 h-2 w-full rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-blue-accent"
                    style={{ width: `${Math.min(100, activity.progress)}%` }}
                  />
                </div>
              )}
              <p className="mt-2 text-xs text-white/50">
                {new Date(activity.dueAt).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
