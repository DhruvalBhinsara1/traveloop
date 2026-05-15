import { Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import type { Trip } from '../api/types';

export const buildPublicTripLink = (shareToken: string) => `traveloop://public/${encodeURIComponent(shareToken)}`;
export const buildPublicTripUrl = buildPublicTripLink;

export const shareTrip = async (trip: Pick<Trip, 'title' | 'shareToken'>) => {
  if (!trip.shareToken) {
    throw new Error('This trip does not have a public share link yet.');
  }

  const url = buildPublicTripLink(trip.shareToken);

  await Share.share({
    title: trip.title,
    url,
    message: `Follow my ${trip.title} itinerary on Traveloop: ${url}`
  });

  return url;
};

export const copyPublicTripLink = async (shareToken: string) => {
  const url = buildPublicTripLink(shareToken);
  await Clipboard.setStringAsync(url);
  return url;
};
