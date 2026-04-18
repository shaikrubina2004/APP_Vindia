exports.updateDrawingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const drawing = await Drawing.findById(id);

    if (!drawing) {
      return res.status(404).json({ message: "Drawing not found" });
    }

    // 🔥 UPDATE ONLY THAT ROLE
    drawing.status[role] = status;

    await drawing.save();

    res.json({ message: "Status updated", drawing });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};