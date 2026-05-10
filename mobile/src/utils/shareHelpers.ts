import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { getApiBaseUrl } from '../api/client';
import type { Trip } from '../api/types';

export const buildPublicTripUrl = (shareToken: string) =>
  `${getApiBaseUrl().replace(/\/$/, '')}/api/public/${shareToken}`;

export const shareTrip = async (trip: Pick<Trip, 'title' | 'shareToken'>) => {
  if (!trip.shareToken) {
    throw new Error('This trip does not have a public share link yet.');
  }

  const url = buildPublicTripUrl(trip.shareToken);

  await Share.share({
    title: trip.title,
    url,
    message: `Follow my ${trip.title} itinerary on Traveloop: ${url}`
  });

  return url;
};

export const copyPublicTripLink = async (shareToken: string) => {
  const url = buildPublicTripUrl(shareToken);
  await Clipboard.setStringAsync(url);
  return url;
};
