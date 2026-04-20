const Loader = () => {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-md z-50">
			<div className="relative flex items-center justify-center">
				{/* Glow Ring */}
				<div className="absolute w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 blur-xl opacity-40"></div>

				{/* Spinner */}
				<div className="h-12 w-12 rounded-full border-4 border-transparent border-t-purple-500 border-r-blue-500 animate-spin"></div>
			</div>
		</div>
	);
};

export default Loader;