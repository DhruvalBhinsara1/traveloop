import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
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
import { useStagedRefreshControl } from '../hooks/useStagedRefreshControl';

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
  const stagedRefresh = useStagedRefreshControl({
    enabled: Boolean(onRefresh),
    onMomentumScrollEnd: scrollProps?.onMomentumScrollEnd,
    onRefresh,
    onScroll: scrollProps?.onScroll,
    refreshing
  });
  const contentStyle = [
    styles.content,
    padded && styles.padded,
    centered && styles.centered,
    contentContainerStyle,
  ];

  const body = shouldScroll ? (
    <ScrollView
      {...scrollProps}
      alwaysBounceVertical={scrollProps?.alwaysBounceVertical ?? Boolean(onRefresh)}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.flex}
      contentContainerStyle={contentStyle}
      onMomentumScrollEnd={stagedRefresh.onMomentumScrollEnd}
      onScroll={stagedRefresh.onScroll}
      refreshControl={stagedRefresh.refreshControl ?? scrollProps?.refreshControl}
      scrollEventThrottle={scrollProps?.scrollEventThrottle ?? stagedRefresh.scrollEventThrottle}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={contentStyle}>{children}</View>
  );

  return (
    <Container style={[styles.root, safeArea && styles.androidStatusInset, { backgroundColor }, style]} {...viewProps}>
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
  androidStatusInset: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
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
