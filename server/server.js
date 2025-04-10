require("dotenv").config();
const app = require("./app/app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
	console.log(`Backend server running on http://localhost:${PORT}`);
});
