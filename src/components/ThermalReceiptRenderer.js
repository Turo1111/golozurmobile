import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { rasterBridge, RASTER_RENDERER_HTML } from '../utils/thermal/rasterRenderer';
import { cancelActivePrint, subscribePrintJob } from '../utils/thermal/printJob';

const source = { html: RASTER_RENDERER_HTML, baseUrl: 'about:blank' };

export default function ThermalReceiptRenderer() {
  const webView = useRef(null);
  const [job, setJob] = useState(null);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const detach = rasterBridge.attach((script) => {
      if (!webView.current) throw new Error('Receipt WebView is not mounted');
      webView.current.injectJavaScript(script);
    });
    const unsubscribe = subscribePrintJob(setJob);
    return () => { cancelActivePrint(); unsubscribe(); detach(); };
  }, []);
  if (Platform.OS !== 'android') return null;
  return (
    <>
      <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={styles.hidden}>
        <WebView
          ref={webView}
          source={source}
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
          onOpenWindow={() => rasterBridge.fail()}
          onMessage={(event) => rasterBridge.receive(event.nativeEvent.data)}
          onError={() => rasterBridge.fail()}
          onRenderProcessGone={() => rasterBridge.fail()}
          onLoadStart={() => rasterBridge.fail()}
          onLoadEnd={() => webView.current?.injectJavaScript('if (window.__renderReceipt) window.ReactNativeWebView.postMessage(JSON.stringify({type:"ready"})); true;')}
          javaScriptEnabled
          domStorageEnabled={false}
          cacheEnabled={false}
          incognito
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          mixedContentMode="never"
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows
          webviewDebuggingEnabled={false}
          style={styles.webView}
        />
      </View>
      <Modal transparent visible={job?.profile === 'mxw01'} onRequestClose={cancelActivePrint}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <ActivityIndicator size="large" />
            <Text style={styles.title}>Imprimiendo ticket</Text>
            <Text>Mantenga Golozur abierto y espere a que finalice la impresión.</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancelar impresión" onPress={cancelActivePrint} style={styles.cancel}>
              <Text>Cancelar impresión</Text>
            </TouchableOpacity>
            <Text>La cancelación puede dejar el ticket incompleto. Revise el papel antes de volver a intentarlo.</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  webView: { width: 1, height: 1 },
  backdrop: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  dialog: { padding: 24, gap: 16, backgroundColor: '#fff', borderRadius: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  cancel: { padding: 12, alignItems: 'center', borderWidth: 1, borderRadius: 8 },
});
