import { useCallback, useRef } from 'react';
import { GestureResponderEvent, Pressable, PressableProps } from 'react-native';

import { playLongPressHaptic } from '../utils/haptics';

export type HapticPressableProps = PressableProps & {
  hapticOnLongPress?: boolean;
};

export function HapticPressable({
  disabled,
  hapticOnLongPress = true,
  onLongPress,
  onPressIn,
  onPressOut,
  ...props
}: HapticPressableProps) {
  const longPressHapticPlayedRef = useRef(false);

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    longPressHapticPlayedRef.current = false;
    onPressIn?.(event);
  }, [onPressIn]);

  const handleLongPress = useCallback((event: GestureResponderEvent) => {
    if (!disabled && hapticOnLongPress && !longPressHapticPlayedRef.current) {
      longPressHapticPlayedRef.current = true;
      playLongPressHaptic();
    }
    onLongPress?.(event);
  }, [disabled, hapticOnLongPress, onLongPress]);

  const handlePressOut = useCallback((event: GestureResponderEvent) => {
    onPressOut?.(event);
  }, [onPressOut]);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    />
  );
}
