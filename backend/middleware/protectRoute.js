import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
	try {
		const token = req.cookies.jwt;
		if (!token) {
			return res.status(401).json({ error: "Unauthorized: No Token Provided" });
		}

		// A missing secret is a server misconfiguration, not a bad token:
		// jwt.verify would throw JsonWebTokenError for it, so check first
		// and keep that failure on the 500 path with a server-error log.
		if (!process.env.JWT_SECRET) {
			console.log("Error in protectRoute middleware: JWT_SECRET is not set");
			return res.status(500).json({ error: "Internal Server Error" });
		}

		// jwt.verify throws on an invalid or expired token instead of
		// returning a falsy value. A malformed payload also throws
		// (SyntaxError from JSON decoding), so handle verify errors
		// here, scoped to verification only, and let lookup errors
		// fall through to the 500 path below.
		let decoded;
		try {
			decoded = jwt.verify(token, process.env.JWT_SECRET);
		} catch (verifyErr) {
			if (
				verifyErr.name === "JsonWebTokenError" ||
				verifyErr.name === "TokenExpiredError" ||
				verifyErr.name === "NotBeforeError" ||
				verifyErr.name === "SyntaxError"
			) {
				return res.status(401).json({ error: "Unauthorized: Invalid Token" });
			}
			throw verifyErr;
		}

		const user = await User.findById(decoded.userId).select("-password");

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		req.user = user;
		next();
	} catch (err) {
		console.log("Error in protectRoute middleware", err.message);
		return res.status(500).json({ error: "Internal Server Error" });
	}
};
