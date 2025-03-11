import io from 'socket.io-client';
import { useEffect, useState } from 'react';

const useInternetStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const socket = io('https://gzapi.vercel.app', { transports: ['websocket'] });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return isConnected;
};

export default useInternetStatus;
