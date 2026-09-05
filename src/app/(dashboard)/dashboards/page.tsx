'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import {
  LayoutDashboard,
  Plus,
  Star,
  Clock,
  ArrowRight,
  MoreVertical,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DashboardsPage() {
  const { dashboards, removeDashboard } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboards</h1>
          <p className="text-muted-foreground">
            Manage and organize your device monitoring dashboards.
          </p>
        </div>
        <Link href="/dashboard/dashboards/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Dashboard
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id} className="group relative hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.widgets.length} widgets
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {dashboard.isStarred && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => removeDashboard(dashboard.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {dashboard.description || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Updated {new Date(dashboard.updatedAt).toLocaleDateString()}</span>
                </div>
                <Link href={`/dashboard/dashboards/${dashboard.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Open
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        <Link href="/dashboard/dashboards/create">
          <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer h-full min-h-[200px] flex items-center justify-center">
            <CardContent className="text-center">
              <div className="rounded-lg bg-muted p-3 mx-auto w-fit mb-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">Create New Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Add a custom dashboard for your devices
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
