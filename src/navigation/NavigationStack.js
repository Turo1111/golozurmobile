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

const Stack = createNativeStackNavigator();

export default function NavigationStack() {
  return (
    <Stack.Navigator>
        <Stack.Screen name='Login' component={Login}  options={{headerShown: false}}/>
        <Stack.Screen name='Home' component={Home} options={{headerShown: false}}/>
        <Stack.Screen name='Product' component={Product} options={{headerShown: true, title: 'Productos'}}/>
        <Stack.Screen name='Sale' component={Sale} options={{headerShown: true, title: 'Ventas'}}/>
        <Stack.Screen name='NewSale' component={NewSale} options={{headerShown: true, title: 'Nueva Venta'}}/>
        <Stack.Screen name='NewProduct' component={NewProduct} options={{headerShown: true, title: 'Nuevo Producto'}}/>
        <Stack.Screen name='EditProduct' component={EditProduct} options={{headerShown: true, title: 'Editar Producto'}}/>
        <Stack.Screen name='DetailsProduct' component={DetailsProduct} options={({ route }) => ({ title: route.params.name })}/>
        <Stack.Screen name='DetailsSale' component={DetailsSale} options={({ route }) => ({ title: route.params.name })}/>
    </Stack.Navigator>
  )
}