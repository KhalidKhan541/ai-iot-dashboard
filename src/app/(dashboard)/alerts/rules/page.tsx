'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store';
import {
  Plus,
  Shield,
  Bell,
  Mail,
  MessageSquare,
  Power,
  Edit,
  Trash2,
  Clock,
} from 'lucide-react';

export default function AlertRulesPage() {
  const { alertRules, toggleAlertRule, removeAlertRule } = useAppStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert Rules</h1>
          <p className="text-muted-foreground">
            Configure automated alerts based on device metrics.
          </p>
        </div>
        <Link href="/dashboard/alerts/rules">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {alertRules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-lg p-2 ${
                      rule.severity === 'critical'
                        ? 'bg-red-500/10 text-red-500'
                        : rule.severity === 'warning'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge
                        variant={
                          rule.severity === 'critical'
                            ? 'destructive'
                            : rule.severity === 'warning'
                            ? 'warning'
                            : 'secondary'
                        }
                      >
                        {rule.severity}
                      </Badge>
                      {!rule.enabled && (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rule.deviceName} • {rule.metric}{' '}
                      {rule.condition === 'greater' ? '>' : rule.condition === 'less' ? '<' : '='}{' '}
                      {Array.isArray(rule.threshold)
                        ? `${rule.threshold[0]} - ${rule.threshold[1]}`
                        : rule.threshold}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Cooldown: {rule.cooldownMinutes}m
                      </span>
                      {rule.notifyEmail && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </span>
                      )}
                      {rule.notifyPush && (
                        <span className="flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          Push
                        </span>
                      )}
                      {rule.notifySms && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          SMS
                        </span>
                      )}
                      {rule.lastTriggered && (
                        <span>
                          Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => toggleAlertRule(rule.id)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeAlertRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alertRules.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Alert Rules</h3>
            <p className="text-muted-foreground mb-4">
              Create your first alert rule to get started with automated monitoring.
            </p>
            <Link href="/dashboard/alerts/rules">
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
