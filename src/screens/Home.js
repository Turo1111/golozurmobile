import { Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import React, { useContext, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hook';
import { clearUser, getUser } from '../redux/userSlice';
import useLocalStorage from '../hooks/useLocalStorage';
import { OfflineContext } from '../context.js/contextOffline';
import usePermissionCheck from '../hooks/usePermissionCheck';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function Home({ navigation }) {
  const user = useAppSelector(getUser);
  const dispatch = useAppDispatch();
  const { data: userLocalStorage, clearData } = useLocalStorage([], 'user');
  const { offline, setModeOffline, sales, isOffline } = useContext(OfflineContext);

  /* console.log("offline home", offline) */

  const logOut = async () => {
    try {
      await clearData();
      await dispatch(clearUser());
    } catch (error) {
      console.error(error);
    }
    navigation.goBack();
  };

  const { hasPermission: hasPermissionProduct } = usePermissionCheck('read_product', () => { });
  const { hasPermission: hasPermissionSale } = usePermissionCheck('read_sale', () => { });
  const { hasPermission: hasPermissionCreateSale } = usePermissionCheck('create_sale', () => { });
  const { hasPermission: hasPermissionUser } = usePermissionCheck('read_user', () => { });
  const { hasPermission: hasPermissionRole } = usePermissionCheck('read_role', () => { });
  const { hasPermission: hasPermissionClient } = usePermissionCheck('read_client', () => { });


  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#6e8c47', '#3b5998']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Icon name="store" size={24} color="#6e8c47" style={styles.logoIcon} />
            <View>
              <Text style={styles.logoTitle}>Golozur</Text>
              <Text style={styles.logoSubtitle}>Sistema de Gestión</Text>
            </View>
          </View>
          <Pressable onPress={logOut} style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 50, padding: 5, paddingLeft: 8 }}>
            <Icon name="logout" size={24} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>¡Bienvenido!</Text>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.welcomeUser}>{userLocalStorage?.nickname || 'Carlos Mendoza'}</Text>
              <Text style={styles.dateText}>{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
            </View>
            <Text style={styles.welcomeRole}>{userLocalStorage?.nameRole || 'Administrador'}</Text>
          </View>

        </View>

        <Pressable onPress={setModeOffline}>
          {offline ? (
            <View style={styles.offlineBanner}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.redDot} />
                  <Text style={styles.offlineBannerText}>Sin conexión</Text>
                </View>
                <Text style={styles.offlineBannerSubtitle}>Trabajando en modo offline</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="wifi-off" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.offlineStatusText}>Offline</Text>
              </View>
            </View>
          ) : (
            <View style={styles.onlineBanner}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.greenDot} />
                  <Text style={styles.onlineBannerText}>Conectado</Text>
                </View>
                <Text style={styles.onlineBannerSubtitle}>Todos los datos están sincronizados</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="wifi" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.onlineStatusText}>Online</Text>
              </View>
            </View>
          )}
        </Pressable>

        {sales.length > 0 && (
          <View style={styles.alertBanner}>
            <Icon name="alert-outline" size={24} color="#f5a623" />
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>Ventas pendientes</Text>
              <Text style={styles.alertSubtitle}>Tienes {sales.length} ventas sin sincronizar. Conecta a internet para guardarlas.</Text>
            </View>
          </View>
        )}

        {/* <View style={styles.kpiContainer}>
          <View style={styles.kpiCard}>
            <View style={{ backgroundColor: 'rgba(59, 89, 152, 0.3)', borderRadius: 8, padding: 10, marginRight: 5, marginTop: 8 }}>
              <Icon name="chart-line" size={24} color="#3b5998" />
            </View>
            <View>
              <Text style={styles.kpiTitle}>Ventas Hoy</Text>
              <Text style={styles.kpiValue}>15</Text>
            </View>
          </View>
          <View style={styles.kpiCard}>
            <View style={{ backgroundColor: 'rgba(245, 166, 35, 0.3)', borderRadius: 8, padding: 10, marginRight: 5, marginTop: 8 }}>
              <Icon name="trending-up" size={24} color="#f5a623" />
            </View>
            <View>
              <Text style={styles.kpiTitle}>Ganancias Hoy</Text>
              <Text style={styles.kpiValue}>$1,280</Text>
            </View>
          </View>
        </View> */}

        <Text style={styles.sectionTitle}>Módulos Principales</Text>
        <View style={styles.modulesGrid}>
          {hasPermissionProduct && <ModuleCard icon="cube-outline" color="#f5a623" title="PRODUCTOS" subtitle="Gestionar inventario" onPress={() => navigation.navigate('Product')} />}
          {hasPermissionSale && <ModuleCard icon="cart-outline" color="#3b5998" title="VENTAS" subtitle="Procesar pedidos" onPress={() => navigation.navigate('Sale')} />}
          {hasPermissionUser && <ModuleCard icon="account-group-outline" color="#6e8c47" title="USUARIOS" subtitle="Administrar equipo" onPress={() => navigation.navigate('Users')} />}
          {hasPermissionRole && <ModuleCard icon="lock-outline" color="#8e44ad" title="ROLES" subtitle="Permisos y accesos" onPress={() => navigation.navigate('Roles')} />}
          {hasPermissionClient && <ModuleCard icon="account-multiple-outline" color="#e74c3c" title="CLIENTES" subtitle="Administrar clientes" onPress={() => navigation.navigate('Client')} />}
        </View>

        <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
        {hasPermissionCreateSale && (
          <Pressable style={styles.quickActionPrimary} onPress={() => navigation.navigate('NewSale')}>
            <Icon name="plus" size={24} color="#fff" />
            <Text style={styles.quickActionPrimaryText}>Nueva Venta</Text>
            <Icon name="arrow-right" size={24} color="#fff" />
          </Pressable>
        )}
        {/* {hasPermissionProduct && (
          <Pressable style={styles.quickActionSecondary}>
            <Icon name="magnify" size={24} color="#333" />
            <Text style={styles.quickActionSecondaryText}>Buscar Producto</Text>
            <Icon name="arrow-right" size={24} color="#333" />
          </Pressable>
        )} */}
      </View>
    </ScrollView>
  );
}

const ModuleCard = ({ icon, color, title, subtitle, onPress }) => (
  <Pressable style={styles.moduleCard} onPress={onPress}>
    <View style={[styles.moduleIconContainer, { backgroundColor: `${color}20` }]}>
      <Icon name={icon} size={30} color={color} />
    </View>
    <Text style={styles.moduleTitle}>{title}</Text>
    <Text style={styles.moduleSubtitle}>{subtitle}</Text>
    <Text style={styles.moduleDots}>...</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 8,
    marginRight: 10,
  },
  logoTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
  },
  logoSubtitle: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Cairo-Regular',
  },
  content: {
    padding: 20,
  },
  welcomeSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  welcomeUser: {
    fontSize: 16,
    fontFamily: 'Cairo-Regular',
    color: '#666',
  },
  welcomeRole: {
    fontSize: 14,
    fontFamily: 'Cairo-Light',
    color: '#888',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Cairo-Regular',
    color: '#666',
    fontWeight: 'bold',
  },
  onlineBanner: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greenDot: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginRight: 8,
  },
  onlineBannerText: {
    color: '#fff',
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
  },
  onlineBannerSubtitle: {
    color: '#fff',
    fontFamily: 'Cairo-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  onlineStatusText: {
    color: '#fff',
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
  },
  offlineBanner: {
    backgroundColor: '#d9534f',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  redDot: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    marginRight: 8,
  },
  offlineBannerText: {
    color: '#fff',
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
  },
  offlineBannerSubtitle: {
    color: '#fff',
    fontFamily: 'Cairo-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  offlineStatusText: {
    color: '#fff',
    fontFamily: 'Cairo-Regular',
    fontSize: 14,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiCard: {
    backgroundColor: 'red',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    width: '48%',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  kpiTitle: {
    fontFamily: 'Cairo-Regular',
    color: '#666',
    marginTop: 5,
  },
  kpiValue: {
    fontFamily: 'Cairo-Bold',
    color: '#333',
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Cairo-Bold',
    color: '#333',
    marginBottom: 15,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moduleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  moduleIconContainer: {
    borderRadius: 50,
    padding: 15,
    marginBottom: 10,
  },
  moduleTitle: {
    fontFamily: 'Cairo-Bold',
    color: '#333',
    fontSize: 14,
  },
  moduleSubtitle: {
    fontFamily: 'Cairo-Regular',
    color: '#888',
    fontSize: 12,
  },
  moduleDots: {
    fontFamily: 'Cairo-Bold',
    color: '#ccc',
    fontSize: 18,
    marginTop: 5,
  },
  alertBanner: {
    backgroundColor: '#fffbe6',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderColor: '#f5a623',
    borderWidth: 1,
  },
  alertTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  alertTitle: {
    fontFamily: 'Cairo-Bold',
    color: '#333',
  },
  alertSubtitle: {
    fontFamily: 'Cairo-Regular',
    color: '#666',
    fontSize: 12,
  },
  quickActionPrimary: {
    backgroundColor: '#3b5998',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionPrimaryText: {
    color: '#fff',
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
  },
  quickActionSecondary: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  quickActionSecondaryText: {
    color: '#333',
    fontFamily: 'Cairo-Bold',
    fontSize: 16,
  },
});

