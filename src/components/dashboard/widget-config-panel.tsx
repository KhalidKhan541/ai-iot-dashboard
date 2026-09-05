'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DashboardWidget } from '@/lib/types';
import { X, Plus, Settings } from 'lucide-react';

interface WidgetConfigPanelProps {
  widget: DashboardWidget | null;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
}

export function WidgetConfigPanel({ widget, onClose, onSave }: WidgetConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>(widget?.config || {});

  if (!widget) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <Card className="w-80 border-l rounded-none h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Widget Settings
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={(config.title as string) || widget.title}
            onChange={(e) => setConfig({ ...config, title: e.target.value })}
          />
        </div>

        {widget.type === 'line-chart' || widget.type === 'bar-chart' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Device</label>
              <Select
                value={(config.deviceId as string) || ''}
                onValueChange={(value) => setConfig({ ...config, deviceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev-001">Temperature Sensor A1</SelectItem>
                  <SelectItem value="dev-002">Humidity Sensor B2</SelectItem>
                  <SelectItem value="dev-003">Pressure Sensor C3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Metric</label>
              <Select
                value={(config.metric as string) || ''}
                onValueChange={(value) => setConfig({ ...config, metric: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                  <SelectItem value="pressure">Pressure</SelectItem>
                  <SelectItem value="battery">Battery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select
                value={(config.timeRange as string) || '24h'}
                onValueChange={(value) => setConfig({ ...config, timeRange: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        ) : widget.type === 'gauge' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Min Value</label>
              <Input
                type="number"
                value={(config.min as number) || 0}
                onChange={(e) => setConfig({ ...config, min: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Max Value</label>
              <Input
                type="number"
                value={(config.max as number) || 100}
                onChange={(e) => setConfig({ ...config, max: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Input
                value={(config.unit as string) || '%'}
                onChange={(e) => setConfig({ ...config, unit: e.target.value })}
              />
            </div>
          </>
        ) : widget.type === 'kpi' ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Value</label>
              <Input
                type="number"
                value={(config.value as number) || 0}
                onChange={(e) => setConfig({ ...config, value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Label</label>
              <Input
                value={(config.label as string) || ''}
                onChange={(e) => setConfig({ ...config, label: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit</label>
              <Input
                value={(config.unit as string) || ''}
                onChange={(e) => setConfig({ ...config, unit: e.target.value })}
              />
            </div>
          </>
        ) : widget.type === 'text' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <textarea
              className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
              value={(config.content as string) || ''}
              onChange={(e) => setConfig({ ...config, content: e.target.value })}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Show Header</label>
          <Switch
            checked={(config.showHeader as boolean) ?? true}
            onCheckedChange={(checked) => setConfig({ ...config, showHeader: checked })}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
