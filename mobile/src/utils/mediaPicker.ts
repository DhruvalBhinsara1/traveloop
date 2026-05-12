import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type ImageSource = 'camera' | 'library';

export type PickedImage = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
  source: ImageSource;
};

type PickerResult =
  | { status: 'selected'; image: PickedImage }
  | { status: 'cancelled' }
  | { status: 'permission-denied'; source: ImageSource };

type PickImageOptions = {
  title: string;
  aspect: [number, number];
  quality?: number;
  allowsEditing?: boolean;
  cameraLabel?: string;
  libraryLabel?: string;
};

export async function pickImageFromDevice({
  title,
  aspect,
  quality = 0.86,
  allowsEditing = true,
  cameraLabel = 'Take Photo',
  libraryLabel = 'Choose From Library'
}: PickImageOptions): Promise<PickerResult> {
  const source = await chooseImageSource(title, cameraLabel, libraryLabel);

  if (!source) {
    return { status: 'cancelled' };
  }

  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    return { status: 'permission-denied', source };
  }

  const pickerOptions: ImagePicker.ImagePickerOptions = {
    allowsEditing,
    aspect,
    mediaTypes: ['images'],
    quality
  };

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(pickerOptions)
    : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets?.[0]) {
    return { status: 'cancelled' };
  }

  const asset = result.assets[0];

  return {
    status: 'selected',
    image: {
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      source
    }
  };
}

function chooseImageSource(title: string, cameraLabel: string, libraryLabel: string): Promise<ImageSource | null> {
  if (Platform.OS === 'ios') {
    return new Promise((resolve) => {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [cameraLabel, libraryLabel, 'Cancel'],
          cancelButtonIndex: 2,
          userInterfaceStyle: 'light'
        },
        (buttonIndex) => {
          if (buttonIndex === 0) resolve('camera');
          else if (buttonIndex === 1) resolve('library');
          else resolve(null);
        }
      );
    });
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      undefined,
      [
        { text: cameraLabel, onPress: () => resolve('camera') },
        { text: libraryLabel, onPress: () => resolve('library') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
      ],
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}
