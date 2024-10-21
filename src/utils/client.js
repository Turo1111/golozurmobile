import axios from "axios";

const apiClient = axios.create({
  // URL para variable de entorno : https://apigolozur.onrender./com
  //http://10.0.2.2:300/2
  baseURL: 'https://apigolozur.onrender.com'
});

export default apiClient;