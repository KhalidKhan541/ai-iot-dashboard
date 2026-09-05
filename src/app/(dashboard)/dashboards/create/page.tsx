'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store';
import { generateId } from '@/lib/utils';
import { ArrowLeft, Plus, LayoutDashboard, Trash2 } from 'lucide-react';

const widgetTypes = [
  { type: 'kpi', label: 'KPI Card', description: 'Display a single key metric' },
  { type: 'line-chart', label: 'Line Chart', description: 'Show trends over time' },
  { type: 'bar-chart', label: 'Bar Chart', description: 'Compare values across categories' },
  { type: 'gauge', label: 'Gauge', description: 'Display a value within a range' },
  { type: 'table', label: 'Table', description: 'Show data in a table format' },
  { type: 'status', label: 'Status List', description: 'Display device status overview' },
  { type: 'heatmap', label: 'Heatmap', description: 'Visualize data intensity' },
  { type: 'text', label: 'Text/Note', description: 'Add notes or descriptions' },
];

export default function CreateDashboardPage() {
  const router = useRouter();
  const { addDashboard } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);

  const toggleWidget = (type: string) => {
    setSelectedWidgets((prev) =>
      prev.includes(type) ? prev.filter((w) => w !== type) : [...prev, type]
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;

    const newDashboard = {
      id: `dash-${generateId()}`,
      name: name.trim(),
      description: description.trim(),
      isDefault: false,
      isStarred: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      widgets: selectedWidgets.map((type, index) => ({
        id: `w-${generateId()}`,
        type: type as 'kpi' | 'line-chart' | 'bar-chart' | 'gauge' | 'table' | 'status' | 'heatmap' | 'text',
        title: widgetTypes.find((w) => w.type === type)?.label || type,
        position: { x: (index % 3) * 4, y: Math.floor(index / 3) * 3, w: 4, h: 3 },
        config: {},
      })),
    };

    addDashboard(newDashboard);
    router.push(`/dashboard/dashboards/${newDashboard.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/dashboards">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Dashboard</h1>
          <p className="text-muted-foreground">
            Set up a new dashboard for monitoring your devices.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Name *
                </label>
                <Input
                  id="name"
                  placeholder="e.g., Building Overview"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="description">
                  Description
                </label>
                <Textarea
                  id="description"
                  placeholder="Describe what this dashboard monitors..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Widgets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {widgetTypes.map((widget) => (
                  <button
                    key={widget.type}
                    onClick={() => toggleWidget(widget.type)}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      selectedWidgets.includes(widget.type)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 ${
                        selectedWidgets.includes(widget.type)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{widget.label}</p>
                      <p className="text-sm text-muted-foreground">{widget.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                {selectedWidgets.length === 0 ? (
                  <div className="text-muted-foreground">
                    <LayoutDashboard className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">Select widgets to preview</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{name || 'Untitled Dashboard'}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedWidgets.length} widget{selectedWidgets.length !== 1 ? 's' : ''}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {selectedWidgets.map((type) => (
                        <div
                          key={type}
                          className="rounded bg-muted p-2 text-xs"
                        >
                          {widgetTypes.find((w) => w.type === type)?.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={!name.trim()}>
                Create Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
