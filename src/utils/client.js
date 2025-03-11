import axios from "axios";

const apiClient = axios.create({
  baseURL: 'https://gzapi.vercel.app'
});

export default apiClient;