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
import InfoStorage from '../screens/InfoStorage';

const Stack = createNativeStackNavigator();

export default function NavigationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name='Login' component={Login} options={{ headerShown: false }} />
      <Stack.Screen name='Home' component={Home} options={{ headerShown: false }} />
      <Stack.Screen name='Product' component={Product} options={{ headerShown: false }} />
      <Stack.Screen name='Sale' component={Sale} options={{ headerShown: false }} />
      <Stack.Screen name='NewSale' component={NewSale} options={{ headerShown: false }} />
      <Stack.Screen name='NewProduct' component={NewProduct} options={{ headerShown: false }} />
      <Stack.Screen name='EditProduct' component={EditProduct} options={{ headerShown: false }} />
      <Stack.Screen name='DetailsProduct' component={DetailsProduct} options={{ headerShown: false }} />
      <Stack.Screen name='DetailsSale' component={DetailsSale} options={{ headerShown: false }} />
      <Stack.Screen name='Users' component={Users} options={{ headerShown: false }} />
      <Stack.Screen name='NewUser' component={NewUser} options={{ headerShown: false }} />
      <Stack.Screen name='Roles' component={Roles} options={{ headerShown: false }} />
      <Stack.Screen name='NewRole' component={NewRole} options={{ headerShown: false }} />
      {/* <Stack.Screen name='DetailsRole' component={DetailsRole} options={({ route }) => ({ title: route.params.name })} /> */}
      <Stack.Screen name='EditRole' component={EditRole} options={{ headerShown: false }} />
      <Stack.Screen name='EditUser' component={EditUser} options={{ headerShown: false }} />
      <Stack.Screen name='Client' component={Client} options={{ headerShown: false }} />
      <Stack.Screen name='NewClient' component={NewClient} options={{ headerShown: false }} />
      <Stack.Screen name='EditClient' component={EditClient} options={{ headerShown: false }} />
      <Stack.Screen name='InfoStorage' component={InfoStorage} options={{ headerShown: false }} />
    </Stack.Navigator>
  )
}