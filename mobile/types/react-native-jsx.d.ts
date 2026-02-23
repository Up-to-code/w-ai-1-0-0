/**
 * Workaround for React 19 @types/react + React Native 0.81 TS2607 (props property).
 * RN components use intersection types that confuse TypeScript's JSX element class check.
 */
import type {
  ViewProps,
  TextProps,
  ScrollViewProps,
  TextInputProps,
  ActivityIndicatorProps,
  TouchableOpacityProps,
  ModalProps,
  KeyboardAvoidingViewProps,
  SafeAreaViewProps,
  FlatListProps,
  ImageProps,
} from 'react-native';

declare module 'react-native' {
  interface View {
    props: ViewProps;
  }
  interface Text {
    props: TextProps;
  }
  interface ScrollView {
    props: ScrollViewProps;
  }
  interface TextInput {
    props: TextInputProps;
  }
  interface ActivityIndicator {
    props: ActivityIndicatorProps;
  }
  interface TouchableOpacity {
    props: TouchableOpacityProps;
  }
  interface Modal {
    props: ModalProps;
  }
  interface KeyboardAvoidingView {
    props: KeyboardAvoidingViewProps;
  }
  interface SafeAreaView {
    props: SafeAreaViewProps;
  }
  interface FlatList<ItemT = any> {
    props: FlatListProps<ItemT>;
  }
  interface Image {
    props: ImageProps;
  }
}
