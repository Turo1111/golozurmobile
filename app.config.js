// app.config.js
import 'dotenv/config';

export default () => ({
    expo: {
        name: "golozurapp2",
        slug: "adm-golozur",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        plugins: ["expo-image-picker"],
        assetBundlePatterns: ["**/*"],
        ios: {
            supportsTablet: true
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            package: "com.turo1111.admgolozur",
            permissions: [
                "android.permission.RECEIVE_BOOT_COMPLETED",
                "android.permission.FOREGROUND_SERVICE",
                "android.permission.INTERNET",
                "android.permission.ACCESS_NETWORK_STATE"
            ]
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        extra: {
            // Variables de entorno personalizadas
            API_URL: process.env.API_URL,
            GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY,
            // Mantener la configuración de EAS
            eas: {
                projectId: "cf336551-a449-4d6f-b10b-12ae0860653a"
            }
        },
        owner: "turo1111"
    }
});
