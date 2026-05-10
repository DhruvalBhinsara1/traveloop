import { Ionicons } from '@expo/vector-icons';

export const photos = {
  tokyo: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=900&q=80',
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80',
  bali: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=900&q=80',
  rome: 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=900&q=80',
  kyoto: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&q=80',
  florence: 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9077?w=900&q=80',
  default: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=80'
};

export const inspiration = [
  { city: 'Florence', country: 'Italia', rating: '5.0', image: photos.florence },
  { city: 'Tokyo', country: 'Japan', rating: '4.9', image: photos.tokyo },
  { city: 'Bali', country: 'Indonesia', rating: '4.8', image: photos.bali },
  { city: 'Paris', country: 'France', rating: '4.8', image: photos.paris }
];

export const getDestinationImage = (value: string) => {
  const key = value.toLowerCase();
  if (key.includes('tokyo')) return photos.tokyo;
  if (key.includes('kyoto')) return photos.kyoto;
  if (key.includes('paris')) return photos.paris;
  if (key.includes('bali')) return photos.bali;
  if (key.includes('rome')) return photos.rome;
  if (key.includes('florence')) return photos.florence;
  return photos.default;
};

export const categoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    sightseeing: 'eye-outline',
    food: 'restaurant-outline',
    adventure: 'bicycle-outline',
    transport: 'bus-outline',
    stay: 'bed-outline',
    documents: 'document-text-outline',
    clothing: 'shirt-outline',
    electronics: 'phone-portrait-outline'
  };

  return map[category] ?? 'sparkles-outline';
};
