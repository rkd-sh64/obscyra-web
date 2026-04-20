// components/LayoutHeader.tsx

import { useAuth } from '@/context/AuthContext';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const LayoutHeader = () => {
	const { user, setUser } = useAuth();
	const navigate = useNavigate();

	const [hasScrolled, setHasScrolled] = useState(false);


	// ✅ Optimized scroll handling (no lag)
	useEffect(() => {
		let ticking = false;

		const handleScroll = () => {
			if (!ticking) {
				window.requestAnimationFrame(() => {
					const scrolled = window.scrollY > 32;

					setHasScrolled((prev) => {
						if (prev !== scrolled) return scrolled;
						return prev;
					});

					ticking = false;
				});
				ticking = true;
			}
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);


	// ✅ Logout
	const handleLogout = async () => {
		try {
			await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/v1/logout`,
				{},
				{ withCredentials: true }
			);
			setUser(null);
			toast.success('Logged out successfully');
			navigate('/');
		} catch (error) {
			console.error('Logout error:', error);
			toast.error('Failed to logout');
		}
	};


	return (
		<header
			className={`
				fixed top-0 left-0 z-50 w-full transition-all  
				${
					hasScrolled
						? ' backdrop-blur-md  py-1'
						: 'bg-transparent py-1'
				}
			`}
		>
			<div className="container mx-auto px-6 flex items-center justify-between max-lg:px-4">
				{/* LEFT - LOGO */}
				<Link
					to="/"
					className="cursor-pointer flex items-center gap-2 hover:opacity-80 transition-opacity"
				>
					<img
						src="/images/obscyra.png"
						width={200}
						height={200}
						alt="logo"
						className="max-lg:w-[180px]"
					/>
				</Link>

				{/* RIGHT - USER */}
				<div className="flex items-center gap-4">
					{user ? (
						<>
							{/* Avatar */}
							<div className="relative">
							<div
	className={`
		w-10 h-10 rounded-full overflow-hidden
		shadow-lg ring-2 ring-s4/25
		transition-all duration-300 hover:scale-105
		bg-slate-800
	`}
>
	<img
		src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user?.email || user?.username || 'guest'}`}
		alt="avatar"
		className="w-full h-full object-cover"
	/>
</div>
							</div>

							{/* Username */}
							<div className="hidden md:block">
								<p className="text-p4 font-medium text-sm">
									{user.username || user.email?.split('@')[0]}
								</p>
							</div>

							{/* Logout */}
							<button
								onClick={handleLogout}
								className="
									flex items-center gap-2 px-4 py-2 rounded-full
									bg-red-500/10 hover:bg-red-500/20
									border border-red-500/30 hover:border-red-500/50
									text-red-400 hover:text-red-300
									transition-all duration-300 text-sm font-medium
									hover:scale-105 active:scale-95
								"
							>
								<LogOut size={16} />
								<span className="hidden sm:inline">Logout</span>
							</button>
						</>
					) : (
						<button
							onClick={() => navigate('/login')}
							className="
								text-p4 uppercase transition-colors duration-300 
								hover:text-p1 border-2 border-s4/25 rounded-full px-6 py-2 
								bg-s3/10 backdrop-blur-sm hover:bg-p1/10
							"
						>
							Login
						</button>
					)}
				</div>
			</div>
		</header>
	);
};

export default LayoutHeader;