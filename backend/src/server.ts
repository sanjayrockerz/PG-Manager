import { app } from "./app.js";

const PORT = Number(process.env.BACKEND_PORT || 4000);

app.listen(PORT, () => {
  console.log(`Backend API running at http://localhost:${PORT}/api/v1`);
});
