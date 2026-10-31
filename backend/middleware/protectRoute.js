import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
	try {
		const token = req.cookies.jwt;
		if (!token) {
			return res.status(401).json({ error: "Unauthorized: No Token Provided" });
		}

		// jwt.verify throws on an invalid or expired token instead of
		// returning a falsy value, so there is no `!decoded` case to handle
		// here; those failures are answered with 401 in the catch below.
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const user = await User.findById(decoded.userId).select("-password");

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		req.user = user;
		next();
	} catch (err) {
		// An invalid or expired token is an authentication failure, not a
		// server error: answer 401 so clients treat it as "log in again"
		// instead of a broken server.
		if (
			err.name === "JsonWebTokenError" ||
			err.name === "TokenExpiredError" ||
			err.name === "NotBeforeError"
		) {
			return res.status(401).json({ error: "Unauthorized: Invalid Token" });
		}
		console.log("Error in protectRoute middleware", err.message);
		return res.status(500).json({ error: "Internal Server Error" });
	}
};
