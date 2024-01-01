import { StyleSheet, Text, View } from "react-native";
import { clearAlert, getAlert } from "../redux/alertSlice";
import { useAppDispatch, useAppSelector } from "../redux/hook";
import { useEffect } from "react";

export default function Alert() {

    const alert = useAppSelector(getAlert);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (alert.open) {
          const timeout = setTimeout(() => {
            dispatch(clearAlert());
          }, 3000); // Tiempo en milisegundos antes de ejecutar clearAlert
          
          return () => clearTimeout(timeout);
        } 
    }, [alert.open, dispatch]);

  return (
        <View style={[
            styles.container,
            {
                display: alert.open ? 'block' : 'none',
                backgroundColor:  alert.color ? alert.color : '#F7A4A4'
            }
        ]} >
            <Text style={{ fontWeight: "bold", color: '#fff' }}>{alert.message || 'Esto es una alerta'}</Text>
        </View>
    )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    position: 'absolute',
    borderRadius: 15,
    color: '#F9F5F6',
    textAlign: 'center',
    marginTop: 50,
    zIndex: 100,
    left: '15%'
  },
});