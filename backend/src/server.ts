import dotenv from "dotenv";
dotenv.config();

import { app } from "./setup/app";

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
