import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { deriveMasterKey, deriveAuthToken, unwrapPrivateKey, exportKey } from '@/crypto/keys';
import { loginSchema } from '@/schema/auth';
import type { LogInFormFields } from '@/types/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import { User, Lock, EyeOff, Eye } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Login: React.FC = () => {
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<LogInFormFields>({ resolver: zodResolver(loginSchema) });

	const [showPassword, setShowPassword] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const { user, setUser, isLoading } = useAuth();

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const error = params.get('error');
		if (error === 'user_already_exists') {
			setTimeout(() => {
				toast.error('User already has an account! Please login to continue');
			}, 300);
			navigate('/login', { replace: true });
		}
	}, [location.search, navigate]);

	const onSubmit = async (data: LogInFormFields) => {
		try {
			// RE-DERIVE MASTER KEY
			const masterKey = await deriveMasterKey(data.password, data.username);

			// RE-DERIVE AUTH HASH
			const authHash = await deriveAuthToken(masterKey);

			// SEND TO SERVER
			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/login`,
				{
					username: data.username,
					password: authHash,
				},
				{
					withCredentials: true,
				}
			);

			const result = response.data;
			if (!result.success) throw new Error(result.message);

			// DECRYPT THE VAULT
			if (result.data) {
				const privateKey = await unwrapPrivateKey(result.data.private_key, masterKey);
				const privateKeyVal = await exportKey(privateKey, 'jwk');
				// Store in session storage
				sessionStorage.setItem('file_access_key', JSON.stringify(privateKeyVal));
				sessionStorage.setItem('public_key', result.data.public_key);
			}

			toast.success('Login Successful');
			reset();
			setUser({
				id: result.data.id,
				username: result.data.username,
				email: result.data.email,
			});
			navigate('/dashboard', { replace: true });
		} catch (error: unknown) {
			console.error('Login Error:', error);
			toast.error(
				error instanceof AxiosError
					? (error?.response?.data?.message ?? error?.message)
					: error instanceof Error
						? error?.message
						: 'Failed to login'
			);
		}
	};

	if (isLoading) return <Loader />;
	if (user) return <Navigate to="/dashboard" replace />;

	return (
		<div className="min-h-screen grid lg:grid-cols-2 relative overflow-hidden">
			{/* Left Side - Branding/Hero Section */}
			<motion.div
				initial={{ opacity: 0, x: -50 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.8, ease: 'easeOut' }}
				className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 lg:flex flex-col justify-center items-center p-12 max-lg:hidden overflow-hidden"
			>
				{/* Animated background elements */}
				<div className="absolute inset-0">
					<motion.div
						animate={{
							scale: [1, 1.3, 1],
							opacity: [0.2, 0.4, 0.2],
						}}
						transition={{
							duration: 6,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-3xl"
					/>
					<motion.div
						animate={{
							scale: [1, 1.3, 1],
							opacity: [0.2, 0.4, 0.2],
						}}
						transition={{
							duration: 6,
							repeat: Infinity,
							ease: 'easeInOut',
							delay: 3,
						}}
						className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl"
					/>
				</div>

				{/* Content */}
				<div className="relative z-10 max-w-lg">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.3 }}
					>
						<h1 className="text-6xl font-bold text-p4 mb-6 max-xl:text-5xl">
							Welcome to <b className="text-p1">Obscyra</b>
						</h1>
						<p className="text-xl text-p4/70 mb-8 leading-relaxed max-xl:text-lg">
							Share files instantly, securely, and without leaving a trace. Your
							privacy meets simplicity — no installs, no local storage, no limits.
						</p>
						<div className="space-y-4">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl  flex items-center justify-center backdrop-blur-sm">
									<div className="w-12 h-12 rounded-xl   flex items-center justify-center backdrop-blur-sm">
										<img src="/images/detail-3.png" alt="" />
									</div>
								</div>
								<p className="text-p4/80">End-to-end encrypted transfers</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl  flex items-center justify-center backdrop-blur-sm">
									<div className="w-12 h-12 rounded-xl   flex items-center justify-center backdrop-blur-sm">
										<img src="/images/detail-2.png" alt="" />
									</div>
								</div>
								<p className="text-p4/80">No local storage required</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl   flex items-center justify-center backdrop-blur-sm">
									<img src="/images/detail-1.png" alt="" />
								</div>
								<p className="text-p4/80">Instant file sharing</p>
							</div>
						</div>
					</motion.div>
				</div>
			</motion.div>

			{/* Right Side - Login Form */}
			<div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-6 lg:p-12">
				{/* Mobile background elements */}
				<div className="absolute inset-0 lg:hidden opacity-20">
					<motion.div
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.3, 0.5, 0.3],
						}}
						transition={{
							duration: 4,
							repeat: Infinity,
							ease: 'easeInOut',
						}}
						className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl"
					/>
					<motion.div
						animate={{
							scale: [1, 1.2, 1],
							opacity: [0.3, 0.5, 0.3],
						}}
						transition={{
							duration: 4,
							repeat: Infinity,
							ease: 'easeInOut',
							delay: 2,
						}}
						className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/30 rounded-full blur-3xl"
					/>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, ease: 'easeOut' }}
					className="relative z-10 w-full max-w-md"
				>
					<Card className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
						{/* Gradient overlay at top */}
						<div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-transparent opacity-50 blur-xl" />

						<CardHeader className="relative z-10 text-center pt-10 pb-6 px-7 max-md:pt-8 max-md:pb-4">
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5, delay: 0.2 }}
							>
								<CardTitle className="text-4xl font-bold text-p4 mb-3 max-md:text-3xl max-sm:text-2xl">
									Welcome Back
								</CardTitle>
								<p className="text-sm text-p4/70 max-sm:text-xs">
									Log in to access your files and shared content.
								</p>
							</motion.div>
						</CardHeader>

						<CardContent className="relative z-10 px-7 max-md:px-5">
							<form
								onSubmit={handleSubmit(onSubmit)}
								className="space-y-5 max-md:space-y-4"
							>
								{/* Username Field */}
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.3 }}
								>
									<Label
										htmlFor="username"
										className="block text-sm font-medium text-p4 mb-2 max-sm:text-xs"
									>
										Username
									</Label>
									<div className="relative">
										<Input
											id="username"
											placeholder="Enter Your Username"
											{...register('username')}
											className="pl-11 pr-4 py-3 bg-s1/30 border-2 border-s4/25 rounded-xl text-p4 placeholder-p4/50 focus:border-p1/50 focus:bg-s1/40 transition-all duration-300 max-sm:text-sm max-sm:py-2.5"
										/>
										<User
											className="absolute left-3 top-1/2 -translate-y-1/2 text-p4/60 max-sm:w-4 max-sm:h-4"
											size={20}
											strokeWidth={2}
										/>
									</div>
									{errors.username && (
										<p className="text-red-400 text-xs mt-1.5">
											{errors.username.message}
										</p>
									)}
								</motion.div>

								{/* Password Field */}
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.4 }}
								>
									<Label
										htmlFor="password"
										className="block text-sm font-medium text-p4 mb-2 max-sm:text-xs"
									>
										Password
									</Label>
									<div className="relative">
										<Input
											id="password"
											type={showPassword ? 'text' : 'password'}
											placeholder="Enter Your Password"
											{...register('password')}
											className="pl-11 pr-12 py-3 bg-s1/30 border-2 border-s4/25 rounded-xl text-p4 placeholder-p4/50 focus:border-p1/50 focus:bg-s1/40 transition-all duration-300 max-sm:text-sm max-sm:py-2.5"
										/>
										<Lock
											className="absolute left-3 top-1/2 -translate-y-1/2 text-p4/60 max-sm:w-4 max-sm:h-4"
											size={20}
											strokeWidth={2}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-p4/60 hover:text-p4 hover:bg-transparent transition-colors duration-200"
										>
											{showPassword ? (
												<EyeOff size={18} />
											) : (
												<Eye size={18} />
											)}
										</Button>
									</div>
									{errors.password && (
										<p className="text-red-400 text-xs mt-1.5">
											{errors.password.message}
										</p>
									)}
								</motion.div>

								{/* Login Button */}
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.5 }}
								>
									<Button
										type="submit"
										className="w-full py-3.5 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer max-sm:py-3 max-sm:text-sm"
										style={{
											backgroundSize: '200% 100%',
											backgroundPosition: '0% 0%',
										}}
										onMouseEnter={(e) => {
											e.currentTarget.style.backgroundPosition = '100% 0%';
										}}
										onMouseLeave={(e) => {
											e.currentTarget.style.backgroundPosition = '0% 0%';
										}}
									>
										Login
									</Button>
								</motion.div>

								{/* Divider */}
								{/* <motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.5, delay: 0.6 }}
									className="flex items-center my-5 max-md:my-4"
								>
									<hr className="flex-grow border-s4/25" />
									<span className="px-3 text-p4/50 text-sm max-sm:text-xs">
										or
									</span>
									<hr className="flex-grow border-s4/25" />
								</motion.div> */}

								{/* Google Login Button */}
								{/* <motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.7 }}
								>
									<Button
										type="button"
										onClick={() => {
											toast.info('Redirecting to Google login...');
											window.location.href =
												'http://localhost:8080/api/v1/auth/google/login?redirect=login';
										}}
										variant="outline"
										className="w-full py-3.5 flex items-center justify-center gap-3 border-2 border-s4/25 bg-s1/20 text-p4 rounded-xl hover:bg-s1/40 hover:border-p1/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer max-sm:py-3 max-sm:text-sm max-sm:gap-2"
									>
										<img
											src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
											alt="Google logo"
											className="w-5 h-5 max-sm:w-4 max-sm:h-4"
										/>
										<span className="font-medium">Login with Google</span>
									</Button>
								</motion.div> */}
							</form>
						</CardContent>

						<CardFooter className="relative z-10 flex justify-center text-sm pb-8 px-7 max-md:pb-6 max-sm:pb-5">
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.5, delay: 0.8 }}
								className="text-p4/70 max-sm:text-xs"
							>
								Don&apos;t have an account?{' '}
								<Link
									to="/register"
									className="ml-1 text-p1 font-semibold hover:text-p3 transition-colors duration-200"
								>
									Register
								</Link>
							</motion.p>
						</CardFooter>
					</Card>
				</motion.div>
			</div>
		</div>
	);
};

export default Login;
