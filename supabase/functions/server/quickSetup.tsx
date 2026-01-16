// Quick setup helper - creates sample assets with GPS coordinates
export async function quickSetup(supabase: any, userData: any, userProfile: any) {
  console.log(`Running quick setup for tenant: ${userProfile.tenant_id}`);

  // First, ensure asset types exist
  const assetTypes = [
    "Road Sign",
    "Guardrail",
    "Traffic Signal",
    "Gantry",
    "Fence",
    "Safety Barriers",
    "Guidepost",
    "Road Markings",
    "Raised Road Markers"
  ];

  const assetTypeIds: Record<string, string> = {};

  for (const typeName of assetTypes) {
    // Check if asset type exists
    const { data: existing } = await supabase
      .from('asset_types')
      .select('asset_type_id')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('name', typeName)
      .single();

    if (existing) {
      assetTypeIds[typeName] = existing.asset_type_id;
    } else {
      // Create asset type
      const { data: newType, error: typeError } = await supabase
        .from('asset_types')
        .insert({
          tenant_id: userProfile.tenant_id,
          name: typeName,
          description: `${typeName} asset type`,
          created_at: new Date().toISOString()
        })
        .select('asset_type_id')
        .single();

      if (!typeError && newType) {
        assetTypeIds[typeName] = newType.asset_type_id;
      }
    }
  }

  // Create sample assets around Pretoria, South Africa with GPS coordinates
  const sampleAssets = [
    { type: "Road Sign", lat: -25.7479, lng: 28.2293, road: "N1", name: "Speed Limit 80", region: "Gauteng" },
    { type: "Road Sign", lat: -25.7520, lng: 28.2350, road: "N1", name: "No Entry", region: "Gauteng" },
    { type: "Guardrail", lat: -25.7600, lng: 28.2400, road: "N1", name: "Highway Guardrail Section A", region: "Gauteng" },
    { type: "Guardrail", lat: -25.7650, lng: 28.2450, road: "N1", name: "Highway Guardrail Section B", region: "Gauteng" },
    { type: "Traffic Signal", lat: -25.7550, lng: 28.2320, road: "M1", name: "Church Street Intersection", region: "Gauteng" },
    { type: "Traffic Signal", lat: -25.7480, lng: 28.2400, road: "M2", name: "Pretorius Street Intersection", region: "Gauteng" },
    { type: "Gantry", lat: -25.7700, lng: 28.2500, road: "N1", name: "Highway Toll Gantry", region: "Gauteng" },
    { type: "Safety Barriers", lat: -25.7400, lng: 28.2250, road: "N4", name: "Bridge Safety Barrier", region: "Gauteng" },
    { type: "Guidepost", lat: -25.7580, lng: 28.2380, road: "R21", name: "Curve Warning Post", region: "Gauteng" },
    { type: "Road Markings", lat: -25.7500, lng: 28.2300, road: "M3", name: "Pedestrian Crossing", region: "Gauteng" },
  ];

  const createdAssets = [];
  let assetsCreated = 0;

  for (let i = 0; i < sampleAssets.length; i++) {
    const asset = sampleAssets[i];
    const assetRef = `ASSET-${String(i + 1).padStart(4, '0')}`;

    // Check if asset already exists
    const { data: existingAsset } = await supabase
      .from('assets')
      .select('asset_id')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('asset_ref', assetRef)
      .single();

    if (!existingAsset) {
      const { data: newAsset, error: assetError } = await supabase
        .from('assets')
        .insert({
          tenant_id: userProfile.tenant_id,
          asset_ref: assetRef,
          asset_type_id: assetTypeIds[asset.type],
          asset_name: asset.name,
          road_name: asset.road,
          road_number: asset.road,
          region: asset.region,
          gps_lat: asset.lat,
          gps_lng: asset.lng,
          status: 'Active',
          condition: 'Good',
          install_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          replacement_value: Math.floor(Math.random() * 50000) + 5000,
          useful_life_years: 15,
          created_by: userData.user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!assetError && newAsset) {
        createdAssets.push(newAsset);
        assetsCreated++;
      } else if (assetError) {
        console.error(`Error creating asset ${assetRef}:`, assetError);
      }
    }
  }

  return {
    success: true,
    message: `Quick setup complete! Created ${assetsCreated} sample assets with GPS coordinates.`,
    assetsCreated,
    assetTypesCreated: Object.keys(assetTypeIds).length,
    tenant_id: userProfile.tenant_id
  };
}
