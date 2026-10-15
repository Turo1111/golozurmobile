import { StyleSheet, Text, View, Modal, Pressable } from "react-native";
import { clearAlert, getAlert, getBlockingAlert, dismissBlockingAlert } from "../redux/alertSlice";
import { useAppDispatch, useAppSelector } from "../redux/hook";
import { useEffect } from "react";

export default function Alert() {

    const alert = useAppSelector(getAlert);
    const blocking = useAppSelector(getBlockingAlert);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (alert.open) {
          const timeout = setTimeout(() => {
            dispatch(clearAlert(alert.id));
          }, 3000); // Tiempo en milisegundos antes de ejecutar clearAlert
          
          return () => clearTimeout(timeout);
        } 
    }, [alert.open, alert.id, dispatch]);

  return (
        <>
        <View style={[
            styles.container,
            {
                display: alert.open ? 'block' : 'none',
                backgroundColor:  alert.color ? alert.color : '#F7A4A4'
            }
        ]} >
            <Text style={{ fontWeight: "bold", color: '#fff' }}>{alert.message || 'Esto es una alerta'}</Text>
        </View>
        <Modal transparent visible={!!blocking} onRequestClose={() => {}}>
            <View style={styles.blockingBackdrop}>
                <View style={[styles.blockingNotice, { backgroundColor: blocking?.color }]}>
                    {!!blocking?.title && <Text style={{ fontWeight: 'bold', color: '#fff' }}>{blocking.title}</Text>}
                    <Text style={{ fontWeight: 'bold', color: '#fff' }}>{blocking?.message}</Text>
                    <Pressable accessibilityRole="button" onPress={() => dispatch(dismissBlockingAlert(blocking?.id))}>
                        <Text style={{ fontWeight: 'bold', color: '#fff', paddingTop: 15 }}>Aceptar</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
        </>
    )
}


const styles = StyleSheet.create({
  blockingBackdrop: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: 'rgba(0,0,0,0.35)' },
  blockingNotice: { padding: 15, borderRadius: 15 },
  container: {
    flex: 1,
    padding: 15,
    position: 'absolute',
    borderRadius: 15,
    color: '#F9F5F6',
    textAlign: 'center',
    marginTop: 50,
    zIndex: 105,
    left: '15%'
  },
});
