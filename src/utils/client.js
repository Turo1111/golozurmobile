import axios from "axios";

const apiClient = axios.create({
  // URL para variable de entorno
  baseURL: 'http://10.0.2.2:3002'
});

export default apiClient;