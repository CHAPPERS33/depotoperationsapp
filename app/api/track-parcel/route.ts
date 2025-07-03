// app/api/track-parcel/route.ts
import { NextResponse } from 'next/server';

// Module-level store for rate limiting
const lastRequestTimes = new Map<string, number>();

const RATE_LIMIT_MS = 5000; // 5 seconds per barcode

export async function GET(request: Request) {
  const { searchParams } = new URL(_request.url);
  const barcode = searchParams.get('barcode');
  
  if (!barcode || barcode.length !== 16) {
    return NextResponse.json({ status: 'Invalid barcode' }, { status: 400 });
  }

  // Rate limiting check
  const lastTime = lastRequestTimes.get(barcode);
  const now = Date.now();
  
  if (lastTime && (now - lastTime) < RATE_LIMIT_MS) {
    const timeLeft = Math.ceil((RATE_LIMIT_MS - (now - lastTime)) / 1000);
    console.warn(`Rate limit hit for barcode ${barcode}. Try again in ${timeLeft}s.`);
    return NextResponse.json({ 
      status: `Rate limited - try again in ${timeLeft} seconds` 
    }, { status: 429 });
  }
  // Update last request time after the check.
  lastRequestTimes.set(barcode, now);

  try {
    // Step 1: Check if the tracking page exists (HEAD request is efficient)
    console.log(`Step 1: Checking Evri page existence for ${barcode}.`);
    const trackingPageResponse = await fetch(`https://www.evri.com/track/parcel/${barcode}/details`, {
      method: 'HEAD', // Use HEAD request to check existence without downloading content
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html', // Only interested in HTML page existence
      },
      cache: 'no-store', // Avoid caching this check
    });

    if (trackingPageResponse.ok) {
      // Page exists, implies tracking number is valid
      console.log(`✅ Evri page exists for ${barcode}. Providing manual link.`);
      return NextResponse.json({ 
        status: 'Click to track manually',
        trackingUrl: `https://www.evri.com/track/parcel/${barcode}/details`,
        note: 'Auto-tracking unavailable. Evri page is valid.'
      });
    } else if (trackingPageResponse.status === 404) {
      // Page doesn't exist - invalid tracking number or no details yet
      console.log(`❌ Evri page not found for ${barcode} (404).`);
      return NextResponse.json({ 
        status: 'Tracking number not found or no details yet on Evri.'
      });
    } else {
      // Other error (e.g., 500, 503 from Evri)
      console.error(`Evri Page Check Error for ${barcode}: ${trackingPageResponse.status} ${trackingPageResponse.statusText}`);
      return NextResponse.json({ 
        status: 'Unable to verify tracking number with Evri.',
        note: `Evri returned status ${trackingPageResponse.status}`
      });
    }
    
  } catch (error: any) {
    console.error(`Overall error checking tracking for ${barcode}:`, error.message, error.stack);
    return NextResponse.json({ 
      status: 'Service temporarily unavailable',
      note: 'Error during tracking check.',
      error: error.message 
    });
  }
}

// Fallback for OPTIONS requests if needed by some environments/proxies
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Origin': '*', // Adjust as necessary
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Accept, Accept-Language, Referer, Origin',
    },
  });
}