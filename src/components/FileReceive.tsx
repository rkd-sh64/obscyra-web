import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import {
	base64ToArrayBuffer,
	decryptFileWithSessionKey,
	importKey,
	RSA_ALGORITHM,
	unwrapSessionKey,
} from '@/crypto';
import { formatFileSize, fromUrlSafeBase64 } from '@/lib/utils';
import { receiveSchema } from '@/schema/file';
import { type File, type ReceiveInput } from '@/types/file';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Download,
	File as FileIcon,
	Loader2,
	Inbox,
	CheckCircle2,
	Package,
	ChevronLeft,
} from 'lucide-react';
import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import LayoutHeader from './LayoutHeader';

const FileReceive: React.FC = () => {
	const [receivedFiles, setreceivedFiles] = useState<File[]>([]);
	const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
	const [decryptionKey, setDecryptionKey] = useState<CryptoKey | null>(null);
	const shareCode = useRef<string>('');
	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<ReceiveInput>({
		resolver: zodResolver(receiveSchema),
		defaultValues: { sharingCode: '' },
	});
	const { user } = useAuth();
	const location = useLocation();
	const isAnonymousShare = useRef(false);

	// Extract sharing code from URL and auto-fill input (without auto-submitting)
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const scodeFromUrl = urlParams.get('scode');

		if (scodeFromUrl) {
			setValue('sharingCode', scodeFromUrl);
			// Removed the auto-fetchFiles call here
		}
	}, [setValue]);

	useEffect(() => {
		console.log('Location Hash:', location.hash);
		isAnonymousShare.current = location.hash.slice(1).length > 0;
	}, [location.hash]);

	const fetchFiles = async (sharingCode: string, sharingMode: string) => {
		try {
			shareCode.current = sharingCode;
			if (sharingMode === 'verified') {
				const response = await axios.get(
					`${import.meta.env.VITE_API_BASE_URL}/api/v1/share/${sharingCode}`,
					{ withCredentials: true }
				);
				const { files, encrypted_key } = response?.data?.data || {};

				if (!encrypted_key) {
					// If no key, either it's an old unencrypted transfer or error
					console.log(
						'Missing encryption key for transfer. Possibly old unencrypted transfer or incorrect client.'
					);
					throw new Error(
						'Unable to decrypt this file. Please check your access link or try again.'
					);
				}

				// Load User's Private Key from Storage
				const storedJWK = sessionStorage.getItem('file_access_key');
				if (!storedJWK) {
					throw new Error('Decryption key not found. Please Login again.');
				}

				// Rehydrate Private Key
				const privateKey = await importKey(
					JSON.parse(storedJWK),
					'jwk',
					RSA_ALGORITHM,
					true,
					['decrypt', 'unwrapKey']
				);

				// Unwrap the Session Key (Digital Envelope)
				const sessionKey = await unwrapSessionKey(encrypted_key, privateKey);

				// Store in State for downloads
				setDecryptionKey(sessionKey);
				setreceivedFiles(files);
			} else {
				// Anonymous sharing - no decryption, just fetch file metadata
				const hash = location.hash.slice(1); // Remove the '#' character
				if (!hash) {
					throw new Error('Invalid Link');
				}

				const response = await axios.get(
					`${import.meta.env.VITE_API_BASE_URL}/api/v1/public/share/${sharingCode}`,
					{ withCredentials: true }
				);

				const { files } = response?.data?.data || {};
				if (!files || !Array.isArray(files) || files.length === 0) {
					throw new Error('No files found for this sharing code');
				}
				setreceivedFiles(files || []);
				const sessionKey = await importKey(
					base64ToArrayBuffer(fromUrlSafeBase64(hash)),
					'raw',
					'AES-GCM',
					false,
					['decrypt']
				);
				setDecryptionKey(sessionKey);
			}

			toast.success('Files received successfully');
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(error.response?.data?.message);
				toast.error(error.response?.data?.message || 'Failed to fetch files');
			} else {
				const errorMessage =
					error instanceof Error ? error.message : 'An unexpected error occurred';
				console.error(errorMessage);
				toast.error(errorMessage);
			}
		}
	};

	const onSubmit = async ({ sharingCode }: ReceiveInput) => {
		await fetchFiles(sharingCode, user ? 'verified' : 'anonymous');
		// reset();
		// navigate('/share/receive'); // Can't reset or navigate away as hash will be lost
	};

	const handleDownload = async (index: number) => {
		try {
			if (!decryptionKey) {
				toast.error('Decryption key missing. Refresh or Login.');
				return;
			}

			setDownloadingIndex(index);
			console.log('IsAnonymousShare:', isAnonymousShare.current);
			const presignUrl = isAnonymousShare.current
				? `/api/v1/public/share/${shareCode.current}/presign-download/${index}`
				: `/api/v1/share/${shareCode.current}/presign-download/${index}`;

			// Request presigned download URL
			const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}${presignUrl}`, {
				withCredentials: true,
			});

			const { url, content_type, filename } = response.data?.data || {};
			if (!url) throw new Error('Download URL not received');
			// Fetch the file directly from R2 using the presigned URL
			const fileResponse = await fetch(url);

			if (!fileResponse.ok) {
				throw new Error(
					`${fileResponse.status} : R2 Download failed: ${fileResponse.statusText}`
				);
			}

			// Extract the blob from the fetch response
			const encryptedBlob = await fileResponse.blob();

			// DECRYPT FILE LOCALLY
			const decryptedBuffer = await decryptFileWithSessionKey(encryptedBlob, decryptionKey);

			// Create object URL and trigger download
			const blob = new Blob([decryptedBuffer], {
				type: content_type || 'application/octet-stream',
			});
			const objectUrl = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = objectUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(objectUrl);

			toast.success('File downloaded successfully');
		} catch (error: unknown) {
			if (axios.isAxiosError(error)) {
				console.error(error.response?.data?.message || error.message);
				toast.error(error.response?.data?.message || 'Failed to download file');
			} else {
				console.error(error);
				toast.error('An unexpected error occurred');
			}
		} finally {
			setDownloadingIndex(null);
		}
	};

	const totalSize = receivedFiles.reduce((acc, file) => acc + Number(file.size), 0);

	return (

		<>
			<LayoutHeader />

			<div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden pt-20">
				{/* Animated background elements */}
				<div className="absolute inset-0 opacity-20">
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
						className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-3xl max-md:w-[300px] max-md:h-[300px]"
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
						className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-3xl max-md:w-[300px] max-md:h-[300px]"
					/>
				</div>

				<div className="relative z-10 min-h-screen">
					{/* Breadcrumb */}
					{user && (
						<div className="mb-4 mt-8 mx-4 px-2 max-sm:px-0 lg:pl-28">
							<Link
								to="/dashboard"
								className="inline-flex items-center gap-2 text-p4/70 hover:text-p4 transition-colors text-sm rounded-md px-2 py-1"
								aria-label="Back to dashboard"
							>
								<ChevronLeft size={16} className="text-p1" />
								<span>Back to dashboard</span>
							</Link>
						</div>
					)}
					{/* Header */}
					<motion.header
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						className="pt-8 pb-6 px-6 text-center max-w-4xl mx-auto"
					>
						<h1 className="text-5xl font-bold mb-3 text-p4 max-md:text-4xl max-sm:text-3xl">
							Receive Files
						</h1>
						<p className="text-p4/70 text-base max-md:text-sm max-sm:text-xs">
							Enter the sharing code to access and download files shared with you
							securely.
						</p>
					</motion.header>

					{/* Main Content - Two Column Layout */}
					<div className="grid lg:grid-cols-2 gap-6 px-6 pb-8 max-w-7xl mx-auto max-lg:grid-cols-1">
						{/* Left Column - Input Section */}
						<motion.div
							initial={{ opacity: 0, x: -50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							className="space-y-6"
						>
							{/* Input Card */}
							<div className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-6 max-md:p-5">
								{/* Gradient overlay */}
								<div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-transparent opacity-50 blur-xl" />

								<div className="relative z-10">
									<div className="flex items-center gap-3 mb-6">
										<div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-3 rounded-xl">
											<Package className="text-p1" size={24} />
										</div>
										<h2 className="text-xl font-bold text-p4">
											Enter Sharing Code
										</h2>
									</div>

									<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
										<div>
											<Input
												type="text"
												placeholder="Enter code (e.g., ABC123XYZ)"
												{...register('sharingCode')}
												className="bg-s1/30 border-2 border-s4/25 text-p4 placeholder-p4/40 rounded-xl px-5 py-6 text-base focus:border-p1/50 focus:ring-2 focus:ring-p1/20 transition-all w-full"
											/>
											<AnimatePresence>
												{errors.sharingCode && (
													<motion.p
														initial={{ opacity: 0, y: -10 }}
														animate={{ opacity: 1, y: 0 }}
														exit={{ opacity: 0, y: -10 }}
														className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 mt-3"
													>
														{errors.sharingCode.message}
													</motion.p>
												)}
											</AnimatePresence>
										</div>

										<Button
											className="w-full py-4 text-base bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer"
											type="submit"
											disabled={isSubmitting}
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
													<Loader2 className="mr-2 h-5 w-5 animate-spin" />
													Receiving...
												</>
											) : (
												<>
													<Inbox className="mr-2 h-5 w-5" />
													Receive Files
												</>
											)}
										</Button>
									</form>
								</div>
							</div>
						</motion.div>

						{/* Right Column - Files List */}
						<motion.div
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.6, delay: 0.3 }}
							className="lg:h-[calc(100vh-12rem)] max-lg:h-[500px]"
						>
							<div className="relative border-2 border-s4/25 bg-s1/50 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden p-6 max-md:p-5 h-full flex flex-col">
								{/* Gradient overlay */}
								<div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-transparent opacity-50 blur-xl" />

								<div className="relative z-10 h-full flex flex-col">
									<h2 className="text-xl font-bold text-p4 mb-4 flex items-center gap-2 flex-shrink-0">
										<FileIcon className="text-p1" size={24} />
										Received Files
									</h2>

									<AnimatePresence mode="wait">
										{Array.isArray(receivedFiles) && receivedFiles.length === 0 ? (
											<motion.div
												key="empty"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												className="flex-1 flex flex-col items-center justify-center text-center py-12"
											>
												<motion.div
													animate={{
														y: [0, -10, 0],
													}}
													transition={{
														duration: 2,
														repeat: Infinity,
														ease: 'easeInOut',
													}}
												>
													<Inbox className="text-p4/30 mb-4" size={80} />
												</motion.div>
												<p className="text-p4/60 text-base font-medium mb-2">
													No Files Yet
												</p>
												<p className="text-p4/40 text-sm">
													Enter a sharing code to access files
												</p>
											</motion.div>
										) : (
											<motion.div
												key="files"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												className="flex-1 flex flex-col min-h-0"
											>
												{/* Files Stats */}
												<div className="flex items-center justify-between mb-4 bg-s1/30 border border-s4/25 rounded-xl px-4 py-3 flex-shrink-0">
													<div className="flex items-center gap-3">
														<CheckCircle2
															className="text-green-400"
															size={20}
														/>
														<span className="text-p4 font-semibold text-sm">
															{receivedFiles.length}{' '}
															{receivedFiles.length === 1
																? 'file'
																: 'files'}
														</span>
													</div>
													<span className="text-p4/70 font-medium text-sm">
														{formatFileSize(totalSize)}
													</span>
												</div>

												{/* Files List */}
												<div className="flex-1 overflow-y-auto space-y-2.5 pr-2 custom-scrollbar min-h-0 mb-4">
													{receivedFiles.map((file, index) => (
														<motion.div
															key={`${file.name}-${index}`}
															initial={{ opacity: 0, x: 20 }}
															animate={{ opacity: 1, x: 0 }}
															transition={{ duration: 0.2 }}
															className="flex items-center justify-between bg-s1/30 border border-s4/25 rounded-xl px-4 py-3 hover:bg-s1/40 hover:border-p1/30 transition-all duration-200 group flex-shrink-0"
														>
															<div className="flex items-center gap-3 flex-1 min-w-0">
																<div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-2.5 rounded-lg flex-shrink-0">
																	<FileIcon
																		className="text-p1"
																		size={20}
																	/>
																</div>
																<div className="flex-1 min-w-0">
																	<p
																		title={file.name}
																		className="text-p4 truncate font-medium text-sm mb-0.5"
																	>
																		{file.name}
																	</p>
																	<p className="text-p4/60 text-xs">
																		{formatFileSize(
																			Number(file.size)
																		)}
																	</p>
																</div>
															</div>
															<Button
																variant="ghost"
																size="icon"
																className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg flex-shrink-0 ml-3 h-9 w-9 cursor-pointer transition-all"
																onClick={() => handleDownload(index)}
																disabled={downloadingIndex === index}
																title="Download file"
															>
																{downloadingIndex === index ? (
																	<Loader2
																		className="text-green-400 animate-spin"
																		size={16}
																	/>
																) : (
																	<Download
																		className="text-green-400"
																		size={16}
																	/>
																)}
															</Button>
														</motion.div>
													))}
												</div>
											</motion.div>
										)}
									</AnimatePresence>
								</div>
							</div>
						</motion.div>
					</div>
				</div>

				<style>{`
				.custom-scrollbar {
					scrollbar-width: thin;
					scrollbar-color: rgba(139, 92, 246, 0.3) rgba(255, 255, 255, 0.05);
					scroll-behavior: smooth;
					-webkit-overflow-scrolling: touch;
				}
				.custom-scrollbar::-webkit-scrollbar {
					width: 8px;
				}
				.custom-scrollbar::-webkit-scrollbar-track {
					background: rgba(255, 255, 255, 0.05);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb {
					background: rgba(139, 92, 246, 0.3);
					border-radius: 10px;
				}
				.custom-scrollbar::-webkit-scrollbar-thumb:hover {
					background: rgba(139, 92, 246, 0.5);
				}
			`}</style>
			</div>
		</>
	);
};

export default FileReceive;
