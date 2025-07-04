import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native'
import React from 'react'
import AntDesign from 'react-native-vector-icons/AntDesign'
import Feather from 'react-native-vector-icons/Feather'

export default function ModalContainer({ children, openModal, width, height, title, header, onClose, headerIcon }) {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={openModal}
            onRequestClose={onClose}
        >
            <View style={{ width: '100%', height: '100%', backgroundColor: 'rgba(217,217,217,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <View style={[styles.modalView, { width: width ? width : '95%', height: height ? height : '50%' }]} >
                    {
                        header &&
                        <View style={styles.headerContainer}>
                            <View style={styles.headerContent}>
                                <View style={styles.filterIconContainer}>
                                    <Feather name='square' size={18} color='#fff' />
                                </View>
                                <Text style={styles.headerTitle}>{title}</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <AntDesign name='close' size={22} color='#fff' />
                            </TouchableOpacity>
                        </View>
                    }
                    <View style={styles.contentContainer}>
                        {children}
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    modalView: {
        marginHorizontal: 10,
        marginTop: '10%',
        margin: 1,
        backgroundColor: "white",
        borderRadius: 15,
        padding: 0,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: '85%',
        overflow: 'hidden'
    },
    headerContainer: {
        backgroundColor: '#2366CB',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        paddingVertical: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterIconContainer: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Cairo-Regular',
        color: '#FFFFFF',
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    contentContainer: {
        padding: 15,
    }
})