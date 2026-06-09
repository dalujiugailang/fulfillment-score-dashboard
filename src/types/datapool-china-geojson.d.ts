declare module '@datapool/china.geojson' {
  const geoJson: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: {
        name: string;
        center?: [number, number];
        centroid?: [number, number];
      };
      geometry: unknown;
    }>;
  };

  export default geoJson;
}
