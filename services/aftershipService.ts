
import { AFTERSHIP_API_KEY, EVRI_SLUG } from '../constants';
import { AftershipTracking } from '../types';

async function getAfterShipTracking(barcode: string): Promise<AftershipTracking | null> {
  try {
    const res = await fetch(`https://api.aftership.com/v4/trackings/${EVRI_SLUG}/${barcode}`, {
      headers: {
        'Content-Type': 'application/json',
        'as-api-key': AFTERSHIP_API_KEY
      }
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      console.error('GET trackings error:', await res.json());
      return null;
    }
    const data = await res.json();
    return data.data.tracking as AftershipTracking;
  } catch (e) {
    console.error('Error fetching AfterShip tracking:', e);
    return null;
  }
}

async function createAfterShipTracking(barcode: string): Promise<AftershipTracking | null> {
  try {
    const res = await fetch('https://api.aftership.com/v4/trackings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'as-api-key': AFTERSHIP_API_KEY
      },
      body: JSON.stringify({
        tracking: {
          tracking_number: barcode,
          slug: EVRI_SLUG
        }
      })
    });
    if (!res.ok) {
      console.error('Error creating AfterShip tracking:', await res.json());
      return null;
    }
    const data = await res.json();
    return data.data.tracking as AftershipTracking;
  } catch (e) {
    console.error('Error creating AfterShip tracking:', e);
    return null;
  }
}

export async function getOrCreateAfterShipStatus(barcode: string): Promise<{ tag: string; subtag_message: string } | null> {
  let tracking = await getAfterShipTracking(barcode);
  if (!tracking) {
    const created = await createAfterShipTracking(barcode);
    if (!created) return null;
    tracking = await getAfterShipTracking(barcode); // Re-fetch after creation
  }
  if (!tracking) return { tag: 'Pending', subtag_message: 'Awaiting carrier information' };
  return { tag: tracking.tag, subtag_message: tracking.subtag_message };
}