'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { DashboardGrid } from '@/components/dashboard/dashboard-grid';
import {
  ArrowLeft,
  Settings,
  Share2,
  Download,
  Star,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { dashboards, updateDashboard } = useAppStore();

  const dashboard = dashboards.find((d) => d.id === id);

  if (!dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Dashboard Not Found</h2>
        <p className="text-muted-foreground">The dashboard you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/dashboards">
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboards
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/dashboards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{dashboard.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateDashboard(dashboard.id, { isStarred: !dashboard.isStarred })
                }
              >
                <Star
                  className={`h-5 w-5 ${
                    dashboard.isStarred ? 'fill-yellow-400 text-yellow-400' : ''
                  }`}
                />
              </Button>
            </div>
            {dashboard.description && (
              <p className="text-muted-foreground">{dashboard.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <DashboardGrid dashboard={dashboard} />
    </div>
  );
}
