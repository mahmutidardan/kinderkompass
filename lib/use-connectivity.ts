import { useNetInfo } from '@react-native-community/netinfo';

export function useConnectivity() {
  const network = useNetInfo();
  return network.isConnected;
}
