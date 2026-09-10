// react-native-webview 14.x + @types/react (React 19) інколи згортає пропси в JSX
// у `never` без явного generic-параметра. Обгортаємо тут один раз замість
// `as unknown as ...` по коду — на рантайм не впливає, лише на тайпчек.
import type React from 'react';
import { WebView as RNWebView } from 'react-native-webview';

export const WebView = RNWebView as unknown as React.ComponentType<any>;
export type { WebViewNavigation } from 'react-native-webview';
