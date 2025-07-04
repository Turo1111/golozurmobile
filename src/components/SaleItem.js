import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

const getInitials = (name) => {
    if (!name) return '?';
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
};

const SaleItem = ({
    item,
    isOffline = false,
    hasPermissionUpdateSale = false,
    onPress,
    onDownloadPDF,
    onGeneratePDF
}) => {
    return (
        <TouchableOpacity
            style={styles.saleCard}
            key={item._id || Math.random()}
            onPress={onPress}
            disabled={isOffline}
        >
            <View style={styles.saleCardHeader}>
                <View style={styles.clientInfoContainer}>
                    <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>{getInitials(item.cliente)}</Text>
                    </View>
                    <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{item.cliente}</Text>
                        {/* <Text style={styles.clientTag}>Cliente frecuente</Text> DESPUES AGREGAR AQUI LA CIUDAD */}
                    </View>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.salePrice}>${item.total.toFixed(2)}</Text>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{item.estado || 'No definido'}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.saleCardFooter}>
                <View style={styles.saleDetails}>
                    {!isOffline ? (
                        <>
                            <View style={styles.saleDetailItem}>
                                <Icon name="clock" size={12} color="#757575" style={{ marginRight: 4 }} />
                                <Text style={styles.saleDetailText}>
                                    {new Date(item.createdAt).toLocaleString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    }) || "14:30"}
                                </Text>
                            </View>
                            <View style={styles.saleDetailItem}>
                                <Icon name="shopping-bag" size={12} color="#757575" style={{ marginRight: 4 }} />
                                <Text style={styles.saleDetailText}>{item.itemsLength || 0} productos</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.saleDetailItem}>
                            <Icon name="shopping-bag" size={12} color="#757575" style={{ marginRight: 4 }} />
                            <Text style={styles.saleDetailText}>{item.itemsSale?.length || 0} productos</Text>
                        </View>
                    )}
                </View>

                {hasPermissionUpdateSale && (
                    isOffline ? (
                        <TouchableOpacity
                            style={styles.offlinePrintButton}
                            onPress={onGeneratePDF}
                        >
                            <Icon name="printer" size={16} color="#fff" />
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onDownloadPDF}
                            >
                                <Icon name="file-text" size={16} color="#f97316" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={onGeneratePDF}
                            >
                                <Icon name="printer" size={16} color="#3b82f6" />
                            </TouchableOpacity>
                        </View>
                    )
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    saleCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    saleCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    clientInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    clientAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    clientAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#252525',
    },
    clientTag: {
        fontSize: 12,
        color: '#757575',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    salePrice: {
        fontSize: 16,
        fontWeight: '700',
        color: '#16a34a',
    },
    statusBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginTop: 4,
    },
    statusText: {
        color: '#16a34a',
        fontSize: 10,
        fontWeight: '600',
    },
    saleCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    saleDetails: {
        flexDirection: 'row',
    },
    saleDetailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 15,
    },
    saleDetailText: {
        fontSize: 12,
        color: '#757575',
    },
    actionButtons: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    offlinePrintButton: {
        backgroundColor: '#3b82f6',
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default SaleItem; 