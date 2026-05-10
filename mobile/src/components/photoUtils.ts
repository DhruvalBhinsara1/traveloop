import { Ionicons } from '@expo/vector-icons';

export function getDestinationImage(city: string) {
  const query = encodeURIComponent(`${city || 'travel'},travel,landmark`);
  return `https://source.unsplash.com/800x500/?${query}`;
}

export function categoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  switch (category.toLowerCase()) {
    case 'food':
      return 'restaurant-outline';
    case 'adventure':
      return 'bicycle-outline';
    case 'transport':
      return 'bus-outline';
    case 'stay':
      return 'bed-outline';
    case 'sightseeing':
      return 'eye-outline';
    default:
      return 'location-outline';
  }
}
