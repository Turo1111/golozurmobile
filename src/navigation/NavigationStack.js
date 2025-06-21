import React from 'react'
import Login from '../screens/Login';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from '../screens/Home';
import Product from '../screens/Product';
import DetailsProduct from '../screens/DetailsProduct';
import NewProduct from '../screens/NewProduct';
import EditProduct from '../screens/EditProduct';
import Sale from '../screens/Sale';
import DetailsSale from '../screens/DetailsSale';
import NewSale from '../screens/NewSale';
import Users from '../screens/Users';
import NewUser from '../screens/NewUser';
import Roles from '../screens/Roles';
import NewRole from '../screens/NewRole';
import DetailsRole from '../screens/DetailsRole';
import EditRole from '../screens/EditRole';
import EditUser from '../screens/EditUser';
import Client from '../screens/Client';
import NewClient from '../screens/NewClient';
import EditClient from '../screens/EditClient';

const Stack = createNativeStackNavigator();

export default function NavigationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name='Login' component={Login} options={{ headerShown: false }} />
      <Stack.Screen name='Home' component={Home} options={{ headerShown: false }} />
      <Stack.Screen name='Product' component={Product} options={{ headerShown: true, title: 'Productos' }} />
      <Stack.Screen name='Sale' component={Sale} options={{ headerShown: true, title: 'Ventas' }} />
      <Stack.Screen name='NewSale' component={NewSale} options={{ headerShown: true, title: 'Nueva Venta' }} />
      <Stack.Screen name='NewProduct' component={NewProduct} options={{ headerShown: true, title: 'Nuevo Producto' }} />
      <Stack.Screen name='EditProduct' component={EditProduct} options={{ headerShown: true, title: 'Editar Producto' }} />
      <Stack.Screen name='DetailsProduct' component={DetailsProduct} options={({ route }) => ({ title: route.params.name })} />
      <Stack.Screen name='DetailsSale' component={DetailsSale} options={({ route }) => ({ title: route.params.name })} />
      <Stack.Screen name='Users' component={Users} options={{ headerShown: true, title: 'Usuarios' }} />
      <Stack.Screen name='NewUser' component={NewUser} options={{ headerShown: true, title: 'Nuevo Usuario' }} />
      <Stack.Screen name='Roles' component={Roles} options={{ headerShown: true, title: 'Roles' }} />
      <Stack.Screen name='NewRole' component={NewRole} options={{ headerShown: true, title: 'Nuevo Rol' }} />
      <Stack.Screen name='DetailsRole' component={DetailsRole} options={({ route }) => ({ title: route.params.name })} />
      <Stack.Screen name='EditRole' component={EditRole} options={({ route }) => ({ title: `Editar ${route.params.name}` })} />
      <Stack.Screen name='EditUser' component={EditUser} options={({ route }) => ({ title: `Editar ${route.params.name}` })} />
      <Stack.Screen name='Client' component={Client} options={{ headerShown: true, title: 'Clientes' }} />
      <Stack.Screen name='NewClient' component={NewClient} options={{ headerShown: true, title: 'Nuevo Cliente' }} />
      <Stack.Screen name='EditClient' component={EditClient} options={({ route }) => ({ title: `Editar ${route.params.name}` })} />
    </Stack.Navigator>
  )
}