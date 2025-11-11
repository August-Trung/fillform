// Middleware xử lý lỗi toàn cục
const errorHandler = (err, req, res, next) => {
	const statusCode = err.statusCode || 500;
	if (err.stack) {
		console.error(err.stack);
	} else {
		console.error(err);
	}
	res.status(statusCode).json({
		error: err.message || "Internal Server Error",
	});
};

module.exports = errorHandler;
