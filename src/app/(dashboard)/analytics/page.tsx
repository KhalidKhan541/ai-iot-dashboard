'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIInsights } from '@/components/analytics/ai-insights';
import { TrendChart } from '@/components/analytics/trend-chart';
import {
  BarChart3,
  TrendingUp,
  Brain,
  AlertTriangle,
  Download,
  RefreshCw,
  Cpu,
  Thermometer,
  Droplets,
  Wind,
} from 'lucide-react';

export default function AnalyticsPage() {
  const aiMetrics = [
    {
      metric: 'Temperature',
      current: 22.5,
      predicted: 23.2,
      trend: 'up' as const,
      confidence: 94,
      anomalyScore: 0.12,
    },
    {
      metric: 'Humidity',
      current: 45,
      predicted: 47,
      trend: 'up' as const,
      confidence: 89,
      anomalyScore: 0.08,
    },
    {
      metric: 'CO2 Levels',
      current: 420,
      predicted: 435,
      trend: 'up' as const,
      confidence: 91,
      anomalyScore: 0.23,
    },
    {
      metric: 'Energy Usage',
      current: 1250,
      predicted: 1180,
      trend: 'down' as const,
      confidence: 87,
      anomalyScore: 0.05,
    },
  ];

  const anomalies = [
    {
      id: 1,
      device: 'Air Quality Monitor F6',
      type: 'CO2 Spike',
      severity: 'warning',
      time: '2 hours ago',
      description: 'CO2 levels exceeded normal range by 15%',
    },
    {
      id: 2,
      device: 'Pressure Sensor C3',
      type: 'Battery Drain',
      severity: 'critical',
      time: '5 hours ago',
      description: 'Battery level dropped 20% in 1 hour',
    },
    {
      id: 3,
      device: 'Temperature Sensor A1',
      type: 'Reading Anomaly',
      severity: 'info',
      time: '1 day ago',
      description: 'Brief temperature fluctuation detected',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights and predictions for your IoT devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {aiMetrics.map((metric) => (
          <Card key={metric.metric}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
              {metric.metric === 'Temperature' ? (
                <Thermometer className="h-4 w-4 text-muted-foreground" />
              ) : metric.metric === 'Humidity' ? (
                <Droplets className="h-4 w-4 text-muted-foreground" />
              ) : metric.metric === 'CO2 Levels' ? (
                <Wind className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Cpu className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.current}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">Predicted:</span>
                <span className="text-sm font-medium">{metric.predicted}</span>
                <Badge variant={metric.trend === 'up' ? 'warning' : 'success'} className="text-xs">
                  {metric.trend === 'up' ? '↑' : '↓'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Confidence: {metric.confidence}%</span>
                <span>Anomaly: {metric.anomalyScore}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trends">
        <TabsList>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomalies
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Temperature Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart metric="temperature" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Humidity Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart metric="humidity" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart metric="energy" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <AIInsights />
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          {anomalies.map((anomaly) => (
            <Card key={anomaly.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-lg p-2 ${
                        anomaly.severity === 'critical'
                          ? 'bg-red-500/10 text-red-500'
                          : anomaly.severity === 'warning'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{anomaly.type}</h3>
                        <Badge
                          variant={
                            anomaly.severity === 'critical'
                              ? 'destructive'
                              : anomaly.severity === 'warning'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {anomaly.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{anomaly.device}</p>
                      <p className="text-sm mt-1">{anomaly.description}</p>
                      <p className="text-xs text-muted-foreground mt-2">{anomaly.time}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Investigate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
