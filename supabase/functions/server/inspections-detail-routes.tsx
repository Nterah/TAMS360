// This content should be added to /supabase/functions/server/index.tsx after the GET /inspections/stats route (around line 1796)

// Get single inspection by ID
app.get("/make-server-c894a9ff/inspections/:id", async (c) => {
  try {
    const inspectionId = c.req.param("id");

    const { data: inspection, error } = await supabase
      .from("tams360_inspections_v")
      .select("*")
      .eq("inspection_id", inspectionId)
      .single();

    if (error) {
      console.error("Error fetching inspection:", error);
      // Fallback to KV
      const kvInspection = await kv.get(`inspection:${inspectionId}`);
      if (!kvInspection) {
        return c.json({ error: "Inspection not found" }, 404);
      }
      return c.json({ inspection: kvInspection });
    }

    return c.json({ inspection });
  } catch (error) {
    console.error("Error fetching inspection:", error);
    return c.json({ error: "Failed to fetch inspection" }, 500);
  }
});

// Update inspection
app.put("/make-server-c894a9ff/inspections/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const accessToken = authHeader.split(" ")[1];
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(
      accessToken,
    );

    if (authError || !userData.user) {
      return c.json({ error: "Invalid session" }, 401);
    }

    const inspectionId = c.req.param("id");
    const inspection = await c.req.json();

    // Prepare calculation metadata
    const calculationMetadata = {
      ci_health: inspection.conditional_index,
      ci_safety: inspection.ci_safety,
      ci_final: inspection.ci_final,
      degree: inspection.degree,
      extent: inspection.extent,
      relevancy: inspection.relevancy,
      worst_urgency: inspection.calculated_urgency,
      component_count: inspection.component_scores?.length || 0,
    };

    // Determine CI band
    const ciBand = inspection.ci_final
      ? inspection.ci_final >= 75
        ? "Excellent"
        : inspection.ci_final >= 50
        ? "Good"
        : inspection.ci_final >= 25
        ? "Fair"
        : "Poor"
      : null;

    // Update inspection record
    const { data: inspectionRecord, error: inspectionError } = await supabase
      .from("inspections")
      .update({
        asset_id: inspection.asset_id,
        inspection_date: inspection.inspection_date,
        inspector_name: inspection.inspector_name,
        weather_conditions: inspection.weather_conditions,
        conditional_index: inspection.ci_final || inspection.conditional_index,
        calculated_urgency: inspection.calculated_urgency,
        total_remedial_cost: inspection.total_remedial_cost || 0,
        ci_band: ciBand,
        calculation_metadata: calculationMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("inspection_id", inspectionId)
      .select()
      .single();

    if (inspectionError) {
      console.error("Error updating inspection:", inspectionError);
      return c.json({ error: "Failed to update inspection" }, 500);
    }

    // Delete existing component scores
    const { error: deleteError } = await supabase
      .from("inspection_component_scores")
      .delete()
      .eq("inspection_id", inspectionId);

    if (deleteError) {
      console.error("Error deleting old component scores:", deleteError);
    }

    // Insert updated component scores
    if (inspection.component_scores && inspection.component_scores.length > 0) {
      const componentScores = inspection.component_scores.map((score: any) => ({
        inspection_id: inspectionId,
        component_name: score.component_name,
        degree: score.degree,
        extent: score.extent,
        relevancy: score.relevancy,
        urgency: score.urgency,
        conditional_index: score.conditional_index,
        quantity: score.quantity,
        unit: score.unit,
        remedial_work: score.remedial_work,
        rate: score.rate,
        cost: score.cost,
        comments: score.comments,
        photo_url: score.photo_url,
      }));

      const { error: scoresError } = await supabase
        .from("inspection_component_scores")
        .insert(componentScores);

      if (scoresError) {
        console.error("Error inserting updated component scores:", scoresError);
      }
    }

    return c.json({ success: true, inspection: inspectionRecord });
  } catch (error) {
    console.error("Error updating inspection:", error);
    return c.json({ error: "Failed to update inspection" }, 500);
  }
});

// Delete inspection
app.delete("/make-server-c894a9ff/inspections/:id", async (c) => {
  try {
    const inspectionId = c.req.param("id");

    // Delete component scores first (foreign key constraint)
    const { error: componentError } = await supabase
      .from("inspection_component_scores")
      .delete()
      .eq("inspection_id", inspectionId);

    if (componentError) {
      console.error("Error deleting component scores:", componentError);
    }

    // Delete inspection
    const { error } = await supabase
      .from("inspections")
      .delete()
      .eq("inspection_id", inspectionId);

    if (error) {
      console.error("Error deleting inspection:", error);
      // Try KV fallback
      await kv.del(`inspection:${inspectionId}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting inspection:", error);
    return c.json({ error: "Failed to delete inspection" }, 500);
  }
});