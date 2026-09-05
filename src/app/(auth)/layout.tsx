import { Activity } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
        <div className="relative z-10 text-center text-primary-foreground p-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Activity className="h-12 w-12" />
            <span className="text-3xl font-bold">IoT Hub</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Intelligent IoT Monitoring
          </h1>
          <p className="text-xl opacity-90 max-w-md">
            Monitor, analyze, and optimize your IoT devices with AI-powered insights.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 max-w-sm mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm opacity-75">Devices</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm opacity-75">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50M+</div>
              <div className="text-sm opacity-75">Data Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm opacity-75">Support</div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 to-transparent" />
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">IoT Hub</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
