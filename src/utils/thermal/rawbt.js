import { Buffer } from 'buffer';
import { Alert, Linking } from 'react-native';

export const RAWBT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ru.a402d.rawbtprinter';

// RawBT recibe los bytes ESC/POS crudos por URL scheme, sin diálogo de impresión.
// No se usa `canOpenURL`: en Android moderno devuelve false aunque RawBT esté instalado.
export const buildRawBTUri = (bytes) => `rawbt:base64,${Buffer.from(bytes).toString('base64')}`;

// Devuelve true si el scheme pudo abrirse; ante error muestra la alerta con el enlace HTTPS.
export const sendToRawBT = async (bytes) => {
  try {
    await Linking.openURL(buildRawBTUri(bytes));
    return true;
  } catch (error) {
    Alert.alert(
      'RawBT no está instalado',
      `Instalá RawBT para imprimir en la térmica:\n${RAWBT_PLAY_STORE_URL}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Instalar',
          onPress: () => {
            Linking.openURL(RAWBT_PLAY_STORE_URL).catch(() => {});
          },
        },
      ],
    );
    return false;
  }
};
