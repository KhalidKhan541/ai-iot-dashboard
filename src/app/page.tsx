'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Activity,
  Cpu,
  BarChart3,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Lock,
  Bell,
  Layers,
} from 'lucide-react';

const features = [
  {
    icon: Activity,
    title: 'Real-time Monitoring',
    description: 'Monitor your IoT devices in real-time with instant data streaming and visualization.',
  },
  {
    icon: BarChart3,
    title: 'AI Analytics',
    description: 'Leverage machine learning to predict anomalies and optimize device performance.',
  },
  {
    icon: Shield,
    title: 'Smart Alerts',
    description: 'Intelligent alerting system with customizable rules and automated responses.',
  },
  {
    icon: Zap,
    title: 'Rule Engine',
    description: 'Visual rule builder for creating complex automation workflows.',
  },
  {
    icon: Globe,
    title: 'Global Coverage',
    description: 'Manage devices across multiple locations from a single dashboard.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description: 'Bank-grade security with end-to-end encryption and role-based access.',
  },
];

const stats = [
  { value: '10K+', label: 'Devices Connected' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '50M+', label: 'Data Points Daily' },
  { value: '24/7', label: 'Support Available' },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'CTO, SmartBuild Inc.',
    content: 'Transformed how we manage our building automation. The AI predictions have reduced our energy costs by 30%.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Operations Director, AgriTech',
    content: 'The real-time monitoring and alerting system has been a game-changer for our precision agriculture operations.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'VP Engineering, CityConnect',
    content: 'Scalable, reliable, and the rule engine is incredibly powerful. Best IoT platform we have used.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">IoT Hub</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</a>
            <a href="#stats" className="text-sm font-medium hover:text-primary transition-colors">Stats</a>
            <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">Testimonials</a>
            <a href="#pricing" className="text-sm font-medium hover:text-primary transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container px-4 md:px-6 py-12 md:py-24 lg:py-32">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary">
              <Zap className="mr-2 h-4 w-4" />
              Powered by Advanced AI
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter max-w-4xl">
              Intelligent IoT Monitoring for the{' '}
              <span className="text-primary">Modern World</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Harness the power of AI to monitor, analyze, and optimize your IoT devices.
              Predict failures before they happen and automate your operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="gap-2">
                  View Demo Dashboard
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="container px-4 md:px-6 py-12 md:py-24">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="container px-4 md:px-6 py-12 md:py-24">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform built for the demands of modern IoT management
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="border-t bg-muted/50">
          <div className="container px-4 md:px-6 py-12 md:py-24">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">Trusted by Industry Leaders</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See what our customers have to say about transforming their IoT operations
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.name}>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-4">&ldquo;{testimonial.content}&rdquo;</p>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container px-4 md:px-6 py-12 md:py-24">
          <div className="rounded-2xl border bg-card p-8 md:p-12 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
              Ready to Transform Your IoT Operations?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of companies already using IoT Hub to monitor and optimize their devices.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container px-4 md:px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold">IoT Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 IoT Hub. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
