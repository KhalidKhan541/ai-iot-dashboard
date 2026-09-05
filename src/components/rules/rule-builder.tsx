'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus,
  Trash2,
  GripVertical,
  Zap,
  Bell,
  Mail,
  MessageSquare,
  Webhook,
  ArrowRight,
  GitBranch,
} from 'lucide-react';

interface Condition {
  id: string;
  metric: string;
  operator: string;
  value: number;
}

interface Action {
  id: string;
  type: string;
  config: Record<string, string>;
}

interface RuleBuilderProps {
  conditions: Condition[];
  setConditions: (conditions: Condition[]) => void;
  actions: Action[];
  setActions: (actions: Action[]) => void;
}

export function RuleBuilder({ conditions, setConditions, actions, setActions }: RuleBuilderProps) {
  const [newCondition, setNewCondition] = useState<Condition>({
    id: '',
    metric: '',
    operator: '>',
    value: 0,
  });

  const [newAction, setNewAction] = useState<Action>({
    id: '',
    type: 'alert',
    config: {},
  });

  const addCondition = () => {
    if (!newCondition.metric) return;
    setConditions([
      ...conditions,
      { ...newCondition, id: `cond-${Date.now()}` },
    ]);
    setNewCondition({ id: '', metric: '', operator: '>', value: 0 });
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const addAction = () => {
    setActions([
      ...actions,
      { ...newAction, id: `action-${Date.now()}` },
    ]);
    setNewAction({ id: '', type: 'alert', config: {} });
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const metrics = [
    { value: 'temperature', label: 'Temperature' },
    { value: 'humidity', label: 'Humidity' },
    { value: 'pressure', label: 'Pressure' },
    { value: 'battery', label: 'Battery Level' },
    { value: 'co2', label: 'CO2 Levels' },
    { value: 'motion', label: 'Motion Detected' },
    { value: 'power', label: 'Power Usage' },
  ];

  const operators = [
    { value: '>', label: 'Greater than (>)' },
    { value: '<', label: 'Less than (<)' },
    { value: '>=', label: 'Greater or equal (>=)' },
    { value: '<=', label: 'Less or equal (<=)' },
    { value: '==', label: 'Equal to (==)' },
    { value: '!=', label: 'Not equal (!=)' },
  ];

  const actionTypes = [
    { value: 'alert', label: 'Send Alert', icon: Bell },
    { value: 'email', label: 'Send Email', icon: Mail },
    { value: 'sms', label: 'Send SMS', icon: MessageSquare },
    { value: 'webhook', label: 'Webhook', icon: Webhook },
    { value: 'device-control', label: 'Control Device', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          Conditions (IF)
        </h3>
        <div className="space-y-3">
          {conditions.map((condition) => (
            <div
              key={condition.id}
              className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              <span className="text-sm font-medium capitalize">{condition.metric}</span>
              <span className="text-sm text-muted-foreground">{condition.operator}</span>
              <span className="text-sm font-medium">{condition.value}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={() => removeCondition(condition.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed">
            <Select
              value={newCondition.metric}
              onValueChange={(value) =>
                setNewCondition({ ...newCondition, metric: value })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                {metrics.map((metric) => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newCondition.operator}
              onValueChange={(value) =>
                setNewCondition({ ...newCondition, operator: value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Operator" />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={newCondition.value}
              onChange={(e) =>
                setNewCondition({
                  ...newCondition,
                  value: Number(e.target.value),
                })
              }
              className="w-[100px]"
              placeholder="Value"
            />

            <Button variant="outline" size="sm" onClick={addCondition}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-px w-12 bg-border" />
          <span className="text-sm font-medium">THEN</span>
          <div className="h-px w-12 bg-border" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Actions
        </h3>
        <div className="space-y-3">
          {actions.map((action) => {
            const ActionIcon = actionTypes.find((t) => t.value === action.type)?.icon || Bell;
            return (
              <div
                key={action.id}
                className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <ActionIcon className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {actionTypes.find((t) => t.value === action.type)?.label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
                  onClick={() => removeAction(action.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}

          <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed">
            <Select
              value={newAction.type}
              onValueChange={(value) =>
                setNewAction({ ...newAction, type: value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={addAction}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {conditions.length > 0 && actions.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <h4 className="text-sm font-medium mb-2">Rule Preview</h4>
          <p className="text-sm text-muted-foreground">
            When{' '}
            {conditions.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ' and '}
                <span className="font-medium">{c.metric}</span>{' '}
                <span className="text-primary">{c.operator}</span>{' '}
                <span className="font-medium">{c.value}</span>
              </span>
            ))}{' '}
            then{' '}
            {actions.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ' and '}
                <span className="font-medium">
                  {actionTypes.find((t) => t.value === a.type)?.label}
                </span>
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  );
}
