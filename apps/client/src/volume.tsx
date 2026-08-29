import { createContext, useContext } from 'react';

export const VolumeContext = createContext(1);
export const useVolume = () => useContext(VolumeContext);
