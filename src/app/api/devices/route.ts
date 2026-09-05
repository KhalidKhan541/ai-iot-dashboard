import { NextRequest, NextResponse } from 'next/server';
import { DeviceService } from '@/services/device-service';

const deviceService = new DeviceService();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const device = deviceService.getById(id);
      if (!device) {
        return NextResponse.json({ error: 'Device not found' }, { status: 404 });
      }
      return NextResponse.json(device);
    }

    const filter = {
      status: searchParams.get('status')?.split(',') as any,
      type: searchParams.get('type')?.split(',') as any,
      location: searchParams.get('location') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const devices = deviceService.getAll(filter);
    return NextResponse.json({
      devices,
      total: devices.length,
      stats: deviceService.getStats(),
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
    const device = deviceService.create(body);
    return NextResponse.json(device, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Validation failed')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
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
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const body = await request.json();
    const device = deviceService.update(id, body);

    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json(device);
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
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const deleted = deviceService.delete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
