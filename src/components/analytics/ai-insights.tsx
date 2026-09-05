'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export function AIInsights() {
  const insights = [
    {
      id: 1,
      type: 'optimization',
      title: 'Energy Optimization Opportunity',
      description:
        'Based on occupancy patterns, reducing HVAC output by 15% during off-hours could save approximately $2,400/month.',
      impact: 'high',
      confidence: 92,
      metric: 'Energy Usage',
      trend: 'down',
    },
    {
      id: 2,
      type: 'prediction',
      title: 'Temperature Rise Predicted',
      description:
        'AI models predict a temperature increase of 3.2°C in Building A over the next 6 hours due to weather conditions.',
      impact: 'medium',
      confidence: 88,
      metric: 'Temperature',
      trend: 'up',
    },
    {
      id: 3,
      type: 'anomaly',
      title: 'Unusual CO2 Pattern Detected',
      description:
        'CO2 levels in Building C show an unusual pattern that may indicate ventilation issues. Recommend inspection.',
      impact: 'medium',
      confidence: 85,
      metric: 'CO2 Levels',
      trend: 'up',
    },
    {
      id: 4,
      type: 'recommendation',
      title: 'Schedule Maintenance',
      description:
        'Pressure Sensor C3 battery is degrading faster than expected. Schedule replacement within 5 days.',
      impact: 'high',
      confidence: 95,
      metric: 'Battery Health',
      trend: 'down',
    },
  ];

  const recommendations = [
    {
      title: 'Optimize Lighting Schedule',
      description: 'Adjust lighting based on natural light availability',
      savings: '$800/month',
    },
    {
      title: 'Pre-cool Building Before Peak',
      description: 'Start cooling 30 min before peak hours to reduce load',
      savings: '$1,200/month',
    },
    {
      title: 'Consolidate Sensor Readings',
      description: 'Reduce sampling frequency for stable sensors',
      savings: '15% bandwidth',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((insight) => (
          <Card key={insight.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{insight.title}</h3>
                    <Badge
                      variant={
                        insight.impact === 'high'
                          ? 'destructive'
                          : insight.impact === 'medium'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {insight.impact} impact
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {insight.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {insight.metric}
                    </span>
                    <span>Confidence: {insight.confidence}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI Recommendations
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <h4 className="font-medium">{rec.title}</h4>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="success">{rec.savings}</Badge>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Apply
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
