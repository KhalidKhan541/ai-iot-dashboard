import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboard-service';

const dashboardService = new DashboardService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const dashboard = dashboardService.getById(id);
      if (!dashboard) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }
      return NextResponse.json(dashboard);
    }

    const filter = {
      ownerId: searchParams.get('ownerId') || undefined,
      shared: searchParams.get('shared') === 'true' ? true : undefined,
      tags: searchParams.get('tags')?.split(','),
    };

    const dashboards = dashboardService.getAll(filter);
    return NextResponse.json({
      dashboards,
      total: dashboards.length,
      stats: dashboardService.getStats(),
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
    const dashboard = dashboardService.create(body);
    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }

    const body = await request.json();
    const dashboard = dashboardService.update(id, body);

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
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
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }

    const deleted = dashboardService.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
