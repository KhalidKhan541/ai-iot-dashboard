'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendChart } from '@/components/analytics/trend-chart';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Target,
  AlertTriangle,
  Download,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function PredictionsPage() {
  const [timeRange, setTimeRange] = useState('7d');

  const predictions = [
    {
      id: 1,
      metric: 'Temperature',
      device: 'Temperature Sensor A1',
      current: 22.5,
      predicted: 24.2,
      range: [22.0, 26.5],
      confidence: 94,
      trend: 'up',
      timeframe: '24 hours',
      factors: ['Weather forecast', 'Historical patterns', 'Building occupancy'],
    },
    {
      id: 2,
      metric: 'Humidity',
      device: 'Humidity Sensor B2',
      current: 45,
      predicted: 52,
      range: [48.0, 56.0],
      confidence: 89,
      trend: 'up',
      timeframe: '24 hours',
      factors: ['Seasonal trends', 'HVAC schedule', 'External humidity'],
    },
    {
      id: 3,
      metric: 'Energy Usage',
      device: 'Building A Total',
      current: 1250,
      predicted: 1180,
      range: [1100, 1260],
      confidence: 87,
      trend: 'down',
      timeframe: '7 days',
      factors: ['Optimized schedules', 'Equipment efficiency', 'Occupancy prediction'],
    },
    {
      id: 4,
      metric: 'CO2 Levels',
      device: 'Air Quality Monitor F6',
      current: 420,
      predicted: 380,
      range: [350, 410],
      confidence: 91,
      trend: 'down',
      timeframe: '12 hours',
      factors: ['Ventilation schedule', 'Occupancy forecast', 'External air quality'],
    },
  ];

  const failurePredictions = [
    {
      device: 'Pressure Sensor C3',
      component: 'Battery',
      risk: 'high',
      probability: 78,
      timeframe: '5 days',
      recommendation: 'Schedule battery replacement within 3 days',
    },
    {
      device: 'Camera H8',
      component: 'Storage',
      risk: 'medium',
      probability: 45,
      timeframe: '14 days',
      recommendation: 'Monitor storage usage, consider expansion',
    },
    {
      device: 'Gateway Hub G7',
      component: 'CPU',
      risk: 'low',
      probability: 12,
      timeframe: '30 days',
      recommendation: 'No action required, normal degradation',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Predictions</h1>
          <p className="text-muted-foreground">
            AI-powered forecasting and predictive maintenance insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Next 24 Hours</SelectItem>
              <SelectItem value="7d">Next 7 Days</SelectItem>
              <SelectItem value="30d">Next 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList>
          <TabsTrigger value="metrics" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Metric Predictions
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-2">
            <Target className="h-4 w-4" />
            Predictive Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {predictions.map((pred) => (
              <Card key={pred.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{pred.metric}</CardTitle>
                    <Badge variant={pred.trend === 'up' ? 'warning' : 'success'}>
                      {pred.trend === 'up' ? (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      ) : (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      )}
                      {pred.trend === 'up' ? 'Increasing' : 'Decreasing'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{pred.device}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Current</p>
                      <p className="text-xl font-bold">{pred.current}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Predicted</p>
                      <p className="text-xl font-bold text-primary">{pred.predicted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Range</p>
                      <p className="text-xl font-bold">
                        {pred.range[0]} - {pred.range[1]}
                      </p>
                    </div>
                  </div>
                  <div className="h-[150px]">
                    <TrendChart metric={pred.metric.toLowerCase()} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Confidence: {pred.confidence}%
                    </span>
                    <span className="text-muted-foreground">
                      Timeframe: {pred.timeframe}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Key Factors:</p>
                    <div className="flex flex-wrap gap-1">
                      {pred.factors.map((factor) => (
                        <Badge key={factor} variant="outline" className="text-xs">
                          {factor}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Predictive Maintenance Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {failurePredictions.map((pred, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-lg p-2 ${
                          pred.risk === 'high'
                            ? 'bg-red-500/10 text-red-500'
                            : pred.risk === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-500'
                            : 'bg-green-500/10 text-green-500'
                        }`}
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{pred.device}</h3>
                          <Badge
                            variant={
                              pred.risk === 'high'
                                ? 'destructive'
                                : pred.risk === 'medium'
                                ? 'warning'
                                : 'success'
                            }
                          >
                            {pred.risk} risk
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Component: {pred.component} • Failure probability: {pred.probability}%
                        </p>
                        <p className="text-sm mt-1">{pred.recommendation}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Estimated timeframe: {pred.timeframe}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
                      Schedule
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
