// app.config.js
import 'dotenv/config';

export default () => ({
    expo: {
        name: "Golozur",
        slug: "adm-golozur",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/iconogz.jpg",
        userInterfaceStyle: "light",
        splash: {
            image: "./assets/splash.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        plugins: [
            "expo-image-picker"
        ],
        assetBundlePatterns: ["**/*"],
        ios: {
            supportsTablet: true,
            config: {
                googleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY || process.env.GOOGLE_MAPS_API_KEY
            }
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            package: "com.turo1111.admgolozur",
            config: {
                googleMaps: {
                    apiKey: process.env.GOOGLE_MAPS_API_KEY
                }
            },
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
            DB_HOST: process.env.DB_HOST,
            JWT_SECRET: process.env.JWT_SECRET,
            // Mantener la configuración de EAS
            eas: {
                projectId: "cf336551-a449-4d6f-b10b-12ae0860653a"
            }
        },
        owner: "turo1111"
    }
});
