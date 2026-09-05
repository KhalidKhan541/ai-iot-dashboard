import { NextRequest, NextResponse } from 'next/server';
import { AlertService } from '@/services/alert-service';

const alertService = new AlertService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const alert = alertService.getById(id);
      if (!alert) {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
      }
      return NextResponse.json(alert);
    }

    const filter = {
      status: searchParams.get('status')?.split(',') as any,
      severity: searchParams.get('severity')?.split(',') as any,
      deviceId: searchParams.get('deviceId') || undefined,
      category: searchParams.get('category') as any,
    };

    const alerts = alertService.getAll(filter);
    return NextResponse.json({
      alerts,
      total: alerts.length,
      stats: alertService.getStats(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const alert = alertService.create(body);
    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    let result;
    switch (action) {
      case 'acknowledge':
        const ackBody = await request.json().catch(() => ({}));
        result = alertService.acknowledge(id, ackBody.userId || 'system');
        break;
      case 'resolve':
        result = alertService.resolve(id);
        break;
      case 'suppress':
        result = alertService.suppress(id);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result) {
      return NextResponse.json({ error: 'Alert not found or invalid action' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    const deleted = alertService.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
