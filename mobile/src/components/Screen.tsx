import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  ScrollViewProps,
  StatusBar,
  StatusBarStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';

import { colors, layout } from '../theme';

export type ScreenProps = Omit<ViewProps, 'children'> & {
  children: ReactNode;
  backgroundColor?: string;
  centered?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
  refreshing?: boolean;
  safeArea?: boolean;
  scroll?: boolean;
  scrollable?: boolean;
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'style'>;
  statusBarStyle?: StatusBarStyle;
};

export function Screen({
  children,
  backgroundColor = colors.background,
  centered,
  contentContainerStyle,
  keyboardAvoiding,
  onRefresh,
  padded = true,
  refreshing = false,
  safeArea = true,
  scroll,
  scrollable,
  scrollProps,
  statusBarStyle = 'dark-content',
  style,
  ...viewProps
}: ScreenProps) {
  const Container = safeArea ? SafeAreaView : View;
  const shouldScroll = scroll ?? scrollable ?? true;
  const contentStyle = [
    styles.content,
    padded && styles.padded,
    centered && styles.centered,
    contentContainerStyle,
  ];

  const body = shouldScroll ? (
    <ScrollView
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.flex}
      contentContainerStyle={contentStyle}
      refreshControl={
        onRefresh ? (
          <RefreshControl tintColor={colors.primary} refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle}>{children}</View>
  );

  return (
    <Container style={[styles.root, { backgroundColor }, style]} {...viewProps}>
      <StatusBar barStyle={statusBarStyle} backgroundColor={backgroundColor} />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: layout.contentMaxWidth,
    width: '100%',
  },
  padded: {
    paddingBottom: 40,
    paddingHorizontal: layout.screenPadding,
  },
  centered: {
    justifyContent: 'center',
  },
});
