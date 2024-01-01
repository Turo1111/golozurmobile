import axios from "axios";

const apiClient = axios.create({
  // URL para variable de entorno
  baseURL: 'https://apigolozur.onrender.com'


});

export default apiClient;