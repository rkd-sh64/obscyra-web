import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import {
	deriveMasterKey,
	exportKey,
	deriveAuthToken,
	generateUserKeyPair,
	wrapPrivateKey,
} from '@/crypto/keys';
import { registerSchema } from '@/schema/auth';
import type { RegisterFormFields } from '@/types/auth';
import { zodResolver } from '@hookform/resolvers/zod';
import axios, { AxiosError } from 'axios';
import { motion } from 'framer-motion';
import { User, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import React from 'react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
const Register: React.FC = () => {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const location = useLocation();
	const navigate = useNavigate();
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<RegisterFormFields>({
		resolver: zodResolver(registerSchema),
	});
	const { user, isLoading } = useAuth();

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		const error = params.get('error');

		if (error === 'user_not_found') {
			setTimeout(() => {
				toast.error('No account found! Please register to continue.');
			}, 300);
			navigate('/register', { replace: true });
		}
	}, [location.search, navigate]);

	const onSubmit = async (data: RegisterFormFields) => {
		try {
			// Generate Crypto Identity
			const userKeyPair = await generateUserKeyPair();

			// Derive Master Key from Password (Client-Side Only)
			// Note: using username as salt for now. Later, replace with random salt.
			const masterKey = await deriveMasterKey(data.password, data.username);

			// THE FORK: Create Auth Token
			// This is what we send to the server as the "password"
			const authHash = await deriveAuthToken(masterKey);

			// Encrypt the Private Key (The Vault)
			const wrappedPrivateKey = await wrapPrivateKey(userKeyPair.privateKey, masterKey);

			// Export Public Key
			const publicKeyString = await exportKey(userKeyPair.publicKey, 'spki');

			// Prepare Payload
			const payload = {
				username: data.username,
				email: data.email,
				password: authHash, // Server just sees a hash, not the real password
				publicKey: publicKeyString,
				encryptedPrivateKey: JSON.stringify(wrappedPrivateKey),
			};

			// console.log("Sending Secure Payload:", payload);

			const response = await axios.post(
				`${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/sign-up`,
				payload
			);
			const result = response.data;
			if (!result.success) {
				throw new Error(result.message);
			}
			toast.success(result.message ?? 'Registration Successful');
			reset();
		} catch (error: unknown) {
			console.error('Registration Error:', error);
			toast.error(
				error instanceof AxiosError
					? error.response?.data?.message
					: error instanceof Error
						? error.message
						: 'Failed to register user'
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
							Join <b className="text-p1">Obscyra</b>
						</h1>
						<p className="text-xl text-p4/70 mb-8 leading-relaxed max-xl:text-lg">
							Create your account to unlock secure, encrypted file sharing built for
							teams. Simple setup, zero tracking, and complete control - from the
							first upload.
						</p>
						<div className="space-y-4">
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl   flex items-center justify-center backdrop-blur-sm">
									<img src="/images/detail-3.png" alt="" />
								</div>
								<p className="text-p4/80">Private, encrypted cloud storage</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl   flex items-center justify-center backdrop-blur-sm">
									<img src="/images/detail-2.png" alt="" />
								</div>
								<p className="text-p4/80">No local storage or tracking</p>
							</div>
							<div className="flex items-center gap-4">
								<div className="w-12 h-12 rounded-xl   flex items-center justify-center backdrop-blur-sm">
									<img src="/images/detail-1.png" alt="" />
								</div>
								<p className="text-p4/80">Team-ready collaboration tools</p>
							</div>
						</div>
					</motion.div>
				</div>
			</motion.div>

			{/* Right Side - Register Form */}
			<div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center p-6 lg:p-8 overflow-y-auto">
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
					className="relative z-10 w-full max-w-md my-auto"
				>
					<Card className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
						{/* Gradient overlay at top */}
						<div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-transparent opacity-50 blur-xl" />

						<CardHeader className="relative z-10 text-center pt-8 pb-4 px-7 max-md:pt-6 max-md:pb-3">
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5, delay: 0.2 }}
							>
								<CardTitle className="text-3xl font-bold text-p4 mb-2 max-md:text-2xl max-sm:text-xl">
									Create An Account
								</CardTitle>
								<p className="text-xs text-p4/70 max-sm:text-[10px]">
									Join us to securely upload and receive files with ease.
								</p>
							</motion.div>
						</CardHeader>

						<CardContent className="relative z-10 px-7 max-md:px-5">
							<form
								onSubmit={handleSubmit(onSubmit)}
								noValidate
								className="space-y-4 max-md:space-y-3"
							>
								{/* Username Field */}
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.3 }}
								>
									<Label
										htmlFor="username"
										className="block text-xs font-medium text-p4 mb-1.5 max-sm:text-[10px]"
									>
										Username
									</Label>
									<div className="relative">
										<Input
											id="username"
											placeholder="Enter Your Username"
											{...register('username')}
											className="pl-10 pr-4 py-2.5 bg-s1/30 border-2 border-s4/25 rounded-xl text-p4 placeholder-p4/50 focus:border-p1/50 focus:bg-s1/40 transition-all duration-300 max-sm:text-xs max-sm:py-2"
										/>
										<User
											className="absolute left-3 top-1/2 -translate-y-1/2 text-p4/60 max-sm:w-3.5 max-sm:h-3.5"
											size={18}
											strokeWidth={2}
										/>
									</div>
									{errors.username && (
										<p className="text-red-400 text-[10px] mt-1">
											{errors.username.message}
										</p>
									)}
								</motion.div>

								{/* Email Field */}
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.4 }}
								>
									<Label
										htmlFor="email"
										className="block text-xs font-medium text-p4 mb-1.5 max-sm:text-[10px]"
									>
										Email
									</Label>
									<div className="relative">
										<Input
											id="email"
											type="email"
											placeholder="Enter Your Email"
											{...register('email')}
											className="pl-10 pr-4 py-2.5 bg-s1/30 border-2 border-s4/25 rounded-xl text-p4 placeholder-p4/50 focus:border-p1/50 focus:bg-s1/40 transition-all duration-300 max-sm:text-xs max-sm:py-2"
										/>
										<Mail
											className="absolute left-3 top-1/2 -translate-y-1/2 text-p4/60 max-sm:w-3.5 max-sm:h-3.5"
											size={18}
											strokeWidth={2}
										/>
									</div>
									{errors.email && (
										<p className="text-red-400 text-[10px] mt-1">
											{errors.email.message}
										</p>
									)}
								</motion.div>

								{/* Password Field */}
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.5 }}
								>
									<Label
										htmlFor="password"
										className="block text-xs font-medium text-p4 mb-1.5 max-sm:text-[10px]"
									>
										Password
									</Label>
									<div className="relative">
										<Input
											id="password"
											type={showPassword ? 'text' : 'password'}
											placeholder="Enter Your Password"
											{...register('password')}
											className="pl-10 pr-11 py-2.5 bg-s1/30 border-2 border-s4/25 rounded-xl text-p4 placeholder-p4/50 focus:border-p1/50 focus:bg-s1/40 transition-all duration-300 max-sm:text-xs max-sm:py-2"
										/>
										<Lock
											className="absolute left-3 top-1/2 -translate-y-1/2 text-p4/60 max-sm:w-3.5 max-sm:h-3.5"
											size={18}
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
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
										</Button>
									</div>
									{errors.password && (
										<p className="text-red-400 text-[10px] mt-1">
											{errors.password.message}
										</p>
									)}
								</motion.div>

								{/* Confirm Password Field */}
								<motion.div
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ duration: 0.5, delay: 0.6 }}
								>
									<Label
										htmlFor="confirmPassword"
										className="block text-xs font-medium text-p4 mb-1.5 max-sm:text-[10px]"
									>
										Confirm Password
									</Label>
									<div className="relative">
										<Input
											id="confirmPassword"
											type={showConfirmPassword ? 'text' : 'password'}
											placeholder="Confirm Password"
											{...register('confirmPassword')}
											className="pl-10 pr-11 py-2.5 bg-s1/30 border-2 border-s4/25 rounded-xl text-p4 placeholder-p4/50 focus:border-p1/50 focus:bg-s1/40 transition-all duration-300 max-sm:text-xs max-sm:py-2"
										/>
										<Lock
											className="absolute left-3 top-1/2 -translate-y-1/2 text-p4/60 max-sm:w-3.5 max-sm:h-3.5"
											size={18}
											strokeWidth={2}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											onClick={() =>
												setShowConfirmPassword(!showConfirmPassword)
											}
											className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-p4/60 hover:text-p4 hover:bg-transparent transition-colors duration-200"
										>
											{showConfirmPassword ? (
												<EyeOff size={16} />
											) : (
												<Eye size={16} />
											)}
										</Button>
									</div>
									{errors.confirmPassword && (
										<p className="text-red-400 text-[10px] mt-1">
											{errors.confirmPassword.message}
										</p>
									)}
								</motion.div>

								{/* Register Button */}
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.7 }}
								>
									<Button
										type="submit"
										disabled={isSubmitting}
										className="w-full py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer max-sm:py-2.5 max-sm:text-sm disabled:opacity-70 flex items-center justify-center gap-2"
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
										{isSubmitting ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin" />
												Registering...
											</>
										) : (
											'Register'
										)}
									</Button>
								</motion.div>

								{/* Divider */}
								{/* <motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.5, delay: 0.8 }}
									className="flex items-center my-4 max-md:my-3"
								>
									<hr className="flex-grow border-s4/25" />
									<span className="px-3 text-p4/50 text-xs max-sm:text-[10px]">
										or
									</span>
									<hr className="flex-grow border-s4/25" />
								</motion.div> */}

								{/* Google Signup Button */}
								{/* <motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.9 }}
								>
									<Button
										type="button"
										onClick={() => {
											toast.info('Redirecting to Google signup...');
											window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/v1/auth/google/login?redirect=register`;
										}}
										variant="outline"
										className="w-full py-3 flex items-center justify-center gap-2.5 border-2 border-s4/25 bg-s1/20 text-p4 rounded-xl hover:bg-s1/40 hover:border-p1/30 transition-all duration-300 hover:scale-[1.02] cursor-pointer max-sm:py-2.5 max-sm:text-sm max-sm:gap-2"
									>
										<img
											src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
											alt="Google logo"
											className="w-4 h-4 max-sm:w-3.5 max-sm:h-3.5"
										/>
										<span className="font-medium">Sign Up with Google</span>
									</Button>
								</motion.div> */}
							</form>
						</CardContent>

						<CardFooter className="relative z-10 flex justify-center text-xs pb-6 px-7 max-md:pb-5 max-sm:pb-4">
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.5, delay: 1 }}
								className="text-p4/70 max-sm:text-[10px]"
							>
								Already have an account?{' '}
								<Link
									to="/login"
									className="ml-1 text-p1 font-semibold hover:text-p3 transition-colors duration-200"
								>
									Login
								</Link>
							</motion.p>
						</CardFooter>
					</Card>
				</motion.div>
			</div>
		</div>
	);
};

export default Register;
