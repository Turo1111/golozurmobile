import { MediaTypeOptions, launchImageLibraryAsync, useMediaLibraryPermissions } from "expo-image-picker";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Button from "./Button";

const ChooseFile = ({ onSuccess, onError }) => {
  const [image, setImage] = useState(null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button text="Selecciona una imagen" onPress={pickImage} width={'100%'} />
      {image && <Image source={{ uri: image }} style={{ width: 200, height: 250 }} />}
    </View>
  );
};

const styles = StyleSheet.create({
});

export default ChooseFile;
