import axios from "axios";

const apiClient = axios.create({
  // URL para variable de entorno : https://apigolozur.onrender./com
  // URL para variable de entorno 2 : https://apigolozur.onrender./com
  //http://10.0.2.2:300/2
  baseURL: 'http://10.0.2.2:3002'
});

export default apiClient;