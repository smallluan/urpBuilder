import * as echarts from 'echarts';
import { ChinaData } from 'china-map-geojson';

let mapRegistered = false;

export const ensureBuiltInChinaMap = () => {
  if (mapRegistered) {
    return;
  }

  const existing = echarts.getMap('china');
  if (!existing) {
    echarts.registerMap('china', ChinaData as any);
  }

  mapRegistered = true;
};

