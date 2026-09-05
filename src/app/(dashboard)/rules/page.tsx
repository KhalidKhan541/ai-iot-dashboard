'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store';
import {
  Plus,
  Zap,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  Clock,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

export default function RulesPage() {
  const rules = [
    {
      id: 'rule-001',
      name: 'Temperature Alert Chain',
      description: 'Alert when temperature exceeds threshold, then reduce HVAC',
      status: 'active',
      triggers: 12,
      lastRun: '2024-01-15T10:30:00Z',
      conditions: 3,
      actions: 2,
    },
    {
      id: 'rule-002',
      name: 'Energy Optimization',
      description: 'Automatically adjust lighting based on occupancy',
      status: 'active',
      triggers: 45,
      lastRun: '2024-01-15T10:25:00Z',
      conditions: 2,
      actions: 4,
    },
    {
      id: 'rule-003',
      name: 'Security Protocol',
      description: 'Lock doors and alert security when motion detected after hours',
      status: 'paused',
      triggers: 8,
      lastRun: '2024-01-14T23:00:00Z',
      conditions: 4,
      actions: 5,
    },
    {
      id: 'rule-004',
      name: 'Maintenance Scheduler',
      description: 'Create maintenance tickets when device health drops below threshold',
      status: 'active',
      triggers: 3,
      lastRun: '2024-01-15T09:00:00Z',
      conditions: 2,
      actions: 1,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rule Engine</h1>
          <p className="text-muted-foreground">
            Create and manage automation rules for your IoT devices.
          </p>
        </div>
        <Link href="/dashboard/rules/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground">
              {rules.filter((r) => r.status === 'active').length} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Triggers</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rules.reduce((sum, r) => sum + r.triggers, 0)}
            </div>
            <p className="text-xs text-muted-foreground">In the last 24 hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-xs text-muted-foreground">Execution success</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">125ms</div>
            <p className="text-xs text-muted-foreground">Rule execution time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge variant={rule.status === 'active' ? 'success' : 'secondary'}>
                        {rule.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        {rule.conditions} conditions
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {rule.actions} actions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Triggered {rule.triggers}x
                      </span>
                      <span>
                        Last run: {new Date(rule.lastRun).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.status === 'active'} />
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Rules Created</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automation rule to get started.
            </p>
            <Link href="/dashboard/rules/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Rule
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
